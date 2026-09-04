import { Section } from "@/components/marketing/section";

const ROWS: [task: string, before: string, after: string][] = [
  ["고객 문의", "이메일 수동 확인", "접수 즉시 저장·알림"],
  ["고객 관리", "엑셀 수기 입력", "CRM 자동 등록"],
  ["견적 작성", "양식 복사·수정", "AI 초안 생성"],
  ["상담 정리", "직원 수기 작성", "AI 자동 요약"],
  ["블로그", "조사부터 직접 수행", "자료·초안 자동 생성"],
  ["보고서", "자료 복사 후 작성", "지정 양식 자동 생성"],
];

export function BeforeAfter() {
  return (
    <Section heading="기존 방식과 자동화 후" wide>
      <div className="max-w-[52rem] overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.98rem]">
          <thead>
            <tr className="border-y border-ink text-sm text-ink-soft">
              <th className="py-2.5 pr-6 font-medium">업무</th>
              <th className="py-2.5 pr-6 font-medium">기존 방식</th>
              <th className="py-2.5 font-medium">자동화 후</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([task, before, after]) => (
              <tr key={task} className="border-b border-line align-top">
                <td className="py-3.5 pr-6 font-semibold whitespace-nowrap text-ink">
                  {task}
                </td>
                <td className="py-3.5 pr-6 text-ink-soft">{before}</td>
                <td className="py-3.5 font-medium text-resolved">{after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
