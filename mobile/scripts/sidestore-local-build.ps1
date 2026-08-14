# SideStore Local Build Script (Windows PowerShell)
# Usage: .\scripts\sidestore-local-build.ps1
# 
# This script builds Laneory for local sideloading via SideStore
# Uses credentials from .env.local (never committed to Git)

$ErrorActionPreference = "Stop"

Write-Host "🏗️  Building Laneory for SideStore (local sideload)..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ Error: .env.local not found" -ForegroundColor Red
    Write-Host "   Please copy .env.local.example to .env.local and fill in your credentials"
    exit 1
}

# Parse .env.local file
$envVars = @{}
Get-Content ".env.local" | ForEach-Object {
    if ($_ -match '^\s*([^=#]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value -like '<*>') {
            Write-Host "⚠️  Warning: $key not configured (still contains placeholder)" -ForegroundColor Yellow
        }
        $envVars[$key] = $value
    }
}

# Validate required variables
@("SIDESTORE_CERT_PATH", "APPLE_ID") | ForEach-Object {
    if (-not $envVars.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($envVars[$_])) {
        Write-Host "❌ Error: $_ not set in .env.local" -ForegroundColor Red
        exit 1
    }
}

# Validate certificate file exists
$certPath = $envVars["SIDESTORE_CERT_PATH"]
if (-not (Test-Path $certPath)) {
    Write-Host "❌ Error: Certificate file not found at $certPath" -ForegroundColor Red
    exit 1
}

# Create output directory
$outputDir = $envVars["SIDESTORE_BUILD_OUTPUT"]
if (-not $outputDir) {
    $outputDir = "./dist/sidestore-build"
}
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Write-Host "✅ Configuration validated" -ForegroundColor Green
Write-Host "   Bundle ID: app.laneory.mobile"
Write-Host "   Apple ID: $($envVars['APPLE_ID'])"
Write-Host "   Certificate: $certPath"
Write-Host "   Output: $outputDir"
Write-Host ""
Write-Host "📝 Next steps for local SideStore build:" -ForegroundColor Cyan
Write-Host "   1. Ensure Xcode command-line tools are installed: xcode-select --install"
Write-Host "   2. Run: npx expo prebuild --clean"
Write-Host "   3. Run: eas build --local --platform ios"
Write-Host "   4. Use SideStore to sideload the resulting .ipa file to your device"
Write-Host ""
Write-Host "📚 References:" -ForegroundColor Cyan
Write-Host "   - SideStore: https://sidestore.io"
Write-Host "   - Expo Prebuild: https://docs.expo.dev/versions/v57.0.0/build/setup/"
Write-Host "   - Local EAS Build: https://docs.expo.dev/build/local-builds/"
Write-Host ""
