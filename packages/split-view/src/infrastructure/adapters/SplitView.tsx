"use client";

import type { ReactNode } from "react";

/**
 * The demo's primary argument, made of two panes: the raw AI texture
 * exactly as 2D review would sign it off, beside the same texture on
 * real geometry. No narration required — the contrast is the point.
 */
export function SplitView({
  flat,
  spatial,
}: {
  flat: ReactNode;
  spatial: ReactNode;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
      <section
        aria-label="Flat AI output"
        className="relative flex min-h-0 flex-col bg-surface"
      >
        <header className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
          Flat output — what 2D review sees
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          {flat}
        </div>
      </section>
      <section
        aria-label="Applied to 3D geometry"
        className="relative flex min-h-0 flex-col bg-surface"
      >
        <header className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
          On geometry — what actually ships
        </header>
        <div className="relative min-h-0 flex-1">{spatial}</div>
      </section>
    </div>
  );
}
