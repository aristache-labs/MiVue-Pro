# SideStore Security & Compliance Checklist

This checklist ensures your local SideStore setup follows MiVue Pro / Laneory project constraints from `AGENTS.md`.

## Before You Start

- [ ] Read `AGENTS.md` section on "Operazioni interzise" (Forbidden Operations)
- [ ] Confirm you own the iOS device you're sideloading to
- [ ] Confirm free Apple Developer account (non-commercial testing only)
- [ ] Confirm no intention to submit to App Store

## Credential Management

- [ ] `.env.local` exists and is in `.gitignore`
- [ ] `.env.local` contains NO committed secrets (check with `git status`)
- [ ] `.p12` certificate file stored locally, NOT in repository
- [ ] `.mobileprovision` file stored locally, NOT in repository
- [ ] All sensitive file paths are relative to your local machine only
- [ ] No passwords hardcoded in any tracked files
- [ ] Using app-specific password from Apple (not main account password)

## Build Integrity

- [ ] Bundle ID is exactly `app.laneory.mobile` (no modifications)
- [ ] Team ID matches your free Apple Developer account
- [ ] Signing certificate is from your own account (not shared/leaked)
- [ ] Provisioning profile includes only your device UDID
- [ ] No code signing bypass or certificate tricks attempted

## Project Compliance

- [ ] NOT submitting to App Store (local sideload only)
- [ ] NOT deploying to production
- [ ] NOT modifying or bypassing app entitlements
- [ ] NOT using official Mio/MiTAC signing credentials
- [ ] NOT cloning official MiVue Pro UI or assets
- [ ] NOT extracting or using official app resources

## Build Artifacts

- [ ] `.ipa` file is stored outside repository
- [ ] Build output directory (`dist/`) is in `.gitignore`
- [ ] No `.ipa` files committed to Git
- [ ] No intermediate build artifacts in repository
- [ ] `ios/` and `android/` directories generated from `prebuild` (not committed)

## Testing & Usage

- [ ] Testing only on devices you own
- [ ] Testing for personal/development use only
- [ ] Not sharing `.ipa` with others (use SideStore for that)
- [ ] Not using for commercial purposes
- [ ] Not using for testing paid/premium features

## Documentation

- [ ] Setup instructions in `SIDESTORE_LOCAL_SETUP.md` (not committed credentials)
- [ ] This checklist completed before first build
- [ ] Local notes on certificate renewal dates
- [ ] Password rotation schedule documented locally (not in repo)

## Before Committing Code

```powershell
# Verify no secrets will be committed
git status
git diff --cached

# Check for sensitive files
git check-ignore mobile\.env.local
git check-ignore "*.p12"
git check-ignore "*.mobileprovision"
git check-ignore dist/
```

All should return "true" / path matches.

## Emergency Credential Rotation

If credentials are accidentally exposed:

1. **Immediately:**
   ```powershell
   # Revoke certificate in Apple Developer account
   # Regenerate new certificate
   # Generate new app-specific password
   ```

2. **Update local files:**
   - Replace `.p12` file with new certificate
   - Update `.env.local` with new passwords
   - Do NOT commit old credentials

3. **Verify Git history:**
   ```powershell
   git log --all --oneline -- mobile\.env.local
   ```
   Should show no commits with credentials.

## Compliance with AGENTS.md

This setup adheres to:

✅ "Sono permesse operazioni read-only e mutative sulla camerà detenuta legalmente"
- Local testing only on your own device

✅ "Non commettere, non distribuire o includere in build-uri"
- Credentials kept local
- No `.p12` or `.mobileprovision` in Git
- No `.ipa` files published

✅ "Moduli officiali e risultati bruti dell'analisi rimangono locali"
- Certificate is local-only
- Build artifacts outside repository

✅ "Separazione tra analisi e prodotto"
- Local build is development/test only
- Not submitting to App Store
- Not using official signing credentials

## Sign-Off

When you've completed all checks:

```powershell
# Final verification
Write-Host "✅ SideStore setup secure and compliant"
Write-Host "Ready for local development & testing"
```

Date completed: _______________

Notes: _____________________________________________________________
