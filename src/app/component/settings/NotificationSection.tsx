import { Bell } from '@phosphor-icons/react';
import SettingSection from './SettingSection';
import ToggleSwitch from './ToggleSwitch';


export interface NotificationPreferences {
  critical: boolean;
  warning: boolean;
  daily: boolean;
  sound: boolean;
}

interface NotificationSectionProps {
  notifications: NotificationPreferences;
  onChange: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => void;
}

export default function NotificationSection({
  notifications,
  onChange,
}: NotificationSectionProps) {
  return (
    <SettingSection 
      title="Thông báo"
      description="Cấu hình các kênh và loại thông báo nhận được."
      icon={<Bell size={18} weight="duotone" />}
    >
      <div className="space-y-5">
        <ToggleSwitch
          label="Cảnh báo nguy hiểm"
          description="Thông báo ngay khi phát hiện hành vi nguy hiểm"
          enabled={notifications.critical}
          onChange={(v) => onChange('critical', v)}
        />
        <ToggleSwitch
          label="Cảnh báo nhắc nhở"
          description="Thông báo khi tài xế có dấu hiệu mệt mỏi"
          enabled={notifications.warning}
          onChange={(v) => onChange('warning', v)}
        />
        <ToggleSwitch
          label="Báo cáo hàng ngày"
          description="Gửi tổng kết hoạt động mỗi cuối ca làm việc"
          enabled={notifications.daily}
          onChange={(v) => onChange('daily', v)}
        />
        <ToggleSwitch
          label="Âm thanh thông báo"
          description="Phát âm thanh khi có cảnh báo mới"
          enabled={notifications.sound}
          onChange={(v) => onChange('sound', v)}
        />
      </div>
    </SettingSection>
  );
}
