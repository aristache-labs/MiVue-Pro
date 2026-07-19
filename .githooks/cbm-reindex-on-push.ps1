# Non-blocking codebase-memory reindex after git push (Source Control or CLI).
# Invoked by .githooks/pre-push / .git/hooks/pre-push.
#
# Why this is more than a plain CLI index:
# - Graph UI (port 9749) holds mivue-pro.db open.
# - CLI reindex while UI is up can report status=indexed but keep stale nodes
#   (deleted files stay visible). Removals need delete_project + full reindex.
# - When UI is up, call its /rpc (same process) so the live graph updates.
# - When UI is down, unlock via CLI delete + index.

$ErrorActionPreference = "Stop"

$Exe = "C:/Users/adrian.cristache/.local/bin/codebase-memory-mcp.exe"
$Repo = (git rev-parse --show-toplevel).Trim()
$Name = "mivue-pro"
$Mode = "full"
$UiPort = 9749
$LogDir = "C:/Users/adrian.cristache/.cache/codebase-memory-mcp"
$LogOut = Join-Path $LogDir "mivue-pro-pre-push.out.log"
$LogErr = Join-Path $LogDir "mivue-pro-pre-push.err.log"
$AllowedRoot = "C:/Users/adrian.cristache/OneDrive - Antech Consulting SRL/Desktop"

if (-not (Test-Path -LiteralPath $Exe)) {
  Write-Host "cbm-reindex: binary not found: $Exe"
  exit 0
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$runner = @"
`$ErrorActionPreference = 'Continue'
`$env:CBM_WORKERS = '4'
`$env:CBM_MEM_BUDGET_MB = '2048'
`$env:CBM_CACHE_DIR = '$LogDir'
`$env:CBM_ALLOWED_ROOT = '$AllowedRoot'
`$env:CBM_LOG_LEVEL = 'warn'
`$Exe = '$Exe'
`$Repo = '$Repo'
`$Name = '$Name'
`$Mode = '$Mode'
`$UiPort = $UiPort
`$LogOut = '$LogOut'
`$LogErr = '$LogErr'

function Write-CbmLog([string]`$msg) {
  Add-Content -LiteralPath `$LogOut -Value (("[{0}] {1}" -f (Get-Date -Format o), `$msg))
}

function Invoke-CbmRpc([string]`$tool, [hashtable]`$arguments) {
  `$payload = @{
    jsonrpc = '2.0'
    id = [guid]::NewGuid().ToString()
    method = 'tools/call'
    params = @{ name = `$tool; arguments = `$arguments }
  } | ConvertTo-Json -Compress -Depth 8
  return Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/rpc" -f `$UiPort) -Method POST -ContentType 'application/json' -Body `$payload -TimeoutSec 600
}

function Test-CbmUi {
  try {
    `$null = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/" -f `$UiPort) -UseBasicParsing -TimeoutSec 2
    return `$true
  } catch {
    return `$false
  }
}

"" | Set-Content -LiteralPath `$LogOut
"" | Set-Content -LiteralPath `$LogErr

if (Test-CbmUi) {
  Write-CbmLog 'ui_up: delete_project + index_repository via /rpc'
  try {
    `$del = Invoke-CbmRpc 'delete_project' @{ project = `$Name }
    (`$del | ConvertTo-Json -Compress -Depth 8) | Add-Content -LiteralPath `$LogOut
    `$idx = Invoke-CbmRpc 'index_repository' @{
      repo_path = `$Repo
      name = `$Name
      mode = `$Mode
    }
    (`$idx | ConvertTo-Json -Compress -Depth 8) | Add-Content -LiteralPath `$LogOut
    Write-CbmLog 'ui_rpc: done'
  } catch {
    `$_ | Out-String | Add-Content -LiteralPath `$LogErr
    Write-CbmLog 'ui_rpc: failed; falling back to CLI after stopping UI port holder'
    `$listen = Get-NetTCPConnection -LocalPort `$UiPort -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    foreach (`$procId in `@(`$listen)) {
      if (`$procId) { Stop-Process -Id `$procId -Force -ErrorAction SilentlyContinue }
    }
    Start-Sleep -Seconds 1
    & `$Exe cli delete_project --project `$Name *>> `$LogOut
    & `$Exe cli index_repository --repo-path `$Repo --name `$Name --mode `$Mode *>> `$LogOut
    Start-Process -FilePath `$Exe -ArgumentList @('--ui=true', ("--port={0}" -f `$UiPort)) -WindowStyle Hidden | Out-Null
    Write-CbmLog 'cli_fallback+ui_restart: done'
  }
} else {
  Write-CbmLog 'ui_down: CLI delete_project + index_repository'
  & `$Exe cli delete_project --project `$Name *>> `$LogOut
  & `$Exe cli index_repository --repo-path `$Repo --name `$Name --mode `$Mode *>> `$LogOut
  Write-CbmLog 'cli: done'
}
"@

$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($runner))
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-EncodedCommand", $encoded
) -WindowStyle Hidden | Out-Null

Write-Host "cbm-reindex: started background rebuild for $Name (mode=$Mode)"
exit 0
