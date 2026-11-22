export type SourceCategory = "scholarship-portal" | "government" | "university-network" | "international-program";

export interface OfficialSource {
  id: string;
  name: string;
  category: SourceCategory;
  baseUrl: string;
  domains: string[];
  description: string;
}

export const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    id: "daad",
    name: "DAAD Scholarship Database",
    category: "scholarship-portal",
    baseUrl: "https://www.daad.de/en/studying-in-germany/scholarships/",
    domains: ["daad.de"],
    description: "منح وفرص الدراسة والبحث في ألمانيا"
  },
  {
    id: "erasmus-mundus",
    name: "Erasmus Mundus Joint Masters",
    category: "international-program",
    baseUrl: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters",
    domains: ["erasmus-plus.ec.europa.eu"],
    description: "برامج الماجستير المشتركة ضمن Erasmus+"
  },
  {
    id: "study-in-japan",
    name: "Study in Japan",
    category: "government",
    baseUrl: "https://www.studyinjapan.go.jp/en/planning/scholarships/",
    domains: ["studyinjapan.go.jp"],
    description: "معلومات رسمية عن المنح والدراسة في اليابان"
  },
  {
    id: "turkiye-scholarships",
    name: "Türkiye Scholarships",
    category: "government",
    baseUrl: "https://www.turkiyeburslari.gov.tr/",
    domains: ["turkiyeburslari.gov.tr"],
    description: "برنامج المنح الحكومية التركية"
  },
  {
    id: "chevening",
    name: "Chevening",
    category: "government",
    baseUrl: "https://www.chevening.org/scholarships/",
    domains: ["chevening.org"],
    description: "منح الحكومة البريطانية للدراسات العليا"
  },
  {
    id: "commonwealth",
    name: "Commonwealth Scholarships",
    category: "government",
    baseUrl: "https://cscuk.fcdo.gov.uk/scholarships/",
    domains: ["cscuk.fcdo.gov.uk"],
    description: "منح الكومنولث للدراسة والبحث"
  },
  {
    id: "stipendium-hungaricum",
    name: "Stipendium Hungaricum",
    category: "government",
    baseUrl: "https://stipendiumhungaricum.hu/",
    domains: ["stipendiumhungaricum.hu"],
    description: "برنامج المنح الحكومية المجرية"
  },
  {
    id: "campus-france",
    name: "Campus France",
    category: "university-network",
    baseUrl: "https://www.campusfrance.org/en",
    domains: ["campusfrance.org"],
    description: "البوابة الرسمية للمعلومات عن الدراسة في فرنسا"
  }
];

export type SourceTrust = "registered-official" | "unverified";

export interface SourceClassification {
  trust: SourceTrust;
  matchedSource: OfficialSource | null;
  hostname: string | null;
}

/** Exact host or a true subdomain match; never a loose suffix match. */
export function classifySourceUrl(value: string): SourceClassification {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { trust: "unverified", matchedSource: null, hostname: null };
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    return { trust: "unverified", matchedSource: null, hostname: parsed.hostname || null };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\\.$/, "");
  const matchedSource = OFFICIAL_SOURCES.find((source) =>
    source.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  ) ?? null;

  return {
    trust: matchedSource ? "registered-official" : "unverified",
    matchedSource,
    hostname
  };
}
