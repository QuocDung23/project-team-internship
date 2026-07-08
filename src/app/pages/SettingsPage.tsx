'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '../component/providers/ThemeProvider';
import type { Theme } from '../utils/themeColor';
import ThresholdSection, { ThresholdPreferences } from '../component/settings/ThresholdSection';
import NotificationSection, { NotificationPreferences } from '../component/settings/NotificationSection';
import ThemeSection from '../component/settings/ThemeSection';
import AboutSection from '../component/settings/AboutSection';


export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<Theme | 'system'>(
    theme === 'dark' ? 'dark' : 'light'
  );
  const [preferences, setPreferences] = useState<ThresholdPreferences>({
    earWarn: 0.22,
    earCritical: 0.16,
    marWarn: 0.55,
    marCritical: 0.70,
    pitchWarn: 20,
    pitchCritical: 28,
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    critical: true,
    warning: true,
    daily: false,
    sound: true,
  });

  const handleThemeSelect = useCallback(
    (value: Theme | 'system') => {
      setSelectedTheme(value);
      if (value === 'system') {
        // For system, we'll set light as default when detected
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      } else {
        setTheme(value);
      }
    },
    [setTheme]
  );

  const updatePreference = useCallback(
    <K extends keyof ThresholdPreferences>(key: K, value: ThresholdPreferences[K]) => {
      setPreferences((p) => ({ ...p, [key]: value }));
    },
    []
  );

  const updateNotification = useCallback(
    <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
      setNotifications((p) => ({ ...p, [key]: value }));
    },
    []
  );

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
      {/* Page Header */}
      <div className="mb-2">
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Cài đặt
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Tuỳ chỉnh giao diện, ngưỡng cảnh báo và thông báo theo nhu cầu vận hành.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Theme Section */}
        <div className="lg:col-span-2">
          <ThemeSection selectedTheme={selectedTheme} onSelect={handleThemeSelect} />
        </div>

        {/* Threshold Settings */}
        <ThresholdSection preferences={preferences} onChange={updatePreference} />

        {/* Notification Settings */}
        <NotificationSection notifications={notifications} onChange={updateNotification} />
      </div>

      {/* About Section */}
      <AboutSection />

      {/* Footer */}
      <footer
        className="mt-4 flex items-center justify-between border-t pt-4 text-[11px]"
        style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-text-tertiary)' }}
      >
        <span>Sentinel Fleet Console</span>
        <span>Phát triển bởi đội ngũ kỹ thuật nội bộ</span>
      </footer>
    </div>
  );
}
