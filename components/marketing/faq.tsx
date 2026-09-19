import { SectionBand } from "@/components/marketing/section-band";
import { FAQ, SECTIONS } from "@/content/marketing";

// 네이티브 <details> — 클라이언트 JS 없음.
export function Faq() {
  const s = SECTIONS.faq;
  return (
    <SectionBand surface="panel" eyebrow={s.eyebrow} heading={s.heading}>
      <div className="border-t border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[1rem] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden
                className="ml-4 text-ink-soft transition-transform group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <p className="pb-5 text-[0.95rem] leading-[1.75] text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </SectionBand>
  );
}
