import { Gear } from "@phosphor-icons/react";
import { PlaceholderPage } from "./PlaceholderPage";

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Cài đặt"
      description="Ngưỡng EAR / MAR / Pitch, âm lượng cảnh báo và các tuỳ chọn hiển thị sẽ nằm ở đây."
      hint="Sẽ đọc / ghi vào một user-prefs store riêng."
      icon={<Gear size={22} weight="duotone" />}
    />
  );
}