import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel, Merriweather } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "WoW BiS Leveling Tool",
  description: "Track the best-in-slot items while leveling in World of Warcraft",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${merriweather.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Script
          id="wowhead-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `const whTooltips = {colorLinks: true, iconizeLinks: false, renameLinks: false};`,
          }}
        />
        <Script
          src="https://wow.zamimg.com/js/tooltips.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
