import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI智能助手",
  description: "基于 Next.js + LangChain 的智能对话助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
