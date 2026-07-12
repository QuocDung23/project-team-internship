import { VideoCameraSlash } from "@phosphor-icons/react";

interface CabinCamProps {
  streamUrl: string;
  hasFrame: boolean;
  isStale: boolean;
}

export function CabinCam({ streamUrl, hasFrame, isStale }: CabinCamProps) {
  return (
    <section className="panel mx-auto w-full max-w-[640px] overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-zinc-950">
        {hasFrame && (
          <img
            src={streamUrl}
            className="absolute inset-0 h-full w-full object-contain"
            alt="Detector camera stream"
          />
        )}
        {!hasFrame && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950 text-zinc-500">
            <VideoCameraSlash size={28} weight="duotone" />
            <span className="text-xs font-medium">Waiting for detector stream</span>
          </div>
        )}
        {hasFrame && isStale && (
          <div className="absolute inset-x-3 top-3 rounded-md border border-amber-400/40 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-amber-200 shadow-lg">
            Detector feed stopped updating
          </div>
        )}
      </div>
    </section>
  );
}
