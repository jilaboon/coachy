import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coachy - ניהול נוכחות לאימונים",
  description: "כלי פשוט למאמנים לאיסוף אישורי הגעה לאימונים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
