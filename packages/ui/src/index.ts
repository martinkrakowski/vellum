// @vellum/ui — design-system foundation + reusable presentational components.
// Tokens live in ./styles/tokens.css (imported as CSS by the app root);
// theme.ts mirrors them as var() refs for TS/inline-style/canvas use.
export { cn } from "./lib/cn.js";
export { theme, type Theme, type ThemeColorGroup } from "./styles/theme.js";
export * from "./components/index.js";
