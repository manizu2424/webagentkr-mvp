import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 커넥터 스파인 위의 노드 마커 + 좌측 정렬 섹션 헤딩.
// 마커는 lg 이상에서만 (스파인은 page.tsx 가 그림).
export function Section({
  heading,
  children,
  wide,
  terminal,
}: {
  heading: string;
  children: ReactNode;
  wide?: boolean;
  terminal?: boolean;
}) {
  return (
    <section className="relative py-12 lg:py-16">
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            "absolute top-[0.5em] -left-[2.3rem] hidden size-2.5 rotate-45 border border-signal bg-paper lg:block",
            terminal && "bg-signal",
          )}
        />
        <h2 className="text-[1.6rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.9rem]">
          {heading}
        </h2>
      </div>
      <div className={cn("mt-8", wide ? "max-w-none" : "max-w-[46rem]")}>
        {children}
      </div>
    </section>
  );
}
