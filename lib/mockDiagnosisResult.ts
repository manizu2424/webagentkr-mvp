import type { DiagnosisResultRow } from "./diagnosisResult";

// n8n 부재 시 POST /api/dev/mock-result 가 diagnosis_results 에 그대로 insert 하는 더미.
// Phase B 에서 실제 AI 출력 → 이 컬럼 형태로 매핑하는 참조 픽스처. 한국어, 실제 결과처럼.
export const MOCK_RESULT_ROW: DiagnosisResultRow = {
  automation_score: 68,
  recommended_tasks: [
    {
      name: "견적서·거래명세서 발행 자동화",
      reason:
        "지금은 담당자가 양식에 값을 옮겨 적어 PDF로 저장·전송합니다. 입력 항목이 정형화되어 있어 폼 제출 한 번으로 발행·전송·보관까지 자동화하기 쉽습니다.",
      difficulty: "낮음",
      estimatedMonthlySavedHours: 12,
    },
    {
      name: "고객 문의 1차 분류·응대",
      reason:
        "문의의 상당수가 배송 조회, 반품 절차, 영업시간 등 반복 질문입니다. 유형을 자동 분류해 표준 답변을 먼저 보내고, 애매한 건만 사람에게 넘기면 응대 시간이 크게 줄어듭니다.",
      difficulty: "중간",
      estimatedMonthlySavedHours: 20,
    },
    {
      name: "재고 현황 집계 리포트",
      reason:
        "여러 시트에 흩어진 입출고 기록을 매주 수기로 취합하고 있습니다. 소스가 고정되어 있어 정해진 시각에 자동 집계·요약 발송으로 대체할 수 있습니다.",
      difficulty: "낮음",
      estimatedMonthlySavedHours: 8,
    },
    {
      name: "월 마감 정산 데이터 취합",
      reason:
        "결제·세금계산서·매입 자료를 각기 다른 곳에서 받아 대사합니다. 예외 케이스가 있어 완전 자동화는 어렵지만, 수집과 1차 대사까지는 자동화해 검토만 사람이 하도록 만들 수 있습니다.",
      difficulty: "높음",
      estimatedMonthlySavedHours: 10,
    },
  ],
  estimated_saved_hours: { min: 40, max: 60 },
  recommended_stack: ["n8n", "Supabase", "OpenAI API", "Telegram"],
  implementation_steps: [
    "1주차: 가장 단순한 견적서 발행 흐름을 자동화해 효과를 확인합니다.",
    "2주차: 고객 문의 유형 분류와 표준 답변 자동 발송을 붙입니다.",
    "3주차: 재고 집계 리포트를 정기 실행으로 전환합니다.",
    "4주차: 월 마감 데이터 수집·1차 대사를 자동화하고 담당자 검토 단계를 남깁니다.",
  ],
  ai_summary:
    "반복 입력·집계·1차 응대에 시간이 집중되어 있어 자동화 여지가 큽니다. 난이도가 낮은 견적서 발행과 재고 집계부터 시작해 빠르게 효과를 확인하고, 이어서 문의 응대와 월 마감으로 확장하는 순서를 권장합니다. 아래 수치는 입력값 기준 추정치이며 실제 절감폭은 업무 표준화 정도에 따라 달라집니다.",
};
