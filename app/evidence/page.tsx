import type { Metadata } from "next";
import EvidenceWorkspace from "./evidence-workspace";

export const metadata: Metadata = {
  title: "سجل الأدلة | Scholar Intelligence",
  description: "سجل محلي غير قابل للتحرير للأدلة المقتبسة من المصادر الرسمية."
};

export default function EvidencePage() {
  return <EvidenceWorkspace />;
}
