import { areaColor } from "@/lib/task-format";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Аватар человека: фото, если загружено; иначе цветной кружок с эмодзи или буквой. */
export function Avatar({
  name,
  avatar,
  icon,
  color,
  size = 44,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  icon?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={name}
        style={dim}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={{
        ...dim,
        fontSize: Math.round(size * (icon ? 0.44 : 0.38)),
        background: `color-mix(in oklab, ${areaColor(color)} 18%, transparent)`,
        color: areaColor(color),
      }}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${className}`}
    >
      {icon || initial(name)}
    </div>
  );
}
