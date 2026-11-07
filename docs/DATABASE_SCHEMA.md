# PrintMart: Database Schema & RTDB Structure

The database is built on **Firebase Realtime Database** (`printmart-bd9da`). All critical mutations are authorized through backend API routes and the Firebase Admin SDK.

## Node Hierarchy

- `/users/{uid}`: Customer profile, statistics, role, and account status.
- `/admins/{uid}`: Administrators authorized for the Master Admin panel.
- `/machines/{machineId}`: Registered vending machines, location, connection status, last heartbeat.
- `/machinePrinterStatus/{machineId}`: Realtime printer telemetry (paper status, toner levels, hardware state).
- `/machineCommands/{machineId}/{commandId}`: Remote commands (ENABLE, DISABLE, RESTART_AGENT, REFRESH_STATUS).
- `/documents/{documentId}`: Document metadata, page count, SHA-256 checksum, Telegram message ID & file ID.
- `/printJobs/{jobId}`: Print job lifecycle, configuration, pricing in integer paise, payment status, preparation status (`PRELOAD_QUEUED` -> `READY`), printing status (`QUEUED` -> `COMPLETED`).
- `/otpRecords/{otpHash}`: SHA-256 hashed 6-digit OTPs with expiration timestamp and failed attempt counters.
- `/pricing/global`: Base rates (B/W per side, Color per side, paper size multipliers) in integer paise.
- `/offers/{offerId}`: Promotional discount coupons (percentage or flat discount).
- `/referrals/{referralCode}`: Referral campaigns and conversion counts.
- `/overlays/global` & `/overlays/machines/{machineId}`: Remote maintenance and service alerts displayed on kiosks.
- `/errorLogs/{machineId}/{errorId}`: Diagnostic errors reported by kiosks.

