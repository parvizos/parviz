import type { CSSProperties } from "react";

/** Пресеты обложек страниц — вкусные градиенты. */
export const COVER_GRADIENTS: string[] = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#30cfd0,#330867)",
  "linear-gradient(135deg,#ff9a9e,#fecfef)",
  "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#5ee7df,#b490ca)",
  "linear-gradient(120deg,#1e3c72,#2a5298)",
  "linear-gradient(135deg,#0ba360,#3cba92)",
  "linear-gradient(135deg,#232526,#414345)",
];

/** Стиль баннера обложки: градиент — как background, URL — как картинку. */
export function coverStyle(cover: string): CSSProperties {
  const isGradient =
    cover.startsWith("linear-gradient") || cover.startsWith("radial-gradient");
  return isGradient
    ? { background: cover }
    : {
        backgroundImage: `url("${cover}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
}
