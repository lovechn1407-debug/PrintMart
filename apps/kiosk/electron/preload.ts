import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("kioskApi", {
  verifyOtp: (otp: string) => ipcRenderer.invoke("kiosk:verify-otp", otp),
  preloadJob: (jobId: string) => ipcRenderer.invoke("kiosk:preload-job", jobId),
  printJob: (jobId: string, options: any) =>
    ipcRenderer.invoke("kiosk:print-job", jobId, options),
  getPrinterStatus: () => ipcRenderer.invoke("kiosk:get-printer-status"),
  getConfig: () => ipcRenderer.invoke("kiosk:get-config"),
  onPrintProgress: (callback: (progress: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on("kiosk:print-progress", handler);
    return () => ipcRenderer.removeListener("kiosk:print-progress", handler);
  },
});

