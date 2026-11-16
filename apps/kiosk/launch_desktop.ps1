Add-Type @'
using System;
using System.Runtime.InteropServices;

public class DesktopLauncher {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO {
    public int cb;
    public string lpReserved;
    public string lpDesktop;
    public string lpTitle;
    public int dwX;
    public int dwY;
    public int dwXSize;
    public int dwYSize;
    public int dwXCountChars;
    public int dwYCountChars;
    public int dwFillAttribute;
    public int dwFlags;
    public short wShowWindow;
    public short cbReserved2;
    public IntPtr lpReserved2;
    public IntPtr hStdInput;
    public IntPtr hStdOutput;
    public IntPtr hStdError;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION {
    public IntPtr hProcess;
    public IntPtr hThread;
    public int dwProcessId;
    public int dwThreadId;
  }

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool SetEnvironmentVariable(string lpName, string lpValue);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CreateProcess(
    string lpApplicationName,
    string lpCommandLine,
    IntPtr lpProcessAttributes,
    IntPtr lpThreadAttributes,
    bool bInheritHandles,
    uint dwCreationFlags,
    IntPtr lpEnvironment,
    string lpCurrentDirectory,
    ref STARTUPINFO lpStartupInfo,
    out PROCESS_INFORMATION lpProcessInformation
  );

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool CloseHandle(IntPtr hObject);

  public static void LaunchAndWait(string appPath, string cmdLine, string workingDir) {
    SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", null);
    Environment.SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", null);

    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(si);
    si.lpDesktop = @"WinSta0\Default";

    PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
    
    bool success = CreateProcess(
      appPath,
      cmdLine,
      IntPtr.Zero,
      IntPtr.Zero,
      false,
      0,
      IntPtr.Zero,
      workingDir,
      ref si,
      out pi
    );

    if (!success) {
      int err = Marshal.GetLastWin32Error();
      Console.WriteLine("CreateProcess failed with error: " + err);
      return;
    }

    Console.WriteLine("Electron launched on WinSta0\\Default with PID: " + pi.dwProcessId);
    
    // Wait for Electron process to exit
    WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
    
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    Console.WriteLine("Electron process exited.");
  }
}
'@

$appPath = "C:\Users\Love Chauhan\Desktop\Print me\node_modules\electron\dist\electron.exe"
$cmdLine = "`"$appPath`" ."
$workingDir = "C:\Users\Love Chauhan\Desktop\Print me\apps\kiosk"

[DesktopLauncher]::LaunchAndWait($appPath, $cmdLine, $workingDir)
