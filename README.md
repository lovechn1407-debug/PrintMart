# PrintMart — Smart Self-Service Printing Platform

PrintMart is a production-oriented self-service document printing platform connecting cloud document processing, payments, and physical vending machine kiosks.

## System Components

1. **Customer Web Portal (`apps/web`)**: Next.js 15 (App Router), HeroUI v3, Firebase Auth (Google Sign-In), Cashfree Sandbox, and Telegram Document Storage.
2. **Master Admin Dashboard (`apps/web/app/admin`)**: Fleet management, printer telemetry, dynamic pricing (in integer paise), coupons, error monitoring, and remote overlays.
3. **Physical Vending Machine Agent (`apps/kiosk`)**: Electron 34 full-screen kiosk, touch/keyboard numeric keypad, native Windows Print Spooler interface, and background document preloader.

## Key Features

- **HeroUI v3 Design System**: Exclusively uses official `@heroui/react` components with a clean light-mode SaaS aesthetic.
- **Background Document Preloading**: Documents stream to the selected kiosk upon payment confirmation. When the customer enters their OTP, printing starts instantly without downloading.
- **Integer Currency Arithmetic**: Financial calculations are executed in **paise** internally to prevent floating-point discrepancies.
- **Zero-Trust Credential Containment**: Telegram Bot tokens and Cashfree secrets reside strictly on the server side.

## Quick Start

### 1. Web Application
```bash
# Navigate to web app
cd apps/web

# Start development server
npm run dev
# Web application starts at http://localhost:3000
```

### 2. Kiosk Application
```bash
# Navigate to kiosk app
cd apps/kiosk

# Start Kiosk UI and Electron
npm run dev:ui
```

