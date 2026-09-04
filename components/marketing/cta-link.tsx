import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center rounded-md px-5 py-3 text-[0.95rem] font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-white hover:bg-[#182fc0]",
  ghost: "text-ink underline decoration-line decoration-1 underline-offset-[6px] hover:decoration-signal hover:text-signal",
};

export function CtaLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}
