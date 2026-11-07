# PrintMart: System Architecture Documentation

## 1. Overview
PrintMart is a commercial-grade, self-service automated printing platform designed to bridge cloud print job ordering and physical vending machine hardware.

## 2. Core Subsystems

### A. Web Application (`apps/web`)
- **Framework**: Next.js 15 (App Router)
- **Design System**: HeroUI v3 (`@heroui/react` 3.2.7) with Tailwind CSS 4
- **State & Sync**: Firebase Realtime Database
- **Authentication**: Firebase Auth (Google Sign-In)
- **Deployment**: Vercel

### B. Physical Vending Kiosk (`apps/kiosk`)
- **Runtime**: Electron 34 with Node.js Main Process
- **Hardware Layer**: Native Windows Print Spooler (Win32 Spooler API, PowerShell `Get-Printer`/`Get-PrintJob`, WMI telemetry)
- **User Interface**: Full-screen kiosk using HeroUI v3 with touch numeric keypad and physical keyboard support
- **Packaging**: `electron-builder` Windows installer

### C. Background Document Preloader Engine
1. Customer initiates and completes payment through Cashfree.
2. Verified webhook sets `/printJobs/{jobId}/preparation/status` = `PRELOAD_QUEUED`.
3. Electron Kiosk agent listening to Firebase RTDB streams the document from the private Telegram Channel (`# -1004357170113`) via the authorized backend proxy.
4. Kiosk verifies SHA-256 checksum and saves to `%APPDATA%/PrintMart/spool_cache/{jobId}.pdf`.
5. Kiosk updates status to `READY`.
6. When customer enters the 6-digit OTP on the touchscreen, validation is instantaneous: **no download occurs at OTP time**.

