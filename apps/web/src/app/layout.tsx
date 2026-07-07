// tokens only until Tailwind is installed (phase 4.1) — globals.css
// contains @tailwind directives that would break the build today.
import "../styles/tokens.css";

import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
