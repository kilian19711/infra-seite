# Website auf der VM – einmal einrichten, danach nur noch hochladen

## Einmalig auf der VM
1. **Node.js LTS** installieren: https://nodejs.org (Standard-Installer, alles Weiter).
2. Diesen Ordner `vm-server` auf die VM kopieren, z. B. nach `C:\infra-website\`.
3. PowerShell **als Administrator** öffnen:
   ```
   cd C:\infra-website
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```
   Fragt nach einem Passwort für die Upload-Seite. Ist Port 80 belegt: `.\install.ps1 -Port 8080`.
4. Angezeigt werden die Adressen, z. B. `http://10.x.x.x/` und `http://10.x.x.x/admin`.

Das Skript ändert am System nur: **eine** Firewall-Regel (eingehend, nur dieser Port – sonst kommen andere Rechner nicht durch) und zwei geplante Aufgaben (Start beim Hochfahren, Neustart täglich 2:00).

## Neue Version veröffentlichen (vom eigenen PC)
1. Lokal `npm.cmd run build`.
2. Im Browser `http://<VM-IP>/admin` öffnen, mit dem Passwort anmelden (Benutzername egal).
3. Den Ordner `dist` hineinziehen. Erst wenn alles oben ist, wird die alte Version ersetzt und gelöscht.

## Nützlich
- Log: `C:\infra-website\logs\server.log`
- Passwort ändern: `install.ps1` erneut ausführen.
- Entfernen: geplante Aufgaben „Infra-Website*“ und Firewall-Regel „Infra-Website“ löschen.
