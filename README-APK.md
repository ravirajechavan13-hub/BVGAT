# 📱 BVGAT Sagar Store — Android APK Banane Ki Puri Guide

Ye project ab **Capacitor** se Android APK ready hai. APK aapke **live web app** ko ek native
Android app ki tarah load karta hai (app icon, name, fullscreen — sab native jaisa).

> **Zaroori:** Is app ka database (PostgreSQL) server par chalta hai, isliye APK ko app ka
> **live URL** chahiye. Pehle web app kahin live karo (Vercel free me 1 minute me ho jata hai),
> phir APK banao.

---

## ✅ Step 1 — Web App Live Karo (ek baar)

1. Poora project **GitHub par push** karo:
   ```bash
   git init
   git add .
   git commit -m "BVGAT Sagar Store Inventory App"
   git branch -M main
   git remote add origin https://github.com/AAPKA-USERNAME/bvgat-sagar-store.git
   git push -u origin main
   ```
2. **vercel.com** par jao → GitHub se import karo → Deploy dabao
3. Aapko URL milega jaise: `https://bvgat-sagar-store.vercel.app`
4. Browser me kholein — app chale to aage badho ✓

> **Note:** Database bhi hosting par chahiye. Vercel par PostgreSQL connect karne ke liye
> free [Neon](https://neon.tech) ya [Supabase](https://supabase.com) use karo — unki
> connection string ko project ke `.env` me `DATABASE_URL` me daalo (Vercel dashboard me
> Environment Variables section).

---

## ✅ Step 2 — Apna URL Capacitor Config Me Daalo

File: **`capacitor.config.ts`**

```ts
server: {
  androidScheme: "https",
  url: "https://bvgat-sagar-store.vercel.app",  // ← YAHAN APNA URL DAALO
},
```

> ⚠️ Ye sabse zaroori step hai — APK isi URL ko kholta hai. URL change karne par APK dobara banana padega.

Uske baad GitHub par dobara push karo:
```bash
git add capacitor.config.ts
git commit -m "APK live URL set"
git push
```

---

## 📥 Step 3A — APK Download (SABSE EASY — Bina Computer Setup)

1. GitHub repo me jao → **Actions** tab (upar menu)
2. **"Build Android APK"** workflow dekho — push karte hi khud chalu hota hai (3–5 min)
3. Green ✅ aane par run par click karo
4. Niche **Artifacts** me `BVGAT-Sagar-Store-APK` dikhega → click → **Download**
5. `app-debug.apk` phone me bhejo (WhatsApp/Drive)
6. Phone me file par tap → **"Unknown sources allow"** karo → **Install** ✅

**Har baar code change karke APK chahiye?** Bas `git push` karo — Actions me naya APK ready
ho jayega, usi tarah download karo. Purana phone par overwrite install ho jata hai.

---

## 🛠️ Step 3B — APK Local Par Banao (Android Studio se)

Agar apne computer par banana hai:

1. Install karo: **Node.js** (nodejs.org) + **Android Studio** (developer.android.com)
2. Project folder me chalo:
   ```bash
   npm install
   npx cap sync android
   ```
3. Android Studio me kholo:
   ```bash
   ./gradlew --stop
   ```
   ya Android Studio → *Open* → `android` folder select karo
4. Build dabao: **Build → Build App Bundle(s)/APK(s) → Build APK(s)**
5. APK milega: `android/app/build/outputs/apk/debug/app-debug.apk`
6. Phone me copy karke install ✅

> **Release (Play Store ke liye) APK** banane ke liye Android Studio me
> *Build → Generate Signed App Bundle / APK* — ye baad me Play Store upload karna ho tab karna.

---

## 📌 APK Ki Khasiyaten (Pehle Se Ready)

| Feature | Status |
|---|---|
| App name: **BVGAT Sagar Store** | ✅ |
| App icon (green box) | ✅ |
| **Offline data cache** — net na ho to last data dikhega | ✅ (Service Worker) |
| Fullscreen native feel (PWA standalone) | ✅ (manifest) |
| Push karte hi naya APK (GitHub Actions) | ✅ |
| Phone me install bina Play Store ke (sideload) | ✅ |

---

## 🔧 Agar APK Khulte Hi Pichla Data Dikha (Offline Cache)

Offline cache last load hui data store karta hai. Net aa jaye to agle refresh par
fresh data aayega. Cache saaf karne ke liye APK me browser devtools nahi hote,
isliye bas app close karke dobara kholo (network ho toh fresh load hoga).

---

## ❓ Common Problems

**❌ "Error: Unable to access jarfile .../gradle/wrapper/gradle-wrapper.jar"**
→ Ye isliye aata hai kyunki `gradle-wrapper.jar` (binary file) GitHub par push nahi hui.
Do tarike se fix:
1. **Naya workflow (ye wala) use karo** — agar jar missing hai to khud download kar leta hai.
   `.github/workflows/android-apk.yml` file ko apne repo me copy karo, push karo.
2. **Jar file ko force-commit karo** (permanent fix):
   ```bash
   git add -f android/gradle/wrapper/gradle-wrapper.jar
   git add android/gradlew
   git commit -m "Add missing gradle wrapper jar"
   git push
   ```
   Apne `.gitignore` me check karo — agar `*.jar` likha hai to use hatao,
   warna jar file hamesha chhootti rahegi.

**APK me blank page / error dikhe?**
→ `capacitor.config.ts` me URL sahi hai ya nahi check karo. URL `https` wala hona chahiye.
`server: { url: "https://..." }` wali line comment se hatayi ho ya nahi — wo hi URL APK kholta hai.

**Actions workflow red ✗ aaya?**
→ Run kholke "Run details" me har step ka log dekho. Naye workflow me JDK 17 pehle se set hai
aur jar auto-download hota hai — dono common errors cover ho gaye hain.

**App update kaise hoga jab main code change karun?**
→ (a) Web app dobara deploy karo (Vercel par auto hota hai push par)
→ (b) `git push` karo → Actions se naya APK download → phone par install
→ Data DB me server par hai, isliye **koi data nahi jayega** — bas naya app version.
