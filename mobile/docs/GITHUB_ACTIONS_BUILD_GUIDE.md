# GitHub Actions: Build iOS for SideStore (Windows + Free Account)

This workflow builds Laneory for iOS on GitHub's free macOS runners, then you download the `.ipa` and sideload it with SideStore.

## Why This Works

✅ **Free** — GitHub Actions includes free macOS minutes  
✅ **No Mac needed** — Builds on GitHub's servers  
✅ **Secure** — Credentials stored in GitHub Secrets  
✅ **Simple** — One-click builds from the web  

## Step 1: Set Up GitHub Secrets

Your Apple ID and password need to be stored as GitHub secrets (not in Git).

### Add Secrets to Your Repository

1. Go to: **GitHub** → **Your Repo** → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add two secrets:

#### Secret 1: Apple ID
- **Name:** `APPLE_ID`
- **Value:** `apple.adriancristache@gmail.com`
- Click **Add secret**

#### Secret 2: Apple Password
- **Name:** `APPLE_PASSWORD`
- **Value:** Your app-specific password (NOT your main password)
- Click **Add secret**

**To get app-specific password:**
1. Go to https://appleid.apple.com
2. Sign in with `apple.adriancristache@gmail.com`
3. Security → App passwords
4. Generate new password for "Laneory"
5. Copy and paste into GitHub secret

## Step 2: Trigger a Build

### Option A: From GitHub Web
1. Go to **GitHub** → **Your Repo** → **Actions**
2. Select **"Build iOS for SideStore"**
3. Click **"Run workflow"** → **"Run workflow"** again
4. Wait for build to complete (usually 10-20 minutes)

### Option B: From Windows PowerShell
```powershell
# Trigger via GitHub CLI (if installed)
gh workflow run build-sidestore-ios.yml -f build_name="manual-build"
```

## Step 3: Download the `.ipa`

Once the build completes:

1. Go to **GitHub** → **Your Repo** → **Actions**
2. Click the workflow run
3. Scroll down to **"Artifacts"**
4. Download **"Laneory-iOS-[number]"**
5. Extract the `.ipa` file

**Or download from Release:**
1. Go to **GitHub** → **Your Repo** → **Releases**
2. Find the latest **"iOS Build [number]"**
3. Download **"Laneory-[number].ipa"**

## Step 4: Sideload with SideStore

1. **Connect your iPhone** to this computer (or same network)
2. **Open SideStore** on your device
3. **Tap "+"** to add app
4. **Select the downloaded `.ipa`**
5. **SideStore signs and installs** automatically

Done! 🎉

## Understanding the Workflow

The `.github/workflows/build-sidestore-ios.yml` file does:

1. **Checkout your code** from GitHub
2. **Setup Node.js** environment
3. **Install dependencies** (`npm install`)
4. **Install EAS CLI** (Expo build tool)
5. **Prebuild iOS** (`npx expo prebuild --clean`)
6. **Build iOS app** (`eas build --local`)
7. **Upload `.ipa`** as GitHub Artifact
8. **Create Release** with the `.ipa` file

All on GitHub's macOS servers — you just download and sideload.

## Security

✅ **Secrets are encrypted** — Only used during build  
✅ **Never logged** — Credentials not visible in logs  
✅ **GitHub best practices** — Same as major projects  
✅ **Auto-cleanup** — Artifacts deleted after 7 days  

## Troubleshooting

### Build fails: "Authentication failed"
- Verify `APPLE_ID` secret is correct: `apple.adriancristache@gmail.com`
- Verify `APPLE_PASSWORD` is app-specific password, not main password
- Regenerate app password and update secret

### Build fails: "No team associated"
- This is expected with free account
- Workflow should still build the `.ipa` for sideloading
- If it fails, let me know the exact error

### Artifacts not showing
- Check if build actually completed (green checkmark)
- Look at **"Run workflow"** page for build output
- Common causes: syntax errors in code, missing dependencies

### Downloaded `.ipa` too large/small
- Should be around 30-80 MB
- If much smaller, build may have failed
- Check build logs on GitHub Actions

## Workflow Limits

GitHub Actions free tier includes:

- ✅ 2,000 free Action minutes/month per account
- ✅ macOS builds use 10x minute multiplier (so 200 minutes macOS time)
- ✅ One build ≈ 15-20 minutes, so you get ~10 free builds/month
- ✅ After that, you pay per minute (or limit builds)

For development/testing, this is plenty!

## Next Builds

To trigger another build:

```powershell
# From GitHub web:
# 1. Go to Actions
# 2. Select "Build iOS for SideStore"
# 3. Click "Run workflow"

# Or from PowerShell (with GitHub CLI):
gh workflow run build-sidestore-ios.yml
```

## References

- **GitHub Actions:** https://docs.github.com/en/actions
- **Expo CLI:** https://docs.expo.dev/build/setup/
- **SideStore:** https://sidestore.io
- **App-Specific Passwords:** https://support.apple.com/en-us/102654

## Status Check

**Before running first build:**

- [ ] GitHub secrets `APPLE_ID` and `APPLE_PASSWORD` configured
- [ ] `.github/workflows/build-sidestore-ios.yml` file exists
- [ ] Repository pushed to GitHub
- [ ] GitHub Actions enabled in repo settings

Once confirmed, you're ready to build! 🚀
