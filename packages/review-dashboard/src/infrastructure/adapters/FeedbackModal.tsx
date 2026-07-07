"use client";

import { KNOWN_CATEGORIES, validateFeedback } from "@vellum/feedback-domain";
import type { FeedbackCategory, FeedbackPayload } from "@vellum/scene-types";
import { useState } from "react";

const CATEGORY_COPY: Record<
  FeedbackCategory,
  { title: string; consequence: string }
> = {
  UV_DISTORTION: {
    title: "UV distortion",
    consequence:
      "Next run applies a corrective texture transform (repeat / offset).",
  },
  OTHER: {
    title: "Other",
    consequence:
      "Next run regenerates the texture; the mapping stays untouched.",
  },
};

/**
 * Structured rejection — the category is a contract about what happens
 * next, not a label, so each option states its consequence. Validation
 * runs through feedback-domain before the machine ever sees a REJECT.
 */
export function FeedbackModal({
  open,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onSubmit: (feedback: FeedbackPayload) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("UV_DISTORTION");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    const result = validateFeedback({
      category,
      note,
      createdAt: new Date().toISOString(),
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    setNote("");
    onSubmit(result.value);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reject with structured feedback"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-text-primary">
          Reject this attempt
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The category determines the correction — choose what actually
          failed.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Feedback category</legend>
          {KNOWN_CATEGORIES.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-md border p-3 transition-colors ${
                category === value
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-text-secondary"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <input
                  type="radio"
                  name="category"
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                  className="accent-[var(--color-brand-primary)]"
                />
                {CATEGORY_COPY[value].title}
              </span>
              <span className="pl-6 text-xs text-text-secondary">
                {CATEGORY_COPY[value].consequence}
              </span>
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-text-primary">
            What did you see?
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={error ? true : undefined}
            rows={3}
            placeholder="e.g. The measurement grid smears across the shoulder bevel."
            className={`mt-1 w-full rounded-md border bg-surface p-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] ${
              error ? "border-error" : "border-border"
            }`}
          />
        </label>
        {error && (
          <p role="alert" className="mt-1 text-xs text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-error px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Reject &amp; regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
