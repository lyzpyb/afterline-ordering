import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aiorderafterline.shop"),
  title: "aiorderafterline",
  description:
    "aiorder-afterline combines probabilistic demand sensing, multi-echelon inventory optimization, supplier risk intelligence, and closed-loop replenishment automation for modern retail teams.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "aiorderafterline",
    description:
      "Turn demand uncertainty into supplier-ready ordering decisions with AI-native forecasting, optimization, and automation.",
    url: "https://aiorderafterline.shop",
    siteName: "aiorderafterline",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
