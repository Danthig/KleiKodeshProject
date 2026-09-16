using KleiKodesh.Helpers;
using System.Linq;
using System;
using System.Collections.Generic;
using System.Windows.Input;
using System.Windows;
using System.Windows.Controls;

namespace KleiKodesh.Ribbon
{
    public partial class RibbonSettingsView : UserControl
    {
        private readonly Microsoft.Office.Core.IRibbonUI _ribbon;
        private readonly Func<bool> _hotKeysChanged;

        public RibbonSettingsView(Microsoft.Office.Core.IRibbonUI ribbon, Func<bool> hotKeysChanged)
        {
            InitializeComponent();
            _ribbon = ribbon;
            _hotKeysChanged = hotKeysChanged;
            InitializeControls();
        }

        private void InitializeControls()
        {
            // cb.Name IS the registry key (e.g. "KitveiHakodesh_Visible") — do not rename the controls.
            foreach (CheckBox cb in VisibleSettingsPanel.Children.OfType<CheckBox>())
            {
                cb.IsChecked = SettingsManager.GetBool("Ribbon", cb.Name, true);
                cb.Checked   += (_, __) =>
                {
                    SettingsManager.Save("Ribbon", cb.Name, true);
                    _ribbon.InvalidateControl(cb.Name.Replace("_Visible", ""));
                };
                cb.Unchecked += (_, __) =>
                {
                    SettingsManager.Save("Ribbon", cb.Name, false);
                    string componentId = cb.Name.Replace("_Visible", "");
                    _ribbon.InvalidateControl(componentId);
                    // If the corresponding option radio was selected, fall back to Settings
                    var rb = (RadioButton)FindName($"{componentId}_Option");
                    if (rb?.IsChecked == true)
                    {
                        rb.IsChecked = false;
                        Settings_Option.IsChecked = true;
                        SettingsManager.Save("Ribbon", "DefaultButton", "Settings");
                    }
                };
            }

            // rb.Name stripped of "_Option" IS the saved DefaultButton value — do not rename the controls.
            string defaultButtonId = SettingsManager.Get("Ribbon", "DefaultButton", "Settings");
            foreach (RadioButton rb in OptionsSettingsPanel.Children.OfType<RadioButton>())
            {
                rb.IsChecked = rb.Name.Replace("_Option", "") == defaultButtonId;
                rb.Checked += (_, __) =>
                    SettingsManager.Save("Ribbon", "DefaultButton", rb.Name.Replace("_Option", ""));
            }

            ChkTurnOffUpdates.IsChecked = SettingsManager.GetBool("UpdateChecker", "TurnOffUpdates", false);
            ChkTurnOffUpdates.Checked   += (_, __) => SettingsManager.Save("UpdateChecker", "TurnOffUpdates", true);
            ChkTurnOffUpdates.Unchecked += (_, __) => SettingsManager.Save("UpdateChecker", "TurnOffUpdates", false);

            CopySearchHotKey.Text = SettingsManager.Get("HotKeys", "CopySearch", "Ctrl+Alt+K");
            CatalogSearchHotKey.Text = SettingsManager.Get("HotKeys", "CatalogSearch", "Ctrl+Alt+B");

            BtnReset.Click += (_, __) =>
            {
                foreach (CheckBox cb in VisibleSettingsPanel.Children.OfType<CheckBox>())
                    if (cb is CheckBox) cb.IsChecked = true;
                foreach (RadioButton rb in OptionsSettingsPanel.Children.OfType<RadioButton>())
                    if (rb is RadioButton) rb.IsChecked = false;
                Settings_Option.IsChecked = true;
                ChkTurnOffUpdates.IsChecked = false;
                CopySearchHotKey.Text = "Ctrl+Alt+K";
                CatalogSearchHotKey.Text = "Ctrl+Alt+B";
                SettingsManager.ClearAll();
                MessageBox.Show("התוכנה אופסה בהצלחה - אנא התחל את וורד מחדש");
            };
        }

