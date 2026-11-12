# WScript.Shell cannot represent shortcut targets outside the Windows ANSI code page.
if (-not ("Huandeng.WindowsShortcutShell" -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

namespace Huandeng {
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    internal class ShellLinkObject { }

    [ComImport, Guid("000214F9-0000-0000-C000-000000000046")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IShellLinkW {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int length, IntPtr findData, uint flags);
        void GetIDList(out IntPtr itemList);
        void SetIDList(IntPtr itemList);
        void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder description, int length);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string description);
        void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder directory, int length);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string directory);
        void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder arguments, int length);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string arguments);
        void GetHotkey(out short hotkey);
        void SetHotkey(short hotkey);
        void GetShowCmd(out int command);
        void SetShowCmd(int command);
        void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int length, out int index);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string path, int index);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string path, uint reserved);
        void Resolve(IntPtr window, uint flags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string path);
    }

    public sealed class WindowsShortcutShell {
        public WindowsShortcut CreateShortcut(string path) {
            return new WindowsShortcut(path);
        }
    }

    public sealed class WindowsShortcut {
        private readonly string path;
        public string TargetPath { get; set; }
        public string WorkingDirectory { get; set; }
        public string Description { get; set; }
        public string Arguments { get; set; }
        public string IconPath { get; set; }
        public int IconIndex { get; set; }
        public int ShowCommand { get; set; }
        public short Hotkey { get; set; }

        internal WindowsShortcut(string path) {
            this.path = Path.GetFullPath(path);
            TargetPath = WorkingDirectory = Description = Arguments = IconPath = "";
            ShowCommand = 1;
            if (!File.Exists(this.path)) return;
            object native = new ShellLinkObject();
            try {
                ((IPersistFile)native).Load(this.path, 0);
                IShellLinkW link = (IShellLinkW)native;
                StringBuilder text = new StringBuilder(32768);
                // Read the stored target without Resolve(), which can search for a moved target.
                link.GetPath(text, text.Capacity, IntPtr.Zero, 4);
                TargetPath = text.ToString();
                text.Clear();
                link.GetWorkingDirectory(text, text.Capacity);
                WorkingDirectory = text.ToString();
                text.Clear();
                link.GetDescription(text, text.Capacity);
                Description = text.ToString();
                text.Clear();
                link.GetArguments(text, text.Capacity);
                Arguments = text.ToString();
                text.Clear();
                int iconIndex;
                link.GetIconLocation(text, text.Capacity, out iconIndex);
                IconPath = text.ToString();
                IconIndex = iconIndex;
                int showCommand;
                link.GetShowCmd(out showCommand);
                ShowCommand = showCommand;
                short hotkey;
                link.GetHotkey(out hotkey);
                Hotkey = hotkey;
            } finally {
                Marshal.FinalReleaseComObject(native);
            }
        }

        public void Save() {
            object native = new ShellLinkObject();
            try {
                IShellLinkW link = (IShellLinkW)native;
                link.SetPath(TargetPath);
                link.SetWorkingDirectory(WorkingDirectory);
                link.SetDescription(Description);
                link.SetArguments(Arguments);
                link.SetIconLocation(IconPath, IconIndex);
                link.SetShowCmd(ShowCommand);
                link.SetHotkey(Hotkey);
                ((IPersistFile)native).Save(path, true);
            } finally {
                Marshal.FinalReleaseComObject(native);
            }
        }
    }
}
'@
}
