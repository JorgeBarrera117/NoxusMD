$code = @"
using System;
using System.Runtime.InteropServices;

public class FolderPicker {
    [ComImport, Guid("DC1C5A9C-E88A-4dde-B5A1-60F82A20AEF7")]
    private class FileOpenDialogImpl {}

    [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IFileOpenDialog {
        [PreserveSig] uint Show([In] IntPtr hwndParent);
        void SetFileTypes([In] uint cFileTypes, [In] IntPtr rgFilterSpec);
        void SetFileTypeIndex([In] uint iFileType);
        void GetFileTypeIndex([Out] out uint piFileType);
        void Advise([In] IntPtr pfde, [Out] out uint pdwCookie);
        void Unadvise([In] uint dwCookie);
        void SetOptions([In] uint fos);
        void GetOptions([Out] out uint pfos);
        void SetDefaultFolder([In] IShellItem psi);
        void SetFolder([In] IShellItem psi);
        void GetFolder([Out] out IShellItem ppsi);
        void GetCurrentSelection([Out] out IShellItem ppsi);
        void SetFileName([In, MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
        void SetTitle([In, MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
        void SetOkButtonLabel([In, MarshalAs(UnmanagedType.LPWStr)] string pszText);
        void SetFileNameLabel([In, MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
        void GetResult([Out] out IShellItem ppsi);
        void AddPlace([In] IShellItem psi, uint fdap);
        void SetDefaultExtension([In, MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
        void Close([In] int hr);
        void SetClientGuid([In] ref Guid guid);
        void ClearClientData();
        void SetFilter([In] IntPtr pFilter);
        void GetResults([Out] out IntPtr ppenum);
        void GetSelectedItems([Out] out IntPtr ppsai);
    }

    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem {
        void BindToHandler(IntPtr pbc, [In] ref Guid bhid, [In] ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem ppsi);
        void GetDisplayName([In] uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
        void GetAttributes([In] uint sfgaoMask, out uint psfgaoAttribs);
        void Compare([In] IShellItem psi, [In] uint hint, out int piOrder);
    }

    public static string ShowDialog() {
        try {
            var dialog = (IFileOpenDialog)new FileOpenDialogImpl();
            uint options;
            dialog.GetOptions(out options);
            dialog.SetOptions(options | 0x20); // FOS_PICKFOLDERS
            dialog.SetTitle("Seleccione la carpeta de destino");
            if (dialog.Show(IntPtr.Zero) == 0) {
                IShellItem item;
                dialog.GetResult(out item);
                string path;
                item.GetDisplayName(0x80058000, out path); // SIGDN_FILESYSPATH
                return path;
            }
        } catch (Exception ex) {
            return "ERROR: " + ex.Message;
        }
        return "";
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
[FolderPicker]::ShowDialog()
