# LUMIQ for Android and iOS

The LUMIQ phone app, built with Expo (SDK 58) and Expo Router. It reuses the web app's tested logic from `../src` (sample files, CSV and Excel reading, calculations, data health, forecast, the AI planner) through the `@core/*` import alias, so the phone and the web compute the same numbers.

## Status

Done:

- **Welcome** on first launch: choose English or हिंदी, see the three steps, then start with a sample file or your own.
- **Four bottom tabs** (Home, Insights, Ask, More) on the phone's own tab bar, every tab labelled.
- **Home:** the three sample files with their real sizes from the shared code, and an empty "My files" list.
- **More:** the language switch, the tools on the way, and the privacy promise.
- **Languages:** every string is in English and Hindi. The language, the first-launch state and the selected file are saved on the phone.

Next: opening your own Excel and CSV files, the Insights screen, Ask (built-in AI through a small Supabase server, so users need no key), What-if, File check and Report.

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

## How it is put together

```
src/app/         routes only (Expo Router): welcome, (tabs)/(home|insights|ask|more)
src/screens/     screen bodies: welcome, home, more, coming-soon
src/components/  shared UI: AppText, AppIcon, BigButton, Section, PrivacyNote
src/i18n/        every string, in English and Hindi
src/state/       app state: language, first launch, selected file (saved on the phone)
src/data/        the shared sample files, with translated names
src/constants/   theme tokens: colours, sizes
metro.config.js  lets Metro serve ../src, the shared web logic
```

Design rules, from the Stitch designs:

- One main action per screen.
- Big buttons (56dp) and big text: 18pt body, never below 14pt.
- Every icon has a text label, and the words are plain.
- "Your file stays on your phone" appears wherever a file is added.
