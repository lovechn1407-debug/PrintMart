"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("kioskApi", {
    verifyOtp: (otp) => electron_1.ipcRenderer.invoke("kiosk:verify-otp", otp),
    preloadJob: (jobId) => electron_1.ipcRenderer.invoke("kiosk:preload-job", jobId),
    printJob: (jobId, options) => electron_1.ipcRenderer.invoke("kiosk:print-job", jobId, options),
    getPrinterStatus: () => electron_1.ipcRenderer.invoke("kiosk:get-printer-status"),
    getConfig: () => electron_1.ipcRenderer.invoke("kiosk:get-config"),
    onPrintProgress: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on("kiosk:print-progress", handler);
        return () => electron_1.ipcRenderer.removeListener("kiosk:print-progress", handler);
    },
});
