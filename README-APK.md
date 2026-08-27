# 📱 BVGAT Sagar Store — APK + Google Sheet Guide

Ab ye app **bilkul simple** hai:
- ❌ Koi server nahi, koi database hosting nahi
- ✅ **Data aapki Google Sheet me** save hota hai (phone/PC se kabhi bhi dekho, HR ko bhi bhejo)
- ✅ **APK me app poori andar hai** — internet ke bina bhi khulti hai (offline), data sheet me sync hota hai jab net aata hai

---

# PART 1 — GOOGLE SHEET SETUP (ek baar ka kaam, 10 minute)

### Step 1: Naya Sheet banao
1. Phone ya PC par **[sheets.new](https://sheets.new)** kholo
2. Naam rakho: **BVGAT Store**
3. Bas itna hi — tabs/kolnams script khud bana legi

### Step 2: Apps Script lagao
1. Sheet me menu → **Extensions → Apps Script** kholo
2. Jo code editor khule wahan saara purana code delete karke **neeche wala code paste karo**
3. Upar **Save** (💾) dabao

```javascript
const HEADERS = {
  Inward: ["id","invoiceNo","invoiceDate","docType","inwardNo","inwardDate","partyName","address","contactPerson","contactNumber","vehicleNo","docketNo","category","dispatchLocation","district","productId","productName","packingSize","cases","quantity"],
  Outward: ["id","invoiceNo","invoiceDate","docType","outwardNo","outwardDate","partyName","address","contactPerson","contactNumber","vehicleNo","docketNo","category","dispatchLocation","district","productId","productName","packingSize","cases","quantity"],
  MainStock: ["productId","directStock"],
};

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var hdr = HEADERS[name];
  var first = sh.getRange(1, 1, 1, hdr.length).getValues()[0];
  if (String(first[0]) !== hdr[0]) {
    sh.clear();
    sh.getRange(1, 1, 1, hdr.length).setValues([hdr]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function read_(name) {
  var sh = sheet_(name);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var hdr = HEADERS[name];
  var values = sh.getRange(2, 1, lastRow - 1, hdr.length).getValues();
  return values.map(function (row) {
    var o = {};
    hdr.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

function appendRows_(name, rows) {
  var sh = sheet_(name);
  var hdr = HEADERS[name];
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, hdr.length).setValues(
    rows.map(function (r) { return hdr.map(function (h) { return r[h] !== undefined ? r[h] : ""; }); })
  );
}

function removeRow_(name, id) {
  var sh = sheet_(name);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = lastRow - 1; i >= 1; i--) {
    if (Number(String(ids[i][0])) === Number(id)) sh.deleteRow(i + 1);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return json_({ inwards: read_("Inward"), outwards: read_("Outward"), mainStock: read_("MainStock") });
}

function doPost(e) {
  var req = JSON.parse(e.postData.contents);
  switch (req.action) {
    case "saveInward": appendRows_("Inward", req.entries); return json_({ ok: true });
    case "saveOutward": appendRows_("Outward", req.entries); return json_({ ok: true });
    case "deleteInward": removeRow_("Inward", req.id); return json_({ ok: true });
    case "deleteOutward": removeRow_("Outward", req.id); return json_({ ok: true });
    case "setDirectStock":
      var sh = sheet_("MainStock");
      var lastRow = sh.getLastRow();
      var found = false;
      if (lastRow >= 2) {
        var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 1; i < ids.length; i++) {
          if (Number(String(ids[i][0])) === Number(req.productId)) {
            sh.getRange(i + 1, 2).setValue(req.directStock);
            found = true; break;
          }
        }
      }
      if (!found) sh.appendRow([req.productId, req.directStock]);
      return json_({ ok: true });
    default: return json_({ ok: false, error: "Unknown action" });
  }
}
```

### Step 3: Web App Deploy karo
1. Apps Script me **Deploy → New deployment**
2. Gear icon (⚙️) → **Web app** select karo
3. Settings:
   - **Execute as:** `Me (aapka Gmail)`
   - **Who has access:** `Anyone` ← **ye zaroori hai!**
4. **Deploy** dabao → apne account allow karo
5. Jo **Web app URL** mile (jaise `https://script.google.com/macros/s/XXXXX/exec`) use **copy** karo

✅ **Google Sheet setup khatam!** Ab aapki sheet me 3 tabs ban chuke hain: Inward, Outward, MainStock

---

# PART 2 — APK BANAO (GitHub se, 5 minute)

1. Poora project **GitHub par push** karo (ravigajechavan13-hub/inventory-app — ya naya repo)
2. `.github/workflows/android-apk.yml` file repo me honi chahiye (project me hai)
3. **Actions** tab kholo → **"Build Android APK"** workflow khud chalega (5–8 min)
4. Green ✅ aane par → run kholo → **Artifacts** → `BVGAT-Sagar-Store-APK` → **Download**
5. `app-debug.apk` phone me bhejo → tap → **Unknown sources allow** → **Install** ✅

> Pichli baar ka "jarfile" error bhi fix hai — workflow ab wrapper jar khud download karta hai.

## ⚠️ APK Banne Nahi A raha tha? Ab ye bhi check karo
- Repo me **`android/` folder** hona chahiye (project ke saath push hua hai)
- `gradle/wrapper/gradle-wrapper.jar` na ho to koi nahi — workflow khud download karta hai
- Node version 20, JDK 17 — workflow me pehle se set hai

---

# PART 3 — APP KO SHEET SE CONNECT KARO (phone par, 1 minute)

1. APK install karke kholo
2. Upar **📗 "Sheet Not Connected"** button dabao (mobile par header ke neeche)
3. Apna **Web App URL** paste karo (Part 1 Step 3 wala)
4. **Test & Connect** dabao → green "Connected!" message aayega
5. Done! Ab saara data Google Sheet me jayega

**Har entry save hote hi** sheet me dikhegi — `BVGAT Store` sheet kholke dekho:
- **Inward** tab → saari inward entries (wahi columns jo purani Excel me the)
- **Outward** tab → saari outward entries
- **MainStock** tab → jo main stock daala hai

**HR ko bhejna ho to:** Sheet ka link bhej do, ya app se Monthly Excel Report download karke bhejo — dono ready hain.

---

# 📋 Kaise Kaam Karta Hai

| Cheez | Kahan Save |
|---|---|
| Inward/Outward entries | Google Sheet (Inward / Outward tabs) |
| Main Stock | Google Sheet (MainStock tab) |
| Offline (net na ho) | Phone ke andar (localStorage) — net aane par sheet me mil jata hai |
| Products list (205 items) | APK ke andar hi (sheet me nahi jaati) |

- **Internet na ho** → app phone me data save karegi, toast me likha aayega "phone me save hua"
- **Net aane par** → app khulte hi sheet se fresh data le aayegi
- **Data kahin nahi jayega** — ye aapki apni Google Sheet hai

---

# ❓ Common Problems

**"Sheet Not Connected" rahe / connect na ho?**
1. URL `https://script.google.com/macros/s/.../exec` jaisa complete hai
2. Deploy me **Access = Anyone** hai (na ho to: Deploy → Manage deployments → ✏️ edit → Anyone → Deploy)
3. Script pehle se **Save** (💾) kiya hai
4. Internet check karo

**Sheet me entry dikhi nahi?**
→ Toast me "Sheet me upload" likha tha ya "phone me save hua" — agla entry try karo. Sheet hamesha latest hi source hai.

**Koi bhi data delete ho gaya to?**
→ Sheet me row delete hui hai, Google me **File → Version history → Version history and page sharing** se pehle wala version restore kar sakte ho (Google auto-backup rakhti hai).
