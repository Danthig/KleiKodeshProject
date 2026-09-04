using System;
using System.Windows.Forms;

namespace KleiKodesh
{
    internal sealed class NativeHotKeyWindow : NativeWindow, IDisposable
    {
        private const int WM_HOTKEY = 0x0312;
        private bool _disposed;

        public event EventHandler HotKeyPressed;

        public NativeHotKeyWindow()
        {
            CreateHandle(new CreateParams
            {
                Parent = new IntPtr(-3)
            });
        }

        protected override void WndProc(ref Message message)
        {
            if (message.Msg == WM_HOTKEY)
                HotKeyPressed?.Invoke(this, EventArgs.Empty);

            base.WndProc(ref message);
        }

        public void Dispose()
        {
            if (_disposed)
                return;

            _disposed = true;
            try
            {
                if (Handle != IntPtr.Zero)
                    DestroyHandle();
            }
            catch
            {
                // Shutdown must remain non-fatal even if Word already destroyed the handle.
            }
            finally
            {
                HotKeyPressed = null;
            }
        }
    }
}