import { motion } from "motion/react";

interface SoundSelectorProps {
  sounds: Array<{ id: string; label: string; browser_path: string }>;
  selectedId: string;
  onChange: (id: string) => void;
}

export default function SoundSelector({
  sounds,
  selectedId,
  onChange,
}: SoundSelectorProps) {
  const selectedSound = sounds.find((s) => s.id === selectedId) ?? sounds[0];

  const handlePreview = () => {
    if (selectedSound) {
      void new Audio(selectedSound.browser_path).play();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-400">
          Alert Sound
        </label>
        <motion.button
          type="button"
          onClick={handlePreview}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-700/50 transition-colors hover:bg-zinc-800 hover:text-zinc-200 hover:ring-zinc-600/50"
          title="Preview alert sound"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Preview</span>
        </motion.button>
      </div>

      <motion.select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        whileFocus={{ scale: 1.01 }}
        className="w-full cursor-pointer rounded-xl border border-zinc-700/50 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-transparent transition-all duration-200 focus:border-emerald-500/50 focus:ring-emerald-500/20"
      >
        {sounds.map((sound) => (
          <motion.option
            key={sound.id}
            value={sound.id}
            whileHover={{ backgroundColor: "#27272a" }}
          >
            {sound.label}
          </motion.option>
        ))}
      </motion.select>
    </div>
  );
}
