import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scholar Intelligence | إدارة فرص الدراسات العليا",
  description: "مساحة شخصية لاكتشاف المنح والبرامج الجامعية والتحقق من التمويل والأهلية ومواعيد التقديم.",
  applicationName: "Scholar Intelligence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
