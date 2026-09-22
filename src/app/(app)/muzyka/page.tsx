import { getTracks } from "@/lib/music-queries";
import { MusicLibrary } from "@/components/app/MusicLibrary";

export const metadata = { title: "Музыка" };
export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const tracks = await getTracks();
  return <MusicLibrary initialTracks={tracks} />;
}
