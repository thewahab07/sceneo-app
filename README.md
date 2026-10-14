# Sceneo

A minimal movie and TV tracker built with Expo (SDK 57), Expo Router, NativeWind and Zustand.
No accounts: everything is stored on-device with AsyncStorage. Metadata comes from [TMDB](https://www.themoviedb.org).

## Run

```bash
npm install
npx expo start          # scan with a dev build, or press i / a
```

The TMDB v3 API key lives in `.env` (git-ignored):

```
EXPO_PUBLIC_TMDB_API_KEY=your_key
```

`.env.example` shows the format. Note that `EXPO_PUBLIC_*` values are bundled into the app, which is normal for TMDB v3 keys.

## Features

- Library with status lists (Watching, Plan to watch, Completed, On hold, Dropped), filters and search
- Per-episode tracking, per-season and whole-show toggles, long-press an episode to mark everything up to it
- Quick "+1 episode" button on the library list; auto-status (watching / completed) from progress
- Ratings (1-10) and notes per title
- Upcoming tab: next episodes and unreleased movies for titles you track (pull to refresh)
- Stats: watch time, episodes, movies, average rating, status and genre breakdown
- Light / dark / system theme
- Settings: export and import a `.json` backup (merge or replace)

## Build with EAS

```bash
npm i -g eas-cli
eas login
eas init
# .env is git-ignored, so give EAS the key as an environment variable:
eas env:create --name EXPO_PUBLIC_TMDB_API_KEY --value <your_key> --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_TMDB_API_KEY --value <your_key> --environment preview --visibility plaintext
eas build --profile preview --platform android   # installable APK
eas build --profile production --platform all
```

Profiles are defined in `eas.json` (`development`, `preview`, `production`). Change the bundle id / package (`com.sceneo.app`) in `app.json` before publishing.

## Structure

```
src/app/            Expo Router screens (tabs + title/[type]/[id])
src/components/     UI primitives, library row
src/lib/            TMDB client, types, backup import/export, theme
src/store/library.ts  Zustand store persisted to AsyncStorage
```
