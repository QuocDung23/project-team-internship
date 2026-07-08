interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

export default function SliderControl({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit = '',
  description,
  onChange,
}: SliderControlProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {label}
          </label>
          {description && (
            <p
              className="mt-0.5 text-[10px]"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {description}
            </p>
          )}
        </div>
        <div
          className="rounded-lg px-2.5 py-1 font-mono text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-accent-active)',
          }}
        >
          {value.toFixed(2)}{unit}
        </div>
      </div>

      {/* Custom Slider */}
      <div className="relative h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <div
          className="absolute h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: 'var(--color-accent-active)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition-transform hover:scale-110"
          style={{
            left: `${percentage}%`,
            backgroundColor: 'var(--color-accent-active)',
            boxShadow: `0 2px 8px rgba(16, 185, 129, 0.4)`,
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
