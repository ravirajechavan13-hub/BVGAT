"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only in production (APK / hosted build) — dev me cache issues se bachne ke liye
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* offline cache optional — app bina iske bhi chalti hai */
        });
      };
      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register);
        return () => window.removeEventListener("load", register);
      }
    }
  }, []);

  return null;
}
