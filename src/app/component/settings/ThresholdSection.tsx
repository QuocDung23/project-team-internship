import { Warning } from '@phosphor-icons/react';
import SettingSection from './SettingSection';
import SliderControl from './SliderControl';


export interface ThresholdPreferences {
  earWarn: number;
  earCritical: number;
  marWarn: number;
  marCritical: number;
  pitchWarn: number;
  pitchCritical: number;
}

interface ThresholdSectionProps {
  preferences: ThresholdPreferences;
  onChange: <K extends keyof ThresholdPreferences>(
    key: K,
    value: ThresholdPreferences[K]
  ) => void;
}

export default function ThresholdSection({ preferences, onChange }: ThresholdSectionProps) {
  return (
    <SettingSection
      title="Ngưỡng cảnh báo"
      description="Điều chỉnh giá trị ngưỡng cho từng chỉ số giám sát."
      icon={<Warning size={18} weight="duotone" />}
    >
      <div className="space-y-6">
        {/* EAR */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: 'var(--color-accent-active)' }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              EAR (Eye Aspect Ratio)
            </span>
          </div>
          <SliderControl
            label="Ngưỡng Cảnh báo"
            value={preferences.earWarn}
            min={0.10}
            max={0.35}
            description="Giá trị thấp hơn = buồn ngủ"
            onChange={(v) => onChange('earWarn', v)}
          />
          <SliderControl
            label="Ngưỡng Nguy hiểm"
            value={preferences.earCritical}
            min={0.08}
            max={0.25}
            description="Cảnh báo khẩn cấp khi vượt ngưỡng"
            onChange={(v) => onChange('earCritical', v)}
          />
        </div>

        <div className="border-t" style={{ borderColor: 'var(--color-hairline)' }} />

        {/* MAR */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: 'var(--color-accent-warn)' }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              MAR (Mouth Aspect Ratio)
            </span>
          </div>
          <SliderControl
            label="Ngưỡng Cảnh báo"
            value={preferences.marWarn}
            min={0.40}
            max={0.80}
            description="Giá trị cao hơn = ngáp nhiều"
            onChange={(v) => onChange('marWarn', v)}
          />
          <SliderControl
            label="Ngưỡng Nguy hiểm"
            value={preferences.marCritical}
            min={0.50}
            max={0.90}
            onChange={(v) => onChange('marCritical', v)}
          />
        </div>

        <div className="border-t" style={{ borderColor: 'var(--color-hairline)' }} />

        {/* PITCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: 'var(--color-accent-critical)' }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Góc nghiêng đầu (Pitch)
            </span>
          </div>
          <SliderControl
            label="Ngưỡng Cảnh báo"
            value={preferences.pitchWarn}
            min={10}
            max={35}
            step={1}
            unit="°"
            description="Độ lệch góc so với trục thẳng đứng"
            onChange={(v) => onChange('pitchWarn', v)}
          />
          <SliderControl
            label="Ngưỡng Nguy hiểm"
            value={preferences.pitchCritical}
            min={15}
            max={40}
            step={1}
            unit="°"
            onChange={(v) => onChange('pitchCritical', v)}
          />
        </div>
      </div>
    </SettingSection>
  );
}
