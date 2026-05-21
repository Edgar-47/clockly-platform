import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { TutorialScreenshot as TutorialScreenshotData } from "@/lib/tutorials";

interface TutorialScreenshotProps {
  screenshot: TutorialScreenshotData;
}

export function TutorialScreenshot({ screenshot }: TutorialScreenshotProps) {
  if (screenshot.imageSrc) {
    return (
      <figure className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
        <Image
          src={screenshot.imageSrc}
          alt={screenshot.label}
          width={1280}
          height={720}
          className="aspect-video w-full object-cover"
        />
        <figcaption className="border-t border-border px-4 py-3 text-[12px] text-ink-muted">
          {screenshot.description}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="rounded-2xl border border-dashed border-border-strong bg-white p-3 shadow-xs">
      <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface-gradient">
        <div className="flex h-9 items-center gap-1.5 border-b border-border bg-white/90 px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-light/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning-light/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-success-light/80" />
          <span className="ml-2 h-2 w-24 rounded-full bg-surface-bg" />
        </div>
        <div className="flex h-[calc(100%-2.25rem)] flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white text-ink-xmuted shadow-xs">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink">{screenshot.label}</p>
            <p className="mt-1 max-w-md text-[13px] leading-5 text-ink-muted">
              {screenshot.description}
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}
