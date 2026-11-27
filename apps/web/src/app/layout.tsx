import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Footer } from "@/components/layout/Footer";

const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "Nexus — Electronics Sourcing & Integration", template: "%s · Nexus" },
  description: "Born from an IoT engineering research challenge: explore Nexus, a Rust, Go and Next.js electronics sourcing platform with evidence-grounded decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <Navbar />
              {children}
              <Footer />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
        <Script
          id="flowmeet-widget"
          src="https://flowmeet.aetherhost.app/widget.js"
          strategy="afterInteractive"
          data-slug="aetherhost"
          data-no-button="true"
        />
      </body>
    </html>
  );
}
