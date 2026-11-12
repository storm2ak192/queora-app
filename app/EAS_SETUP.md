# EAS internal build — Queora

```bash
npm i -g eas-cli
cd app
npm install
eas login
eas init
eas build --platform android --profile preview
```

Add secret `EXPO_TOKEN` in GitHub Actions to enable CI builds.
