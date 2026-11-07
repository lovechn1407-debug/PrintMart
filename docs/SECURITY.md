# PrintMart: Security Model & Hardening

1. **Credential Isolation**: Telegram Bot tokens and Cashfree API Secret keys reside exclusively in server-side environment variables. They are never transmitted to browser clients or kiosk displays.
2. **Document Access Control**: Documents stored in Telegram are accessible only through authenticated backend stream proxies that verify user ownership or machine job assignment.
3. **One-Time Passcode (OTP)**: OTPs are 6-digit numeric codes hashed with SHA-256 and salted with `MACHINE_PEPPER`. OTP records expire in 60 minutes and lock permanently after 3 failed attempts.
4. **Idempotency & Replay Protection**: Cashfree webhooks verify HMAC-SHA256 signatures. Duplicate payment notifications are ignored.
5. **Database Rules**: Firebase RTDB rules enforce strict read/write boundaries: public writes are disallowed on critical collections (`/printJobs`, `/otpRecords`, `/machines`, `/pricing`).

