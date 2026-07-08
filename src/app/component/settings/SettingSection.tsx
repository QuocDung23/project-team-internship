import type { ReactNode } from 'react';

interface SettingSectionProps {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}

export default function SettingSection({ title, description, icon, children }: SettingSectionProps) {
  return (
    <section
      className="rounded-2xl border backdrop-blur-sm transition-all"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-hairline)',
      }}
    >
      <div
        className="flex items-center gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-accent-active)',
          }}
        >
          {icon}
        </div>
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h2>
          {description && (
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
