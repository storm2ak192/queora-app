# Queora

Free Android download manager (Expo / React Native). Multi-part HTTP downloads, queue, modern dark UI, on-device storage.

> Clean-room project. Not affiliated with any other download manager.

## Repo layout

| Path | Contents |
|------|----------|
| `app/` | Expo app source, `eas.json`, `app.json` |
| `legal/` | Privacy, terms, support HTML (host before Play listing) |
| `.github/workflows/` | APK build via EAS |

## Try a build (GitHub Actions)

1. Create an [Expo](https://expo.dev) account and run `eas login` locally once.
2. Create an access token: Expo → Account → Access tokens.
3. In this repo: **Settings → Secrets → Actions → New repository secret**
   - Name: `EXPO_TOKEN`
   - Value: your token
4. **Actions → Build Android APK → Run workflow**
5. Open the EAS build URL from the job log and download the APK.

Or locally:

```bash
cd app
npm install
eas build --platform android --profile preview
```

## Legal pages

Host `legal/` on any static host, replace the support email, then use the public URLs in Play Console.
