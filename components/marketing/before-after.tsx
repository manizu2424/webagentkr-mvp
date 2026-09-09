import { SectionBand } from "@/components/marketing/section-band";
import { BeforeAfterSplit } from "@/components/marketing/illustrations/before-after-split";
import { BEFORE_AFTER } from "@/content/marketing";

export function BeforeAfter() {
  return (
    <SectionBand
      surface="panel"
      index={2}
      eyebrow="해법"
      heading="기존 방식과 자동화 후"
      wide
    >
      <BeforeAfterSplit rows={BEFORE_AFTER} />

      <div className="mt-10 max-w-[52rem] overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.98rem]">
          <thead>
            <tr className="border-y border-ink text-sm text-ink-soft">
              <th className="py-2.5 pr-6 font-medium">업무</th>
              <th className="py-2.5 pr-6 font-medium">기존 방식</th>
              <th className="py-2.5 font-medium">자동화 후</th>
            </tr>
          </thead>
          <tbody>
            {BEFORE_AFTER.map((row) => (
              <tr key={row.task} className="border-b border-line align-top">
                <td className="py-3.5 pr-6 font-semibold whitespace-nowrap text-ink">
                  {row.task}
                </td>
                <td className="py-3.5 pr-6 text-ink-soft">{row.before}</td>
                <td className="py-3.5 font-medium text-resolved">{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionBand>
  );
}
