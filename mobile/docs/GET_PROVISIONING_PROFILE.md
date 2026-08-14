# How to Get Your Provisioning Profile

You need a `.mobileprovision` file for SideStore to sign and install the app. Here's where to get it.

## Step 1: Get Your iPhone Device ID (UDID)

You'll need to register your test device first.

### On Windows with iTunes/Apple Devices:
```powershell
# Connect your iPhone, then:
# 1. Open Device Manager
# 2. Find your iPhone under "Portable Devices"
# 3. Right-click → Properties → Details
# 4. Look for "Device Instance ID" or use Xcode
```

### Using Xcode (Best):
1. Connect your iPhone to Mac or use remote connection
2. Open Xcode → Window → Devices and Simulators
3. Select your device
4. Copy the UDID (Device Identifier)

**Example UDID:** `00008101-001A5C5A1234`

## Step 2: Add Device to Apple Developer Account

1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign in with: `apple.adriancristache@gmail.com`
3. Navigate: **Certificates, IDs & Profiles** → **Devices**
4. Click **+** (Register a new device)
5. Select **iOS, tvOS, watchOS, Mac**
6. Enter:
   - **Device Name:** "My iPhone" (or device name)
   - **Device ID (UDID):** Paste your UDID from Step 1
7. Click **Continue** → **Register** → **Done**

## Step 3: Create App ID

1. Navigate: **Certificates, IDs & Profiles** → **Identifiers**
2. Click **+** to register new identifier
3. Select **App IDs**
4. Select **App**
5. Fill in:
   - **Description:** "Laneory Mobile App"
   - **Bundle ID:** `app.laneory.mobile` (exact match!)
6. Under **Capabilities**, enable:
   - ☑ Network Extension
   - ☑ Local Network
   - ☑ WiFi Information
7. Click **Continue** → **Register** → **Done**

## Step 4: Create Provisioning Profile

1. Navigate: **Certificates, IDs & Profiles** → **Profiles**
2. Click **+** to create new profile
3. Select **iOS App Development** (NOT Ad Hoc, NOT App Store)
4. Click **Continue**
5. Select your App ID: `app.laneory.mobile`
6. Click **Continue**
7. Select your certificate (should match your `.p12` file)
8. Click **Continue**
9. Select your test device (the one you registered in Step 2)
10. Click **Continue**
11. **Profile Name:** `Laneory Local Development`
12. Click **Generate**
13. Click **Download**

## Step 5: Save to .env.local

The downloaded file will be named something like:
```
Laneory_Local_Development.mobileprovision
```

Move it to your Downloads folder:
```powershell
Move-Item "C:\Users\<YourUsername>\Downloads\Laneory_Local_Development.mobileprovision" `
          "C:\Users\adrian.cristache\Downloads\"
```

Then update `.env.local`:
```env
SIDESTORE_PROVISION_PATH=../../../Downloads/Laneory_Local_Development.mobileprovision
```

## Troubleshooting

### "App ID already exists"
You may already have `app.laneory.mobile` registered. Just select it from the list instead of creating new.

### "Certificate not found when creating profile"
Your certificate might not be ready yet. Ensure your `.p12` file is properly imported or create a new certificate in Apple Developer.

### "Device not showing up"
- Verify UDID is correct (copy-paste carefully)
- Wait a few minutes for Apple's servers to sync
- Try registering again with exact same UDID

### Can't download profile
- Profile might already be created
- Go to **Profiles** → find `Laneory Local Development` → click → **Download**

## Keep It Safe

⚠️ **NEVER commit the `.mobileprovision` file to Git**
- It contains device-specific information
- It's already in `.gitignore`

✅ **Store locally only:**
```powershell
# Verify it's ignored
git check-ignore "c:\Users\adrian.cristache\Downloads\Laneory_Local_Development.mobileprovision"
```

## Next Steps

Once you have your `.mobileprovision` file:

1. Update `mobile\.env.local` with the path
2. Run: `.\scripts\sidestore-local-build.ps1`
3. If validation passes, proceed with build
4. See `SIDESTORE_LOCAL_SETUP.md` for building and sideloading

## References

- [Apple Developer - Registering Devices](https://developer.apple.com/account/ios/device/)
- [Apple Developer - Managing Identifiers](https://developer.apple.com/account/resources/identifiers/)
- [Apple Developer - Managing Certificates & Profiles](https://developer.apple.com/account/resources/certificates/)
- [Xcode Getting Device UDID](https://developer.apple.com/documentation/xcode/devices)
