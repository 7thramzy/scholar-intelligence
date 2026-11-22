import type { Metadata } from "next";
import OpportunityManager from "./opportunity-manager";

export const metadata: Metadata = {
  title: "الفرص والمنح | Scholar Intelligence",
  description: "إدارة فرص الماجستير ومصادرها ومواعيدها في مساحة محلية خاصة."
};

export default function OpportunitiesPage() {
  return <OpportunityManager />;
}
