/**
 * Build a text-to-image prompt for a **flat label texture**. The 3D viewport is
 * what should reveal curvature distortion — so the generated art must be a
 * straight-on, print-ready label, never a staged product mockup, and must carry
 * no text/logos (those are composited exactly in a later stage; generative
 * models can't render them legibly).
 */
export function buildLabelPrompt(prompt: string): string {
  return [
    "Flat, straight-on, print-ready product label artwork, graphic-design style.",
    prompt.trim(),
    "Decorative background art only — absolutely no text, words, letters, numbers, logos, barcodes, or watermarks.",
    "Centered composition, seamless left/right edges for wrapping, high detail, square 1:1 framing, no perspective, no product mockup.",
  ]
    .filter(Boolean)
    .join(" ");
}
