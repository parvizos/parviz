import { areaColor } from "@/lib/task-format";
import { cn } from "@/lib/cn";

/**
 * Логотип организации: картинка, если загружена; иначе цветная плитка
 * с эмодзи (иконкой организации или дефолтом по типу).
 */
export function OrgLogo({
  logo,
  emoji,
  color,
  size = 48,
  className = "",
}: {
  logo?: string | null;
  emoji: string;
  color?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  const radius = Math.max(8, Math.round(size * 0.28));
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        style={{ ...dim, borderRadius: radius }}
        className={cn("shrink-0 object-cover", className)}
      />
    );
  }
  const tone = areaColor(color);
  return (
    <div
      style={{
        ...dim,
        borderRadius: radius,
        background: `color-mix(in oklab, ${tone} 16%, transparent)`,
        color: tone,
        fontSize: Math.round(size * 0.42),
      }}
      className={cn(
        "flex shrink-0 items-center justify-center leading-none",
        className,
      )}
    >
      {emoji}
    </div>
  );
}
