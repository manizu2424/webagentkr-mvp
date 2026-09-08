// diagnosis_results 행(DB 컬럼명) → GET /api/diagnoses/[id] 의 result(API 필드명) 매핑.
// 계약: CLAUDE.md "AI 필드 ↔ DB 컬럼 ↔ API 응답 매핑" / n8n/workflows/README.md.
// 순수 함수 — 시크릿 없음. "server-only" 를 넣지 않는다(러너 없는 유닛 테스트 대상).

export interface DiagnosisResultRow {
  automation_score: number | null;
  recommended_tasks: unknown; // [{ name, reason, difficulty, estimatedMonthlySavedHours }]
  estimated_saved_hours: unknown; // { min, max }
  recommended_stack: string[] | null;
  implementation_steps: string[] | null;
  ai_summary: string | null;
}

export interface PriorityTask {
  name: string;
  reason: string;
  difficulty: "낮음" | "중간" | "높음";
  estimatedMonthlySavedHours: number;
}

export interface DiagnosisApiResult {
  automationScore: number;
  priorityTasks: PriorityTask[];
  totalEstimatedSavedHours: { min: number; max: number };
  recommendedStack: string[];
  implementationSteps: string[];
  summary: string;
}

function toSavedHours(v: unknown): { min: number; max: number } {
  if (v && typeof v === "object" && "min" in v && "max" in v) {
    const o = v as { min: unknown; max: unknown };
    return {
      min: typeof o.min === "number" ? o.min : 0,
      max: typeof o.max === "number" ? o.max : 0,
    };
  }
  return { min: 0, max: 0 };
}

export function toApiResult(row: DiagnosisResultRow): DiagnosisApiResult {
  return {
    automationScore: row.automation_score ?? 0,
    priorityTasks: Array.isArray(row.recommended_tasks)
      ? (row.recommended_tasks as PriorityTask[])
      : [],
    totalEstimatedSavedHours: toSavedHours(row.estimated_saved_hours),
    recommendedStack: row.recommended_stack ?? [],
    implementationSteps: row.implementation_steps ?? [],
    summary: row.ai_summary ?? "",
  };
}
