const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let electronPath = path.resolve(__dirname, "../../node_modules/electron/dist/electron.exe");
if (!fs.existsSync(electronPath)) {
  electronPath = path.resolve(__dirname, "node_modules/electron/dist/electron.exe");
}

// Unset ELECTRON_RUN_AS_NODE so Electron runs as a desktop application
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const kioskDir = path.resolve(__dirname);

const child = spawn(electronPath, [kioskDir], {
  detached: true,
  stdio: "ignore",
  env,
  cwd: kioskDir,
});

child.unref();

console.log("PrintMart Kiosk Electron launched (PID: " + child.pid + ")");
