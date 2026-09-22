import { Music2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** Обложка трека: картинка из базы либо аккуратная заглушка с нотой. */
export function TrackCover({
  coverImageId,
  size = 44,
  rounded = "rounded-lg",
  className,
  spinning = false,
}: {
  coverImageId: string | null;
  size?: number;
  rounded?: string;
  className?: string;
  spinning?: boolean;
}) {
  const dim = { width: size, height: size };
  if (coverImageId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/images/${coverImageId}`}
        alt=""
        style={dim}
        className={cn(
          "shrink-0 object-cover",
          rounded,
          spinning && "animate-[spin_8s_linear_infinite]",
          className,
        )}
        loading="lazy"
        draggable={false}
      />
    );
  }
  return (
    <div
      style={dim}
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-accent/25 to-accent/5 text-accent",
        rounded,
        className,
      )}
    >
      <Music2 size={Math.round(size * 0.42)} strokeWidth={1.75} />
    </div>
  );
}
