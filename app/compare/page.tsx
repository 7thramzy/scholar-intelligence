import type { Metadata } from "next";
import OpportunityComparison from "./opportunity-comparison";

export const metadata: Metadata = {
  title: "مقارنة الفرص | Scholar Intelligence",
  description: "مقارنة البرامج والمنح المحفوظة وفق البيانات والأدلة المتاحة."
};

export default function ComparePage() {
  return <OpportunityComparison />;
}
