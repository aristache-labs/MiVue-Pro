# SideStore Quick Start (TL;DR)

## 5-Minute Setup

### 1. Configure Credentials (One-time)
```powershell
cd mobile
Copy-Item ".env.local.example" ".env.local"
# Edit .env.local with your paths and passwords
notepad .env.local
```

**Required in `.env.local`:**
- `APPLE_ID` = your Apple ID
- `SIDESTORE_CERT_PATH` = path to your `.p12` file
- `SIDESTORE_CERT_PASSWORD` = certificate password

### 2. Validate Setup
```powershell
.\scripts\sidestore-local-build.ps1
```

Should see: ✅ Configuration validated

### 3. Build for Local iOS
```powershell
# Generate native iOS files
npx expo prebuild --clean

# Build locally
eas build --local --platform ios
```

Outputs `.ipa` file in `dist/sidestore-build/`

### 4. Sideload to Device
1. Connect device to SideStore
2. Add the `.ipa` file
3. SideStore signs and installs

Done! 🎉

---

## Common Commands

| Task | Command |
|------|---------|
| Validate config | `.\scripts\sidestore-local-build.ps1` |
| Clean rebuild | `npx expo prebuild --clean && eas build --local --platform ios` |
| Quick rebuild | `npx expo prebuild && eas build --local --platform ios` |
| Check gitignore | `git check-ignore mobile\.env.local` |
| View config | `cat mobile\.env.local` (don't commit!) |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `.env.local` not found | `Copy-Item ".env.local.example" ".env.local"` |
| Certificate not found | Verify path in `.env.local` exists |
| Build fails | Try `npx expo prebuild --clean` |
| SideStore won't install | Rebuild with `--clean`, verify bundle ID |

---

## Important Security Rules

🔒 **NEVER commit:**
- `.env.local`
- `.p12` files
- `.mobileprovision` files
- App-specific passwords

✅ **Always:**
- Use `.env.local` for secrets
- Keep credentials locally only
- Use app-specific password (not main Apple ID password)
- Rotate credentials if exposed

---

## Full Documentation

- **Setup Details**: See `SIDESTORE_LOCAL_SETUP.md`
- **Security Checklist**: See `SIDESTORE_SECURITY_CHECKLIST.md`
- **Project Rules**: See `AGENTS.md`

---

## Need Help?

1. Check `SIDESTORE_LOCAL_SETUP.md` for detailed troubleshooting
2. Verify `.env.local` is configured correctly
3. Run `.\scripts\sidestore-local-build.ps1` to validate
4. Check Xcode logs: `~/Library/Logs/Xcode/` (if on Mac)
