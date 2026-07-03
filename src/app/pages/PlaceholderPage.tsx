import type { ReactNode } from "react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  hint?: string;
  icon?: ReactNode;
}

export function PlaceholderPage({
  title,
  description,
  hint,
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="panel flex max-w-lg flex-col items-center gap-4 px-8 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 text-zinc-400 ring-1 ring-hairline">
          {icon}
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            {title}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>
        {hint && (
          <p className="rounded-md border border-dashed border-hairline bg-surface-2/60 px-3 py-2 text-[11px] text-zinc-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
