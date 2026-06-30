import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLMSniffer",
  description: "API 中转站可用性与延迟监控平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
