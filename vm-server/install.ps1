# Einmalige Einrichtung auf der VM. PowerShell als Administrator, im Ordner dieses Skripts:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
# Aendert am System nur: 1 Firewall-Regel (eingehend, nur dieser Port) + 2 geplante Aufgaben (Start beim Booten, Neustart 2:00).
param([int]$Port = 80)
$ErrorActionPreference = 'Stop'
$Dir = $PSScriptRoot

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Bitte PowerShell als Administrator starten.'
}
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'Node.js fehlt. Bitte die LTS-Version von https://nodejs.org installieren und das Skript erneut starten.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  throw "Port $Port ist schon belegt (z. B. durch IIS). Anderen Port waehlen: .\install.ps1 -Port 8080"
}

# Upload-Passwort festlegen (steht nur lokal in config.json)
$sec = Read-Host 'Passwort fuer die Upload-Seite /admin festlegen' -AsSecureString
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
if ($pw.Length -lt 8) { throw 'Bitte mindestens 8 Zeichen.' }
@{ port = $Port; password = $pw } | ConvertTo-Json | Set-Content -Path (Join-Path $Dir 'config.json') -Encoding UTF8

# Damit andere Rechner im Netz die Seite erreichen: genau eine eingehende Regel fuer diesen Port.
Get-NetFirewallRule -DisplayName 'Infra-Website' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'Infra-Website' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null

# Dauerbetrieb: beim Hochfahren starten (auch ohne Anmeldung), nachts um 2:00 neu starten.
$user = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Infra-Website' -Force -Principal $user -Settings $settings `
  -Trigger (New-ScheduledTaskTrigger -AtStartup) `
  -Action (New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$Dir\run.cmd`"" -WorkingDirectory $Dir) | Out-Null
# 2:00 – Node beenden; run.cmd startet ihn nach 5 s automatisch neu.
$restart = "if (Test-Path '$Dir\server.pid') { Stop-Process -Id (Get-Content '$Dir\server.pid') -Force -ErrorAction SilentlyContinue }"
Register-ScheduledTask -TaskName 'Infra-Website Neustart 2 Uhr' -Force -Principal $user `
  -Trigger (New-ScheduledTaskTrigger -Daily -At '02:00') `
  -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -Command `"$restart`"") | Out-Null

Start-ScheduledTask -TaskName 'Infra-Website'
Start-Sleep 3
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
$suffix = if ($Port -eq 80) { '' } else { ":$Port" }
Write-Host "Fertig. Website:  http://$ip$suffix/" -ForegroundColor Green
Write-Host "Upload-Seite:     http://$ip$suffix/admin" -ForegroundColor Green
