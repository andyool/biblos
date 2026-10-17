# Biblos ✦ Hide God's word in your heart

Biblos is a phone app for learning Bible verses by heart, a few minutes at a time. You add it to your Home Screen from the web, so there's no App Store involved.

- **Paths**: 16 curated collections (Foundations, Psalm 23, the Lord's Prayer, the Beatitudes, the Armour of God…), plus any verse you add yourself.
- **Lessons**: each verse grows through *Sown → Rooted → Growing → Fruitful → Hidden in the Heart*. The exercises are reading, ordering phrases, filling gaps, a word bank and first-letter recall on a gold keyboard.
- **Read through**: read whole books of the Bible in order, one passage at a sitting, for the meaning rather than the words. Every book is guided: each passage has a focus, questions on the meaning (with an explanation after each answer), a summary to choose and something to reflect on. A new chapter starts by recalling the story so far, and any verse you read can be added to your memory path.
- **Spaced review**: memorised verses come back just before you'd forget them. A verse is *Hidden in the Heart* once you can still recall it after a gap of three weeks.
- **Rewards**: XP, a daily goal, a streak lamp (with "flasks of oil" that keep a streak alive if you miss a day), talents to spend, and 27 seals to earn.
- **Customisation**: 7 themes, 5 verse letterings, 3 card frames and 19 emblems.
- **Translations**: NIV, NIV (Anglicised), ESV, NKJV, NLT, NRSV Catholic Edition, CSB, NASB, LSB, NET, AMP, MSG, KJV, BSB and WEB. You can switch the whole app, or a single verse. With the Catholic Edition, Read Through also has Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees and the longer Esther and Daniel.
- It works offline once installed. In **Me → Use it offline**, download the whole Bible and every memory verse to the phone (on Wi-Fi, about 6 MB per translation). You can keep several translations and remove them again. Every translation can be downloaded except the NIV, because YouVersion only allows 200 requests an hour for the whole app. Progress stays on your phone, and you can save or restore a backup from the **Me** tab.

---

## 1. Put it online with Vercel (about 10 minutes, once)

You need a free account at [vercel.com](https://vercel.com/signup). Signing up with GitHub is easiest.

### Option A — straight from this folder (simplest)

Open Terminal and run:

```bash
cd ~/Biblos
npx vercel login
```

A browser window opens. Log in there, then come back to Terminal and run:

```bash
npx vercel --prod
```

Vercel asks a few questions. The defaults are fine, so press **Enter** for each:

- *Set up and deploy?* → **Y**
- *Which scope?* → your account
- *Link to existing project?* → **N**
- *Project name?* → `biblos`
- *In which directory is your code located?* → `./`
- *Want to modify these settings?* → **N** (Vercel detects Vite by itself)

At the end Vercel prints a link like `https://biblos-yourname.vercel.app`. That's your app.

**To publish changes later**, run `npx vercel --prod` again.

### Option B — through GitHub (updates automatically)

1. Create an empty repository on [github.com/new](https://github.com/new), for example `biblos`.
2. In Terminal (this folder is already a git repository):
   ```bash
   cd ~/Biblos
   git add -A
   git commit -m "Biblos"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/biblos.git
   git push -u origin main
   ```
3. On [vercel.com/new](https://vercel.com/new), import the repository and press **Deploy**. You don't need to change any settings.

From then on, every `git push` updates the app.

## 2. Put it on your phone's Home Screen

**iPhone:** open your Vercel link in **Safari**. Tap **Share** (the square with an arrow), then **Add to Home Screen**, then **Add**.
**Android:** open the link in **Chrome**. Tap **⋮**, then **Install app** (or **Add to Home screen**).

Always open Biblos from the new icon. On iPhone, the Home Screen app keeps its progress separately from Safari.

## 3. Unlock the NIV (2 minutes, once)

The NIV is copyrighted by Biblica, so free Bible services aren't allowed to share it. YouVersion (the Bible App) offers a **free developer key** that unlocks it:

1. Go to [platform.youversion.com](https://platform.youversion.com) and sign in with your Bible App account (or create one).
2. Create an app (call it "Biblos") and copy its **App Key**.
3. Open **Licenses** in the portal ([platform.youversion.com/platform/licenses](https://platform.youversion.com/platform/licenses)) and accept the **Biblica** licence, which covers the NIV. Without it, the key works for other Bibles but YouVersion refuses the NIV.
4. Pick one way to use the key:
   - **On every device (recommended):** in Vercel, open your project → **Settings → Environment Variables**. Add `YVP_APP_KEY` with your key as the value, and make sure **Production** is ticked. Then go to **Deployments → ⋯ → Redeploy**, because a new key only takes effect after a redeploy. To check it worked, open `https://YOUR-APP.vercel.app/api/yv?path=status`, which should say `"serverKey":true`.
   - **Just this phone:** in Biblos, go to **Me → NIV access**, paste the key and tap **Connect**.

Until then, every other translation works straight away. You can also paste NIV text for any verse by hand: open the verse and tap **Edit text**.

## Running it on your Mac (optional)

```bash
npm install
npm run dev
```

Then open the address it prints.

---

### How it fits together

| Folder | What lives there |
| --- | --- |
| `src/data/` | Books of the Bible and their chapter lengths, translations, the 16 paths, levels, seals and the shop |
| `src/data/guides/` | The guide for each book of Read Through, one file per book (check them with `npm run check:guides`) |
| `src/lib/` | Fetching Bible text, building lessons, spaced repetition, streaks and rewards, saving progress |
| `src/exercises/` | The six exercise types and the on-screen keyboard |
| `src/reading/` | The steps of a reading: the passage, questions, ordering, a heading and reflection |
| `src/screens/`, `src/sheets/` | The pages and the slide-up panels |
| `src/components/` | Gold ornaments, frames, seals, icons |
| `api/yv.js` | A tiny Vercel function that fetches NIV text from YouVersion |
| `public/` | App icons and the Home Screen manifest |

**Where the Bible text comes from:**
- Most translations load from [bolls.life](https://bolls.life), with no key needed.
- The NIV loads from the [YouVersion Platform](https://platform.youversion.com), with your key.
- Each verse's text is cached on the phone after its first load.
- The app shows each translation's copyright notice.

Scripture quotations marked NIV are taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.
