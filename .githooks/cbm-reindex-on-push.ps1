# Non-blocking codebase-memory reindex after git push (Source Control or CLI).
# Invoked by .githooks/pre-push / .git/hooks/pre-push.

$ErrorActionPreference = "Stop"

$Exe = "C:/Users/adrian.cristache/.local/bin/codebase-memory-mcp.exe"
$Repo = (git rev-parse --show-toplevel).Trim()
$Name = "mivue-pro"
$Mode = "full"
$LogDir = "C:/Users/adrian.cristache/.cache/codebase-memory-mcp"
$LogOut = Join-Path $LogDir "mivue-pro-pre-push.out.log"
$LogErr = Join-Path $LogDir "mivue-pro-pre-push.err.log"
$AllowedRoot = "C:/Users/adrian.cristache/OneDrive - Antech Consulting SRL/Desktop"

if (-not (Test-Path -LiteralPath $Exe)) {
  Write-Host "cbm-reindex: binary not found: $Exe"
  exit 0
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Use CLI flags (not raw JSON) — raw JSON crashes workers on this OneDrive path.
$runner = @"
`$ErrorActionPreference = 'Continue'
`$env:CBM_WORKERS = '4'
`$env:CBM_MEM_BUDGET_MB = '2048'
`$env:CBM_CACHE_DIR = '$LogDir'
`$env:CBM_ALLOWED_ROOT = '$AllowedRoot'
`$env:CBM_LOG_LEVEL = 'warn'
& '$Exe' cli index_repository --repo-path '$Repo' --name $Name --mode $Mode > '$LogOut' 2> '$LogErr'
"@

$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($runner))
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-EncodedCommand", $encoded
) -WindowStyle Hidden | Out-Null

Write-Host "cbm-reindex: started background index for $Name (mode=$Mode)"
exit 0
