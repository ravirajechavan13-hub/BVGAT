import type { CapacitorConfig } from "@capacitor/cli";

// APK me app poori embedded hoti hai (static export) — koi server/URL zaroori nahi.
// Data Google Sheet me save hota hai (app ke andar 🟢 Sheet button se connect karo).
const config: CapacitorConfig = {
  appId: "in.bvgat.sagarstore.inventory",
  appName: "BVGAT Sagar Store",
  webDir: "out",
  server: {
    allowNavigation: [
      "script.google.com",
      "script.googleusercontent.com",
      "*.googleusercontent.com",
    ],
  },
  android: {
    allowMixedContent: false,
  },
  backgroundColor: "#f8fafc",
};

export default config;
