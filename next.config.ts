import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // music-metadata (и его ESM-зависимости) исполняем в Node как есть,
  // не пропуская через бандлер — так разбор тегов в роуте загрузки треков
  // работает стабильно, а рантайм-node_modules из Docker их подхватывает.
  serverExternalPackages: ["music-metadata"],
};

export default nextConfig;
