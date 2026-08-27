import type { NextConfig } from "next";

// APK build (GitHub Actions / local) me `NEXT_APK_BUILD=1` set karke build karo —
// tab static export banega jo APK ke andar embed hota hai.
// Normal web hosting build me bina iske build karo.
const isApkBuild = process.env.NEXT_APK_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isApkBuild ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
