using KitveiHakodeshLib.Dictionary;
using KleiKodesh.Ribbon;
using KitveiHakodeshLib.Pdf;
using UpdateCheckerLib;
using Office = Microsoft.Office.Core;
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace KleiKodesh
{
    public partial class ThisAddIn
    {
        private const int HotKeyId = 0x4B4B;
        private const uint MOD_ALT = 0x0001;
        private const uint MOD_CONTROL = 0x0002;
        private const uint VK_K = 0x4B;

        private NativeHotKeyWindow _hotKeyWindow;
        private bool _hotKeyRegistered;
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
            InitializeHotKey();
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
            ShutdownHotKey();
            WordToPdfConverter.CancelHostConversions();
            // Run any pending installer that was deferred during update process
            UpdateChecker.RunPendingInstaller();
        }

        private void InitializeHotKey()
        {
            if (_hotKeyWindow != null || _hotKeyRegistered)
                return;

            try
            {
                _hotKeyWindow = new NativeHotKeyWindow();
                _hotKeyWindow.HotKeyPressed += HotKeyWindow_HotKeyPressed;

                _hotKeyRegistered = RegisterHotKey(
                    _hotKeyWindow.Handle,
                    HotKeyId,
                    MOD_CONTROL | MOD_ALT,
                    VK_K);

                if (!_hotKeyRegistered)
                {
                    int errorCode = Marshal.GetLastWin32Error();
                    _hotKeyWindow.HotKeyPressed -= HotKeyWindow_HotKeyPressed;
                    _hotKeyWindow.Dispose();
                    _hotKeyWindow = null;
                    MessageBox.Show(
                        "לא ניתן לרשום את קיצור המקשים Ctrl+Alt+K. " +
                        "ייתכן שהוא כבר נמצא בשימוש על ידי תוכנה אחרת. " +
                        "קוד שגיאה: " + errorCode,
                        "קיצור מקשים",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                _hotKeyRegistered = false;
                if (_hotKeyWindow != null)
                {
                    _hotKeyWindow.HotKeyPressed -= HotKeyWindow_HotKeyPressed;
                    _hotKeyWindow.Dispose();
                    _hotKeyWindow = null;
                }

                MessageBox.Show(
                    "אירעה שגיאה באתחול קיצור המקשים: " + ex.Message,
                    "קיצור מקשים",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
            }
        }

        private void ShutdownHotKey()
        {
            try
            {
                if (_hotKeyRegistered && _hotKeyWindow != null && _hotKeyWindow.Handle != IntPtr.Zero)
                    UnregisterHotKey(_hotKeyWindow.Handle, HotKeyId);
            }
            catch
            {
            }
            finally
            {
                _hotKeyRegistered = false;
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
                    _ribbon.ExecuteFromHotKey();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "שגיאה בהפעלת קיצור המקשים");
            }
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
