import { Check } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { Theme } from '../../utils/themeColor';

interface ThemeOptionProps {
  value: Theme | 'system';
  label: string;
  icon: ReactNode;
  description: string;
  isSelected: boolean;
  onSelect: (value: Theme | 'system') => void;
}

export default function ThemeOption({
  value,
  label,
  icon,
  description,
  isSelected,
  onSelect,
}: ThemeOptionProps) {
  return (
    <button
      onClick={() => onSelect(value)}
      className="group relative flex flex-1 flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        backgroundColor: isSelected ? 'var(--color-surface-2)' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--color-accent-active)' : 'var(--color-hairline)'}`,
      }}
    >
      {/* Selection indicator */}
      <div
        className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 ${
          isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
        style={{ backgroundColor: 'var(--color-accent-active)' }}
      >
        <Check size={12} weight="bold" className="text-white" />
      </div>

      {/* Icon */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"
        style={{
          backgroundColor: isSelected
            ? 'var(--color-accent-active)'
            : 'var(--color-surface-elevated)',
          color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
      </span>

      {/* Description */}
      <span
        className="text-[10px] text-center leading-relaxed"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {description}
      </span>
    </button>
  );
}
