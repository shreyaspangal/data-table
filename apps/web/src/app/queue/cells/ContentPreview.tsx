"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ContentPreview({
  thumbnailUrl,
  excerpt,
}: {
  thumbnailUrl: string;
  excerpt: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "size-8 shrink-0 overflow-hidden rounded bg-secondary",
          imageFailed &&
            "flex items-center justify-center text-[9px] text-muted-foreground",
        )}
      >
        {imageFailed ? (
          "N/A"
        ) : (
          // biome-ignore lint/performance/noImgElement: fixture thumbnailUrl (picsum.photos) is throwaway; next/image needs a remotePatterns entry that'd be dead config until Step 8's real image host.
          <img
            src={thumbnailUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
      </span>
      <span className="min-w-0 truncate">{excerpt}</span>
    </span>
  );
}
