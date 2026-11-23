import type { Metadata } from "next";
import EvaluationWorkspace from "./evaluation-workspace";

export const metadata: Metadata = {
  title: "تقييم الأهلية والتمويل | Scholar Intelligence",
  description: "تقييم حتمي مبدئي للأهلية وتغطية التكاليف بالاعتماد على الأدلة التي راجعها المستخدم."
};

export default function EvaluationPage() {
  return <EvaluationWorkspace />;
}
