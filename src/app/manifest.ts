import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BVGAT Sagar Complex Store — Inventory",
    short_name: "BVGAT Store",
    description:
      "BVGAT Sagar Complex Store Inward, Outward & Stock Management. Inward Entry, Outward Entry, Main Stock, Monthly Excel Reports.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#15803d",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
