import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.bvgat.sagarstore.inventory",
  appName: "BVGAT Sagar Store",
  webDir: "out",
  // ────────────────────────────────────────────────────────────────
  // APK is hosted web app ko load karta hai (database server-side hai)
  // Apna live hosting URL yahan daalo — jaise:
  //   "https://bvgat-sagar-store.vercel.app"
  // Jitna bhi URL par app live ho, wahi yahan likho.
  // ────────────────────────────────────────────────────────────────
  server: {
    androidScheme: "https",
    // url: "https://YOUR-LIVE-APP-URL.com",
  },
  android: {
    allowMixedContent: false,
  },
  backgroundColor: "#f8fafc",
};

export default config;
