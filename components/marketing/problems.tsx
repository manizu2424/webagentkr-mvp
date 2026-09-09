import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { PROBLEMS } from "@/content/marketing";

export function Problems() {
  return (
    <SectionBand
      surface="tint"
      index={1}
      eyebrow="문제"
      heading="아직도 이런 업무를 사람이 반복하고 있나요?"
    >
      <ul className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
        {PROBLEMS.map((p) => (
          <li
            key={p.label}
            className="flex items-center gap-3 border-t border-line py-3.5 text-[1.02rem] text-ink"
          >
            <Icon name={p.icon} />
            {p.label}
          </li>
        ))}
      </ul>
    </SectionBand>
  );
}
