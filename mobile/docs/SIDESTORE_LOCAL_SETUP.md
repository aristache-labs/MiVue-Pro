# SideStore Local Sideloading Setup

This guide walks you through setting up Laneory for local iOS sideloading via SideStore using your free Apple Developer account.

## Prerequisites

- Free Apple Developer Account (apple.adriancristache@gmail.com)
- Xcode command-line tools installed
- SideStore installed on your iOS device
- Your device running iOS 16.0+
- `SideStoreSigningCertificate.p12` certificate file
- Provisioning profile for sideloading

## Step 1: Set Up Local Environment Variables

Never commit credentials to Git. Use `.env.local` for local-only settings:

1. Copy the example file:
   ```powershell
   Copy-Item "mobile\.env.local.example" "mobile\.env.local"
   ```

2. Edit `mobile\.env.local` and fill in your values:
   ```env
   APPLE_ID=apple.adriancristache@gmail.com
   APPLE_PASSWORD=<your-app-specific-password>
   SIDESTORE_CERT_PATH=../../../Downloads/SideStoreSigningCertificate.p12
   SIDESTORE_CERT_PASSWORD=<your-certificate-password>
   SIDESTORE_PROVISION_PATH=<path-to-your-provisioning-profile.mobileprovision>
   SIDESTORE_BUILD_OUTPUT=./dist/sidestore-build
   ```

3. Verify `.env.local` is in `.gitignore` (it should be):
   ```powershell
   git check-ignore "mobile\.env.local"
   ```

## Step 2: Prepare Your Certificate

Your `SideStoreSigningCertificate.p12` file contains:
- Your signing certificate
- Your private key
- Your Apple Developer account credentials

**Security Notes:**
- Never commit this file to Git (`.p12` is in `.gitignore`)
- Keep it in your local Downloads folder or a secure local location
- The password should never be shared or committed

## Step 3: Build Locally for SideStore

Run the setup script to validate your configuration:

```powershell
cd mobile
.\scripts\sidestore-local-build.ps1
```

If validation passes, continue with the build:

```powershell
# Generate native iOS code from Expo configuration
npx expo prebuild --clean

# Build locally using EAS Build
eas build --local --platform ios
```

This will:
1. Generate native iOS project files
2. Sign the app with your certificate
3. Create a `.ipa` file ready for SideStore

## Step 4: Sideload with SideStore

1. Open SideStore on your iOS device
2. Add Laneory:
   - Tap "+" to add an app
   - Select the `.ipa` file from the build output
3. SideStore will sign and install the app to your device

The app will appear on your home screen. Resigning happens every 7 days when needed.

## Troubleshooting

### "Certificate not found" error
- Verify path in `.env.local` is correct
- Check file exists: `Test-Path "path/to/SideStoreSigningCertificate.p12"`

### Build fails with certificate error
- Verify password in `.env.local` matches certificate password
- Re-export certificate from Apple Developer account if needed

### SideStore won't install the .ipa
- Verify `.ipa` was signed correctly during build
- Check device is on same Wi-Fi as build machine
- Try rebuilding with `--clean` flag

### App crashes on launch
- Check console logs in Xcode
- Verify bundle ID matches provisioning profile: `app.laneory.mobile`
- Rebuild with fresh prebuild

## Credential Security

**DO NOT:**
- Commit `.env.local` to Git
- Share `.p12` certificate file
- Share Apple ID password (use app-specific password instead)
- Check credentials into `.sideconf` files

**DO:**
- Use Windows Credential Manager for storing passwords locally
- Rotate app-specific passwords regularly
- Keep `.p12` file backed up in secure location
- Use different credentials for test vs. production

## References

- [SideStore Official](https://sidestore.io)
- [Expo Prebuild Documentation](https://docs.expo.dev/versions/v57.0.0/build/setup/)
- [Expo Local EAS Builds](https://docs.expo.dev/build/local-builds/)
- [Apple Developer Free Account](https://developer.apple.com/programs/enroll/)
- [App-Specific Passwords](https://support.apple.com/en-us/102654)

## Local Development Workflow

Typical workflow for iterating locally:

1. Make code changes in `mobile/`
2. Test on simulator: `npx expo start` (you manage this separately)
3. When ready for device testing:
   ```powershell
   npx expo prebuild --clean
   eas build --local --platform ios
   ```
4. Sideload new `.ipa` to device via SideStore
5. Test on device
6. Commit code changes (not credentials or build artifacts)

## Notes for Laneory Project

- Bundle ID: `app.laneory.mobile`
- App name: Laneory
- For Mio MiVue 866 (compatible cameras)
- Uses Expo SDK v57+
- Requires: Local network access, Wi-Fi SSID access, location (when-in-use)

See `mobile/app.json` for full Expo configuration.
