"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { QueueRow } from "../columns";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

// Per the RADIO doc's known seed artifact: a "reviewing" row created by
// Step 8's one write (pending -> reviewing) won't have an assignee yet,
// even though other reviewing rows do -- name/avatarUrl are both null in
// that case, not a bug to guard against with a crash, just a real state
// to render sensibly.
export function AssigneeAvatar({
  name,
  avatarUrl,
}: {
  name: QueueRow["assigneeName"];
  avatarUrl: QueueRow["assigneeAvatarUrl"];
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!name) {
    return <span className="text-muted-foreground">Unassigned</span>;
  }

  const showImage = avatarUrl && !imageFailed;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground",
        )}
      >
        {showImage ? (
          // biome-ignore lint/performance/noImgElement: fixture avatarUrl (i.pravatar.cc) is throwaway; next/image needs a remotePatterns entry that'd be dead config until Step 8's real image host.
          <img
            src={avatarUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          initials(name)
        )}
      </span>
      {name}
    </span>
  );
}
