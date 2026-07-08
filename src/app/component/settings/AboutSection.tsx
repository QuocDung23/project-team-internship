import { Info } from '@phosphor-icons/react';
import SettingSection from './SettingSection';


interface AboutStat {
  value: string;
  label: string;
}

const ABOUT_STATS: AboutStat[] = [
  { value: 'v0.4.0', label: 'Phiên bản' },
  { value: 'Sentinel', label: 'Dự án' },
  { value: '12', label: 'Xe đang giám sát' },
  { value: 'Live', label: 'Trạng thái' },
];

export default function AboutSection() {
  return (
    <SettingSection
      title="Về ứng dụng"
      description="Thông tin phiên bản và hệ thống"
      icon={<Info size={18} weight="duotone" />}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ABOUT_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: 'var(--color-surface-2)' }}
          >
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--color-accent-active)' }}
            >
              {stat.value}
            </p>
            <p
              className="mt-1 text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </SettingSection>
  );
}
