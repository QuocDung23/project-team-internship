import { Palette, Sun, Moon, Monitor } from '@phosphor-icons/react';
import type { Theme } from '../../utils/themeColor';
import SettingSection from './SettingSection';
import ThemeOption from './ThemeOption';

interface ThemeSectionProps {
  selectedTheme: Theme | 'system';
  onSelect: (value: Theme | 'system') => void;
}

export default function ThemeSection({ selectedTheme, onSelect }: ThemeSectionProps) {
  return (
    <SettingSection
      title="Giao diện"
      description="Chọn chế độ hiển thị phù hợp với môi trường làm việc."
      icon={<Palette size={18} weight="duotone" />}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            value="light"
            label="Sáng"
            icon={<Sun size={22} weight="duotone" />}
            description="Phù hợp môi trường ánh sáng tự nhiên"
            isSelected={selectedTheme === 'light'}
            onSelect={onSelect}
          />
          <ThemeOption
            value="dark"
            label="Tối"
            icon={<Moon size={22} weight="duotone" />}
            description="Giảm mỏi mắt khi làm việc đêm"
            isSelected={selectedTheme === 'dark'}
            onSelect={onSelect}
          />
          <ThemeOption
            value="system"
            label="Hệ thống"
            icon={<Monitor size={22} weight="duotone" />}
            description="Tự động theo cài đặt thiết bị"
            isSelected={selectedTheme === 'system'}
            onSelect={onSelect}
          />
        </div>
      </div>
    </SettingSection>
  );
}
