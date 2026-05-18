import type { ReactNode } from "react";

export function Card({
  title,
  eyebrow,
  children,
  className = "",
  id,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm ring-1 ring-kastros-forest/[0.02] ${className}`}
    >
      {eyebrow ? <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kastros-brandGreen">{eyebrow}</p> : null}
      {title ? <h2 className={`font-display text-lg font-semibold text-kastros-forest ${eyebrow ? "mt-2" : ""}`}>{title}</h2> : null}
      <div className={title || eyebrow ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
