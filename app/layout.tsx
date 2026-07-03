import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "block",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const grotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "block",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PayefyKYC",
  description: "Portal de onboarding y KYC para empresas con Payefy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} ${grotesk.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        <NextTopLoader color="#A8F898" showSpinner={false} height={3} />
        {children}
      </body>
    </html>
  );
}
