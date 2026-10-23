# Richtet die Website auf einer Windows-VM unter IIS ein. Als Administrator in PowerShell ausfuehren:
#   powershell -ExecutionPolicy Bypass -File .\install-iis.ps1
# Erwartet infra-website.zip im selben Ordner. Das IIS-Modul "URL Rewrite" muss vorher installiert sein (siehe ANLEITUNG.md).
$ErrorActionPreference = 'Stop'
$SiteName = 'infra-website'
$Target   = 'C:\inetpub\infra-website'
$Port     = 80
$Zip      = Join-Path $PSScriptRoot 'infra-website.zip'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Bitte PowerShell als Administrator starten.'
}
if (-not (Test-Path $Zip)) { throw "infra-website.zip nicht gefunden in $PSScriptRoot" }

# 1) IIS mit statischen Inhalten + Komprimierung (Windows Server bzw. Windows 10/11)
if (Get-Command Install-WindowsFeature -ErrorAction SilentlyContinue) {
  Install-WindowsFeature Web-Server, Web-Static-Content, Web-Default-Doc, Web-Http-Errors, Web-Stat-Compression, Web-Mgmt-Console | Out-Null
} else {
  'IIS-WebServerRole','IIS-WebServer','IIS-CommonHttpFeatures','IIS-StaticContent','IIS-DefaultDocument','IIS-HttpErrors','IIS-HttpCompressionStatic','IIS-ManagementConsole' |
    ForEach-Object { Enable-WindowsOptionalFeature -Online -FeatureName $_ -All -NoRestart | Out-Null }
}

# 2) URL Rewrite pruefen – ohne das Modul liefert IIS wegen der web.config nur Fehler 500.19
if (-not (Test-Path "$env:SystemRoot\System32\inetsrv\rewrite.dll")) {
  throw 'IIS URL Rewrite fehlt. Bitte zuerst installieren (ANLEITUNG.md, Schritt 2) und Skript erneut starten.'
}

# 3) Dateien entpacken (alte Version wird ersetzt)
if (Test-Path $Target) { Remove-Item "$Target\*" -Recurse -Force } else { New-Item -ItemType Directory $Target | Out-Null }
Expand-Archive -Path $Zip -DestinationPath $Target -Force

# 4) Website anlegen (Standardseite auf Port 80 wird gestoppt, damit es keinen Konflikt gibt)
Import-Module WebAdministration
if (Get-Website -Name 'Default Web Site' -ErrorAction SilentlyContinue) { Stop-Website -Name 'Default Web Site' }
if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
  New-Website -Name $SiteName -PhysicalPath $Target -Port $Port -Force | Out-Null
}
Start-Website -Name $SiteName

# 5) Firewall fuer HTTP im Firmennetz oeffnen
if (-not (Get-NetFirewallRule -DisplayName 'infra-website HTTP' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'infra-website HTTP' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Domain,Private | Out-Null
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
Write-Host "Fertig. Aufruf im Firmennetz: http://$ip/" -ForegroundColor Green
