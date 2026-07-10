import { VideoCameraSlash } from "@phosphor-icons/react";

interface CabinCamProps {
  streamUrl: string;
  hasSnapshot: boolean;
}

export function CabinCam({ streamUrl, hasSnapshot }: CabinCamProps) {
  return (
    <section className="panel mx-auto w-full max-w-[640px] overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-zinc-950">
        <img
          src={streamUrl}
          className="absolute inset-0 h-full w-full object-contain"
          alt="Detector camera stream"
        />
        {!hasSnapshot && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950 text-zinc-500">
            <VideoCameraSlash size={28} weight="duotone" />
            <span className="text-xs font-medium">Waiting for detector stream</span>
          </div>
        )}
      </div>
    </section>
  );
}
