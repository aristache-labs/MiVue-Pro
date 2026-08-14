# SideStore Local Build Script (Windows PowerShell)
# Usage: .\scripts\build-sidestore.ps1
# 
# Builds Laneory for SideStore sideloading with FREE Apple Developer account
# No provisioning profile required - SideStore handles signing

$ErrorActionPreference = "Stop"

Write-Host "🏗️  Building Laneory for SideStore (FREE Account)..." -ForegroundColor Cyan
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
        if (-not [string]::IsNullOrWhiteSpace($value) -and $value -notlike '<*>') {
            $envVars[$key] = $value
        }
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
Write-Host "   App: Laneory (Free Account + SideStore)" -ForegroundColor Gray
Write-Host "   Bundle ID: app.laneory.mobile"
Write-Host "   Apple ID: $($envVars['APPLE_ID'])"
Write-Host "   Certificate: $certPath"
Write-Host "   Output: $outputDir"
Write-Host ""

# Step 1: Generate native iOS files
Write-Host "📱 Step 1: Generating native iOS files..." -ForegroundColor Yellow
npx expo prebuild --clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prebuild failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Native iOS files generated" -ForegroundColor Green
Write-Host ""

# Step 2: Build with EAS locally
Write-Host "🔨 Step 2: Building with EAS (local)..." -ForegroundColor Yellow
Write-Host "   This will create an unsigned .ipa file"
Write-Host ""

eas build --local --platform ios --output "$outputDir/Laneory.ipa"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ EAS build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host ""

# Step 3: Show next steps
Write-Host "📝 Next steps for SideStore:" -ForegroundColor Cyan
Write-Host "   1. Open SideStore app on your iOS device"
Write-Host "   2. Connect device to this computer (or same network)"
Write-Host "   3. Tap '+' to add app"
Write-Host "   4. Select the .ipa file: $outputDir\Laneory.ipa"
Write-Host "   5. SideStore will sign and install automatically"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - SideStore: https://sidestore.io"
Write-Host "   - Expo Prebuild: https://docs.expo.dev/versions/v54.0.0/build/setup/"
Write-Host "   - Local EAS Build: https://docs.expo.dev/build/local-builds/"
Write-Host ""
Write-Host "✨ Build ready for sideloading!" -ForegroundColor Green
Write-Host ""
