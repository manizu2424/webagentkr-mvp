import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SURFACE: Record<"paper" | "panel" | "tint", string> = {
  paper: "bg-paper",
  panel: "bg-panel",
  tint: "bg-tint",
};

export function SectionBand({
  id,
  surface = "paper",
  eyebrow,
  index,
  heading,
  lead,
  wide,
  headingAs = "h2",
  children,
}: {
  id?: string;
  surface?: "paper" | "panel" | "tint";
  eyebrow: string;
  index?: number;
  heading: string;
  lead?: string;
  wide?: boolean;
  headingAs?: "h1" | "h2";
  children: ReactNode;
}) {
  const HeadingTag = headingAs;
  return (
    <section id={id} className={cn("w-full", SURFACE[surface])}>
      <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:py-20">
        <p className="flex items-center gap-2 font-flow text-[0.75rem] tracking-[0.04em] text-signal">
          {typeof index === "number" && (
            <span>{String(index).padStart(2, "0")} ·</span>
          )}
          {eyebrow}
        </p>
        <span aria-hidden className="mt-3 block h-0.5 w-10 bg-signal" />
        <HeadingTag className="mt-4 text-[1.6rem] leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[1.9rem]">
          {heading}
        </HeadingTag>
        {lead && (
          <p className="mt-3 max-w-[34rem] text-[0.95rem] leading-[1.7] text-ink-soft">
            {lead}
          </p>
        )}
        <div className={cn("mt-9", wide ? "" : "max-w-[46rem]")}>{children}</div>
      </div>
    </section>
  );
}
