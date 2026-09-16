using KitveiHakodeshLib.Dictionary;
using KleiKodesh.Ribbon;
using KitveiHakodeshLib.Pdf;
using UpdateCheckerLib;
using KleiKodesh.Helpers;
using Office = Microsoft.Office.Core;
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Linq;

namespace KleiKodesh
{
    public partial class ThisAddIn
    {
        private const int CopySearchHotKeyId = 0x4B4B;
        private const int CatalogSearchHotKeyId = 0x4B4C;
        private const string HotKeySection = "HotKeys";
        private const string CopySearchHotKeySetting = "CopySearch";
        private const string CatalogSearchHotKeySetting = "CatalogSearch";
        private const string DefaultCopySearchHotKey = "Ctrl+Alt+K";
        private const string DefaultCatalogSearchHotKey = "Ctrl+Alt+B";
        private const uint MOD_SHIFT = 0x0004;
        private const uint MOD_NOREPEAT = 0x4000;
        private const uint MOD_ALT = 0x0001;
        private const uint MOD_CONTROL = 0x0002;

        private NativeHotKeyWindow _hotKeyWindow;
        private bool _copySearchHotKeyRegistered;
        private bool _catalogSearchHotKeyRegistered;
        private string _activeCopySearchHotKey;
        private string _activeCatalogSearchHotKey;
        private KeliKodeshRibbon _ribbon;

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(
            IntPtr hWnd,
            int id,
            uint fsModifiers,
            uint vk);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(
            IntPtr hWnd,
            out uint processId);

        protected override Office.IRibbonExtensibility CreateRibbonExtensibilityObject()
        {
            if (_ribbon == null)
                _ribbon = new KeliKodeshRibbon();
            return _ribbon;
        }

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            // Set the SQLite native library search directory BEFORE any type that
            // references System.Data.SQLite is first accessed — specifically before
            // KitveiHakodeshLib's static initializers trigger SQLite's own
            // UnsafeNativeMethods static constructor, which calls PreLoadSQLiteDll.
            //
            // System.Data.SQLite checks this env var first (before AppDomain.BaseDirectory),
            // so setting it here guarantees SQLite finds x86\SQLite.Interop.dll or
            // x64\SQLite.Interop.dll in the correct install folder even when running
            // inside a 32-bit Word process where AppDomain.BaseDirectory might differ.
            //
            // See: UnsafeNativeMethods.GetBaseDirectory() in System.Data.SQLite source.
            try
            {
                string installDir = AppDomain.CurrentDomain.BaseDirectory;
                if (!string.IsNullOrEmpty(installDir))
                    System.Environment.SetEnvironmentVariable(
                        "PreLoadSQLite_BaseDirectory", installDir);
            }
            catch { /* non-fatal — SQLite will fall back to AppDomain.BaseDirectory */ }

            WordToPdfConverter.HostApplication = this.Application;
            WordThesaurusProvider.HostApplication = this.Application;
            InitializeHotKeys();
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
            ShutdownHotKey();
            WordToPdfConverter.CancelHostConversions();
            // Run any pending installer that was deferred during update process
            UpdateChecker.RunPendingInstaller();
        }

        public bool ReconfigureHotKeys()
        {
            string previousCopy = _activeCopySearchHotKey;
            string previousCatalog = _activeCatalogSearchHotKey;
            ShutdownHotKey();
            if (InitializeHotKeys())
                return true;

            if (!string.IsNullOrEmpty(previousCopy) && !string.IsNullOrEmpty(previousCatalog))
            {
                SettingsManager.Save(HotKeySection, CopySearchHotKeySetting, previousCopy);
                SettingsManager.Save(HotKeySection, CatalogSearchHotKeySetting, previousCatalog);
                InitializeHotKeys();
            }
            return false;
        }

