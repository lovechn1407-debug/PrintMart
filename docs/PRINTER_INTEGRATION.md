# PrintMart: Native Printer & Hardware Integration

## 1. Operating System Printing Layer
On Windows, the Electron agent communicates directly with the Windows Print Spooler:
- **Enumeration**: PowerShell `Get-Printer | Select-Object -ExpandProperty Name`
- **Telemetry**: WMI / CIM `Get-CimInstance Win32_Printer`
- **Job Spooling**: Native document spooling targeting the preloaded local file in `%APPDATA%/PrintMart/spool_cache/{jobId}.pdf`

## 2. Capability-Based Reporting
Printers differ in the telemetry they expose. If a printer does not report toner levels or paper status via its driver, the agent explicitly flags the metric as `NOT_SUPPORTED` or `UNKNOWN` without fabricating fake values.

## 3. Simulator Mode (`[SIMULATOR_MODE]`)
When running in development or testing without a physical printer connected, `apps/kiosk/electron/hardware/printerService.ts` automatically activates a clearly labeled `[SIMULATOR_MODE]` that accurately mimics driver spooling delays, page progress intervals, and recoverable errors.

