# PrintMart: Deployment Guide

## 1. Web Application (`apps/web`) on Vercel
1. Link repository to Vercel.
2. Set Root Directory to `apps/web`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
   - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `CASHFREE_APP_ID`
   - `CASHFREE_SECRET_KEY`
   - `CASHFREE_ENV`
   - `MACHINE_PEPPER`
4. Deploy.

## 2. Electron Kiosk Application (`apps/kiosk`)
1. In `apps/kiosk`, build the React UI and Electron main process:
   ```bash
   npm run build
   ```
2. Package the Windows installer:
   ```bash
   npm run package
   ```
3. Install the resulting `.exe` on the vending machine PC.
4. Set environment variables on the machine:
   - `PRINTMART_SERVER_URL`: Production Vercel domain
   - `PRINTMART_MACHINE_ID`: Unique machine ID (e.g., `MCH-CAMPUS-01`)