        private bool InitializeHotKeys()
        {
            if (_hotKeyWindow != null)
                return true;

            try
            {
                _hotKeyWindow = new NativeHotKeyWindow();
                _hotKeyWindow.HotKeyPressed += HotKeyWindow_HotKeyPressed;

                var copySearchHotKey = ParseHotKey(SettingsManager.Get(
                    HotKeySection, CopySearchHotKeySetting, DefaultCopySearchHotKey));
                var catalogSearchHotKey = ParseHotKey(SettingsManager.Get(
                    HotKeySection, CatalogSearchHotKeySetting, DefaultCatalogSearchHotKey));
                if (copySearchHotKey == null || catalogSearchHotKey == null)
                    throw new InvalidOperationException("פורמט קיצור מקשים לא תקין");

                _copySearchHotKeyRegistered = RegisterHotKey(
                    _hotKeyWindow.Handle, CopySearchHotKeyId,
                    copySearchHotKey.Modifiers | MOD_NOREPEAT, copySearchHotKey.VirtualKey);
                _catalogSearchHotKeyRegistered = _copySearchHotKeyRegistered && RegisterHotKey(
                    _hotKeyWindow.Handle, CatalogSearchHotKeyId,
                    catalogSearchHotKey.Modifiers | MOD_NOREPEAT, catalogSearchHotKey.VirtualKey);

                if (!_copySearchHotKeyRegistered || !_catalogSearchHotKeyRegistered)
                {
                    int errorCode = Marshal.GetLastWin32Error();
                    ShutdownHotKey();
                    MessageBox.Show(
                        "לא ניתן לרשום אחד מקיצורי המקשים של החיפוש. " +
                        "ייתכן שאחד מהם כבר נמצא בשימוש על ידי תוכנה אחרת. " +
                        "קוד שגיאה: " + errorCode,
                        "קיצור מקשים",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                    return false;
                }
                _activeCopySearchHotKey = SettingsManager.Get(
                    HotKeySection, CopySearchHotKeySetting, DefaultCopySearchHotKey);
                _activeCatalogSearchHotKey = SettingsManager.Get(
                    HotKeySection, CatalogSearchHotKeySetting, DefaultCatalogSearchHotKey);
                return true;
            }
            catch (Exception ex)
            {
                ShutdownHotKey();

                MessageBox.Show(
                    "אירעה שגיאה באתחול קיצור המקשים: " + ex.Message,
                    "קיצור מקשים",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
                return false;
            }
        }

        private void ShutdownHotKey()
        {
            try
            {
                if (_hotKeyWindow != null && _hotKeyWindow.Handle != IntPtr.Zero)
                {
                    if (_copySearchHotKeyRegistered)
                        UnregisterHotKey(_hotKeyWindow.Handle, CopySearchHotKeyId);
                    if (_catalogSearchHotKeyRegistered)
                        UnregisterHotKey(_hotKeyWindow.Handle, CatalogSearchHotKeyId);
                }
            }
            catch
            {
            }
            finally
            {
                _copySearchHotKeyRegistered = false;
                _catalogSearchHotKeyRegistered = false;
                if (_hotKeyWindow != null)
                {
                    _hotKeyWindow.HotKeyPressed -= HotKeyWindow_HotKeyPressed;
                    _hotKeyWindow.Dispose();
                    _hotKeyWindow = null;
                }
            }
        }

        private bool IsWordActive()
        {
            IntPtr foregroundWindow = GetForegroundWindow();
            if (foregroundWindow == IntPtr.Zero)
                return false;

            GetWindowThreadProcessId(foregroundWindow, out uint processId);
            return processId == (uint)Process.GetCurrentProcess().Id;
        }

        private void HotKeyWindow_HotKeyPressed(object sender, EventArgs e)
        {
            try
            {
                if (IsWordActive())
                {
                    if (_ribbon == null)
                        _ribbon = new KeliKodeshRibbon();
                    var hotKeyId = (int)((NativeHotKeyWindow)sender).LastHotKeyId;
                    _ribbon.ExecuteFromHotKey(hotKeyId == CatalogSearchHotKeyId ? "catalog" : "fts");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "שגיאה בהפעלת קיצור המקשים");
            }
        }

        private sealed class ParsedHotKey
        {
            public uint Modifiers { get; set; }
            public uint VirtualKey { get; set; }
            public int WordKeyCode { get; set; }
        }

        internal static int? ParseHotKeyForWord(string value)
        {
            var parsed = ParseHotKey(value);
            return parsed == null ? (int?)null : parsed.WordKeyCode;
        }

        private static ParsedHotKey ParseHotKey(string value)
        {
            var parts = (value ?? string.Empty).Split('+');
            uint modifiers = 0;
            string key = parts[parts.Length - 1];
            foreach (var part in parts)
            {
                if (part == "Ctrl") modifiers |= MOD_CONTROL;
                else if (part == "Alt") modifiers |= MOD_ALT;
                else if (part == "Shift") modifiers |= MOD_SHIFT;
            }

            uint virtualKey;
            if (key.Length == 1 && char.IsLetterOrDigit(key[0]))
                virtualKey = char.ToUpperInvariant(key[0]);
            else if (key.StartsWith("F", StringComparison.OrdinalIgnoreCase) &&
                     int.TryParse(key.Substring(1), out int functionNumber) &&
                     functionNumber >= 1 && functionNumber <= 24)
                virtualKey = (uint)(0x70 + functionNumber - 1);
            else
                return null;

            return new ParsedHotKey
            {
                Modifiers = modifiers,
                VirtualKey = virtualKey,
                WordKeyCode = (int)virtualKey +
                    ((modifiers & MOD_SHIFT) != 0 ? 256 : 0) +
                    ((modifiers & MOD_CONTROL) != 0 ? 512 : 0) +
                    ((modifiers & MOD_ALT) != 0 ? 1024 : 0)
            };
        }

        #region VSTO generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }

        #endregion
    }
}
