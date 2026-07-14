interface TextFieldProps {
  label: string;
  value: string;
  placeholder: string;
  maxLength?: number;
  readOnly?: boolean;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  value,
  placeholder,
  maxLength,
  readOnly = false,
  onChange,
}: TextFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] text-zinc-400">
      <span className="font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <span className="field-surface flex items-center px-3 py-2.5">
        <input
          value={value}
          maxLength={maxLength}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 read-only:text-zinc-300 read-only:cursor-default"
        />
      </span>
      {maxLength ? (
        <span className="mt-0.5 font-mono-num text-[10px] text-zinc-600 tabular-nums">
          {value.length}/{maxLength}
        </span>
      ) : null}
    </label>
  );
}