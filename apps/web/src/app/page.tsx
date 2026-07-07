import { ReviewSession } from "./ReviewSession";

export default function HomePage() {
  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            Vellum
          </span>
          <span className="text-xs text-text-secondary">
            spatial human-in-the-loop review
          </span>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          demo · mocked pipeline
        </span>
      </header>
      <ReviewSession />
    </main>
  );
}
