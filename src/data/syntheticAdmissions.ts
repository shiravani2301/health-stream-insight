/**
 * SYNTHETIC SAMPLE DATA — generated with a seeded pseudo-random generator.
 * This is NOT real hospital data. Replace `admissions` with records parsed
 * from a verified CSV (same shape as `Admission`) to use real data.
 */
export interface Admission {
  id: number;
  date: string; // YYYY-MM-DD
  disease: string;
  department: string;
  ageGroup: string;
  gender: "Male" | "Female";
  admissionType: "Emergency" | "Elective" | "Urgent";
  los: number; // length of stay, days
}

export const DATA_IS_SYNTHETIC = true;
export const DISEASES = ["Pneumonia", "Heart Failure", "Diabetes", "COPD", "Stroke", "Fracture", "Sepsis", "Appendicitis"];
export const DEPARTMENTS = ["Cardiology", "Pulmonology", "Endocrinology", "Neurology", "Orthopedics", "General Surgery", "Internal Medicine"];
export const AGE_GROUPS = ["0-17", "18-34", "35-49", "50-64", "65-79", "80+"];
export const GENDERS = ["Male", "Female"] as const;
export const ADMISSION_TYPES = ["Emergency", "Elective", "Urgent"] as const;

const diseaseDept: Record<string, string[]> = {
  Pneumonia: ["Pulmonology", "Internal Medicine"],
  "Heart Failure": ["Cardiology", "Internal Medicine"],
  Diabetes: ["Endocrinology", "Internal Medicine"],
  COPD: ["Pulmonology"],
  Stroke: ["Neurology"],
  Fracture: ["Orthopedics"],
  Sepsis: ["Internal Medicine", "General Surgery"],
  Appendicitis: ["General Surgery"],
};
const diseaseWeight = [18, 14, 12, 10, 9, 13, 8, 7];
const baseLos: Record<string, number> = { Pneumonia: 5, "Heart Failure": 7, Diabetes: 4, COPD: 6, Stroke: 9, Fracture: 5, Sepsis: 10, Appendicitis: 3 };

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(r: () => number, items: readonly T[], w?: number[]): T {
  const weights = w ?? items.map(() => 1);
  let x = r() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
  return items[items.length - 1];
}

function generate(n: number): Admission[] {
  const r = mulberry32(20240101);
  const out: Admission[] = [];
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < n; i++) {
    let day = Math.floor(r() * 365);
    // winter respiratory surge
    const disease = pick(r, DISEASES, diseaseWeight);
    if ((disease === "Pneumonia" || disease === "COPD") && r() < 0.4) day = r() < 0.5 ? Math.floor(r() * 60) : 305 + Math.floor(r() * 60);
    const d = new Date(start + day * 864e5);
    const ageGroup = pick(r, AGE_GROUPS, disease === "Appendicitis" ? [20, 30, 20, 15, 10, 5] : [4, 8, 14, 22, 30, 22]);
    const admissionType = pick(r, ADMISSION_TYPES, disease === "Fracture" || disease === "Stroke" || disease === "Sepsis" ? [70, 5, 25] : [40, 35, 25]);
    const ageBoost = AGE_GROUPS.indexOf(ageGroup) * 0.4;
    const los = Math.max(1, Math.round(baseLos[disease] + ageBoost + (r() - 0.4) * 5));
    out.push({
      id: i + 1,
      date: d.toISOString().slice(0, 10),
      disease,
      department: pick(r, diseaseDept[disease]),
      ageGroup,
      gender: r() < 0.49 ? "Male" : "Female",
      admissionType,
      los,
    });
  }
  return out;
}

export const admissions: Admission[] = generate(4200);
