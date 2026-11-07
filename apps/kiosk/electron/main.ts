import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { PrinterService } from "./hardware/printerService";
import { PreloadAgent } from "./hardware/preloadAgent";

let mainWindow: BrowserWindow | null = null;
const SERVER_URL = process.env.PRINTMART_SERVER_URL || "http://localhost:3000";
let CURRENT_MACHINE_ID = process.env.PRINTMART_MACHINE_ID || "MCH-CAMPUS-01";

const printerService = new PrinterService();
const preloadAgent = new PreloadAgent(SERVER_URL, CURRENT_MACHINE_ID);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: process.env.NODE_ENV === "production",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = "http://localhost:5173";
  if (process.env.NODE_ENV !== "production") {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow?.loadFile(path.join(__dirname, "../dist/index.html"));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Send periodic heartbeat to backend
  setInterval(async () => {
    try {
      const printerStatus = await printerService.getPrinterTelemetry();
      await fetch(`${SERVER_URL}/api/machine/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: CURRENT_MACHINE_ID,
          agentVersion: "1.0.0",
          printerStatus,
        }),
      });
    } catch {}
  }, 15000);
});

// IPC Handler: Verify OTP
ipcMain.handle("kiosk:verify-otp", async (_, otp: string) => {
  try {
    const res = await fetch(`${SERVER_URL}/api/machine/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machineId: CURRENT_MACHINE_ID,
        otp,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach backend" };
  }
});

// IPC Handler: Preload Job Document (Background)
ipcMain.handle("kiosk:preload-job", async (_, jobId: string) => {
  return await preloadAgent.preloadJobDocument(jobId);
});

// IPC Handler: Print Preloaded Document
ipcMain.handle("kiosk:print-job", async (event, jobId: string, options: any) => {
  // Ensure document is already in local cache
  let cachedFile = preloadAgent.getCachedFilePath(jobId);
  if (!cachedFile) {
    // Attempt emergency background preload
    const preloadRes = await preloadAgent.preloadJobDocument(jobId);
    if (!preloadRes.success) {
      return { success: false, error: "Document could not be spooled" };
    }
    cachedFile = preloadRes.cachedFilePath;
  }

  // Spool document to Windows Spooler
  const printResult = await printerService.printDocument(
    cachedFile,
    options,
    (printedPages, totalPages) => {
      // Notify renderer of real spooling progress
      event.sender.send("kiosk:print-progress", {
        jobId,
        printedPages,
        totalPages,
      });
    }
  );

  // Auto clean up temporary PDF
  if (printResult.success) {
    preloadAgent.cleanupJobFile(jobId);
  }

  return printResult;
});

// IPC Handler: Get Printer Telemetry
ipcMain.handle("kiosk:get-printer-status", async () => {
  return await printerService.getPrinterTelemetry();
});

// IPC Handler: Get Machine Config
ipcMain.handle("kiosk:get-config", () => {
  return {
    machineId: CURRENT_MACHINE_ID,
    serverUrl: SERVER_URL,
    version: "1.0.0",
  };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

