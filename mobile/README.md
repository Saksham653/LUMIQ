# LUMIQ for Android and iOS

The LUMIQ phone app, built with Expo (SDK 58) and Expo Router. It reuses the web app's tested logic from `../src` (sample files, CSV and Excel reading, calculations, data health, forecast, the AI planner) through the `@core/*` import alias, so the phone and the web compute the same numbers.

## Status

Done:

- **Welcome** on first launch: choose English or हिंदी, see the three steps, then start with a sample file or your own.
- **Four bottom tabs** (Home, Insights, Ask, More) on the phone's own tab bar, every tab labelled.
- **Home:** your own files (added from the phone's file picker: Excel with a sheet choice, or CSV), the three sample files, and delete with a plain confirmation.
- **Insights:** pick a number column, four big numbers, a bar chart by period or group, and what LUMIQ noticed, in lakh and crore.
- **Ask:** questions in your own words (English, Hindi or Hinglish), answered by LUMIQ's built-in AI. The phone runs the calculation; every number in the answer is checked against it, and the steps, result table and exact prompts are one tap away.
- **What if…? (More):** pick a number column, a change from -50% to +50% (slider or presets) and all rows or one group; the shared engine recalculates every row on the phone and says the result in words, with now/after bars. The file itself is never changed.
- **More:** the language switch, the tools, and the privacy promise.
- **Languages:** every string is in English and Hindi. Settings and imported files stay on the phone.

Next: File check, Report, the LUMIQ app icon, and store builds.

## Run it

You need Node 20 or newer and, for Android, the Android SDK. From this folder:

```bash
npm install
npx expo start
```

Then open it on one of these:

- **Your phone (Android or iPhone):** install Expo Go from the Play Store or App Store and scan the QR code in the terminal. The phone and the computer must be on the same Wi-Fi.
- **Android emulator:** press `a` in the terminal, or run `npm run android`.

> Run these commands in a normal PowerShell or Windows Terminal window. The Terminal panel inside the Claude desktop app cannot see `%LOCALAPPDATA%\Android`, so Expo reports that the Android SDK is missing there.

`npm run typecheck` checks the TypeScript.

## Built-in AI (Ask)

Users need no key: the app calls LUMIQ's own server, which adds the owner's Groq key.

- **Server:** the `lumiq-ask` Edge Function in the Supabase project "lumiq" (Mumbai, free plan). Its code is in [`../supabase/functions/lumiq-ask`](../supabase/functions/lumiq-ask/index.ts), and the usage table is in [`../supabase/migrations`](../supabase/migrations). The app's side is [`src/ai`](src/ai); the function's address and public key are in `src/ai/config.ts`.
- **What is sent:** the question, the column names with a short summary (types, min/max/average, most common values), and after the calculation its result table. Never the file's rows. The function accepts only LUMIQ's own two kinds of prompt and never logs them.
- **Limits:** 20 questions per phone per day and 2,000 for the whole app, counted in India time. A phone is known only by a random install id, stored as a salted hash; counters are deleted after 14 days.
- **Secrets** (Supabase Dashboard > Edge Functions > Secrets, no redeploy needed):
  - `GROQ_API_KEY` (or `LUMIQ_GROQ_KEY`): the owner's Groq key. Required.
  - `GROQ_MODEL`: default `openai/gpt-oss-120b`. Llama 3.3 70B, which the web app uses, is Enterprise-only on Groq now.
  - `DAILY_QUESTIONS_PER_DEVICE` (default 20) and `DAILY_QUESTIONS_TOTAL` (default 2000).
- **Good to know:** free Supabase projects pause after about a week with no use. If Ask says the AI is busy for a long time, restore the project from the dashboard.

## How it is put together

```
src/app/         routes only (Expo Router): welcome, (tabs)/(home|insights|ask|more), more/what-if
src/screens/     screen bodies: welcome, home, insights, ask, what-if, more
src/components/  shared UI: AppText, AppIcon, BigButton, ChoiceChips, FileHeader, NoFileChosen, HBarChart
src/ai/          Ask: the proof flow, the client for the lumiq-ask function, the install id
src/data/        samples, Excel/CSV import, the files saved on the phone
src/utils/       number formatting (lakh/crore), chart and tile maths, suggested questions
src/i18n/        every string, in English and Hindi
src/state/       app state: language, first launch, selected file, imported files
src/constants/   theme tokens: colours, sizes
metro.config.js  lets Metro serve ../src, the shared web logic, with this app's packages
```

Design rules, from the Stitch designs:

- One main action per screen.
- Big buttons (56dp) and big text: 18pt body, never below 14pt.
- Every icon has a text label, and the words are plain.
- "Your file stays on your phone" appears wherever a file is added, and Ask says exactly what it sends.
