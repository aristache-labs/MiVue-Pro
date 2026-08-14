# SideStore Local Build — FREE Apple Account Setup

This guide walks you through building Laneory for local iOS sideloading via SideStore using only a **FREE Apple Developer account** (no paid tier required).

## Key Difference: FREE Account

✅ **You DON'T need:**
- Provisioning profile
- App Store Connect account
- Paid Developer Program membership

✅ **You DO have:**
- Your `.sideconf` file (has all signing data)
- Your `.p12` certificate
- SideStore app (handles the signing)

## Prerequisites

- Free Apple Developer Account (apple.adriancristache@gmail.com)
- SideStore app installed on your iOS device
- Your iOS device (iPhone/iPad)
- `SideStoreSigningCertificate.p12` certificate file
- `apple.adriancristache@gmail.com.sideconf` config file
- Windows PC with Node.js and npm installed

## Step 1: Prepare Your Environment

Your `.env.local` should look like this:

```env
APPLE_ID=apple.adriancristache@gmail.com
APPLE_PASSWORD=<your-app-specific-password>

SIDESTORE_CERT_PATH=C:\Users\adrian.cristache\Downloads\SideStoreSigningCertificate.p12
SIDESTORE_CERT_PASSWORD=<your-certificate-password>

# FREE ACCOUNT: Leave blank - SideStore handles signing
SIDESTORE_PROVISION_PATH=

SIDESTORE_BUILD_OUTPUT=./dist/sidestore-build
```

**NOTE:** `.env.local` is in `.gitignore` — it will never be committed to Git.

## Step 2: Install Required Tools

EAS CLI is already installed globally. Verify:

```powershell
eas --version
# Should output: eas-cli/21.8.0 (or similar)
```

## Step 3: Build for SideStore

Run the build script:

```powershell
cd mobile
.\scripts\build-sidestore.ps1
```

This will:

1. **Generate native iOS files** — `npx expo prebuild --clean`
2. **Build locally with EAS** — `eas build --local --platform ios`
3. **Output `.ipa` file** — Ready for SideStore

The `.ipa` file will be at:
```
mobile/dist/sidestore-build/Laneory.ipa
```

## Step 4: Sideload with SideStore

1. **Connect your device** — Same network as your PC (or connected via USB)
2. **Open SideStore** on your iOS device
3. **Tap "+"** to add a new app
4. **Select the `.ipa` file** — Browse to `Laneory.ipa`
5. **SideStore signs it** — Uses your `.sideconf` automatically
6. **App installs** — Laneory appears on your home screen

Done! 🎉

## How SideStore Works

SideStore is a free alternative to App Store that:

- Signs apps with your personal certificate
- Installs directly to your device
- Auto-resigns every 7 days
- Works on FREE Apple Developer accounts
- Requires no provisioning profiles

Your `.sideconf` file contains:
- Your signing certificate
- Your Apple ID credentials
- Your team information

SideStore reads this and handles all the signing automatically.

## Resigning After 7 Days

iOS automatically revokes sideloaded app signatures after 7 days. To keep Laneory working:

1. **Open SideStore** on your device
2. **Find Laneory** in your apps
3. **Tap refresh/re-sign** (usually automatic)
4. App continues working

SideStore handles this automatically most of the time.

## Troubleshooting

### Build fails: "Certificate not found"
- Verify `SIDESTORE_CERT_PATH` in `.env.local` is correct
- Check file exists: `Test-Path "C:\Users\adrian.cristache\Downloads\SideStoreSigningCertificate.p12"`

### Build fails: "Cannot determine executable to run"
- Ensure EAS CLI is installed: `eas --version`
- If not installed: `npm install -g eas-cli`

### SideStore won't install the .ipa
- Verify file downloaded completely
- Try rebuilding with `.\scripts\build-sidestore.ps1`
- Ensure device is on same network as PC

### App crashes on launch
- Check Xcode console logs (if available)
- Verify bundle ID is exactly `app.laneory.mobile`
- Try clean rebuild: `npx expo prebuild --clean`

### "SideStore can't sign the app"
- Verify your `.sideconf` file is valid
- Re-download from apple.adriancristache@gmail.com account if needed
- Ensure app signing data is included in `.sideconf`

## Security & Compliance

✅ **Secure:**
- Credentials stored locally in `.env.local` (never committed)
- `.p12` certificate stays local
- Build artifacts outside repository
- No secrets in Git

✅ **Compliant:**
- Free account (no paid features)
- Local testing only (not App Store)
- Personal device use (no distribution)
- Per `AGENTS.md` project rules

## Local Development Workflow

Typical iteration:

1. **Make code changes** in `mobile/src/`
2. **Test locally** (you manage simulator/dev server)
3. **Ready to test on device?**
   ```powershell
   .\scripts\build-sidestore.ps1
   ```
4. **Sideload via SideStore**
5. **Test on real device**
6. **Commit code changes** (not build artifacts)

## References

- **SideStore Official:** https://sidestore.io
- **Expo Prebuild:** https://docs.expo.dev/versions/v54.0.0/build/setup/
- **Local EAS Builds:** https://docs.expo.dev/build/local-builds/
- **Apple Free Account:** https://developer.apple.com/programs/enroll/
- **App-Specific Passwords:** https://support.apple.com/en-us/102654

## About Laneory

- **Bundle ID:** `app.laneory.mobile`
- **App Name:** Laneory
- **Purpose:** Local dashcam library for Mio MiVue cameras
- **SDK:** Expo v54 + React Native v0.81
- **Permissions:** Local network access, Wi-Fi SSID, location (when-in-use)

See `mobile/app.json` for full Expo configuration.

## Next Steps

1. ✅ Verify `.env.local` is configured
2. ✅ Install EAS CLI (`npm install -g eas-cli`)
3. ✅ Run: `.\scripts\build-sidestore.ps1`
4. ✅ Sideload `.ipa` via SideStore
5. ✅ Test on device

You're all set! 🚀
