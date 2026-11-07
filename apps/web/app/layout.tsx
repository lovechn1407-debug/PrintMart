import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintMart — Smart Self-Service Printing Platform",
  description:
    "Instant cloud-to-hardware self-service document printing platform. Preloaded streaming, Cashfree payments, and secure OTP verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="light min-h-screen bg-[#faf7ee] text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