        private void HotKeyTextBox_PreviewMouseDown(object sender, MouseButtonEventArgs e)
        {
            ((TextBox)sender).Focus();
            e.Handled = true;
        }

        private void HotKeyTextBox_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            e.Handled = true;
            if (e.Key == Key.LeftCtrl || e.Key == Key.RightCtrl ||
                e.Key == Key.LeftAlt || e.Key == Key.RightAlt ||
                e.Key == Key.LeftShift || e.Key == Key.RightShift)
                return;

            var hotKey = FormatHotKey(e);
            if (hotKey == null)
            {
                MessageBox.Show("יש לבחור לפחות אחד מהמקשים Ctrl, Alt או Shift יחד עם מקש נוסף.", "קיצור מקשים");
                return;
            }

            var textBox = (TextBox)sender;
            string other = ReferenceEquals(textBox, CopySearchHotKey)
                ? CatalogSearchHotKey.Text
                : CopySearchHotKey.Text;
            if (string.Equals(hotKey, other, StringComparison.OrdinalIgnoreCase))
            {
                MessageBox.Show("קיצור זה כבר משויך לפעולת החיפוש האחרת.", "קיצור מקשים");
                return;
            }

            if (IsWordShortcutAssigned(hotKey))
            {
                MessageBox.Show("קיצור זה כבר מוקצה ב-Word לפקודה או למאקרו. בחר קיצור אחר.", "קיצור מקשים");
                return;
            }

            textBox.Text = hotKey;
            SaveHotKeys();
        }

        private static string FormatHotKey(KeyEventArgs e)
        {
            var modifiers = new List<string>();
            if ((Keyboard.Modifiers & ModifierKeys.Control) != 0) modifiers.Add("Ctrl");
            if ((Keyboard.Modifiers & ModifierKeys.Alt) != 0) modifiers.Add("Alt");
            if ((Keyboard.Modifiers & ModifierKeys.Shift) != 0) modifiers.Add("Shift");
            if (modifiers.Count == 0) return null;

            Key key = e.Key == Key.System ? e.SystemKey : e.Key;
            string keyName = key.ToString();
            if (keyName.StartsWith("D", StringComparison.Ordinal) && keyName.Length == 2)
                keyName = keyName.Substring(1);
            else if (keyName.StartsWith("NumPad", StringComparison.Ordinal))
                keyName = "Num" + keyName.Substring(6);

            return string.Join("+", modifiers) + "+" + keyName;
        }

        private bool IsWordShortcutAssigned(string hotKey)
        {
            try
            {
                var parsed = ThisAddIn.ParseHotKeyForWord(hotKey);
                if (parsed == null) return true;
                dynamic keyBindings = Globals.ThisAddIn.Application.KeyBindings;
                foreach (Microsoft.Office.Interop.Word.WdKeyCategory category in new[]
                    { Microsoft.Office.Interop.Word.WdKeyCategory.wdKeyCategoryCommand,
                      Microsoft.Office.Interop.Word.WdKeyCategory.wdKeyCategoryMacro })
                {
                    dynamic binding = keyBindings.FindKey(parsed.Value, category);
                    if (binding != null) return true;
                }
                return false;
            }
            catch
            {
                return true;
            }
        }

        private void SaveHotKeys()
        {
            string oldCopy = SettingsManager.Get("HotKeys", "CopySearch", "Ctrl+Alt+K");
            string oldCatalog = SettingsManager.Get("HotKeys", "CatalogSearch", "Ctrl+Alt+B");
            SettingsManager.Save("HotKeys", "CopySearch", CopySearchHotKey.Text);
            SettingsManager.Save("HotKeys", "CatalogSearch", CatalogSearchHotKey.Text);
            if (_hotKeysChanged != null && !_hotKeysChanged())
            {
                SettingsManager.Save("HotKeys", "CopySearch", oldCopy);
                SettingsManager.Save("HotKeys", "CatalogSearch", oldCatalog);
                CopySearchHotKey.Text = oldCopy;
                CatalogSearchHotKey.Text = oldCatalog;
            }
        }
    }
}
