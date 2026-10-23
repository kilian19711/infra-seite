# L-mobile Website auf der VM – Anleitung

Die Website läuft auf der VM mit einem kleinen Node.js-Server (`server.mjs`). Er liefert die Seite aus, startet jede Nacht um 2:00 Uhr neu und nimmt neue Versionen auf zwei Wegen an:

- **Upload-Seite** `http://<VM-IP>/admin` – auf die Kugel klicken oder den Ordner `dist` darauf ziehen
- **Upload-Ordner** auf der VM (Standard `C:\infra-website\upload`) – Build hineinkopieren, nach ca. 20 Sekunden ist er automatisch live

In beiden Fällen wird die neue Version erst komplett übernommen, dann ersetzt sie die alte – die alte wird gelöscht.

---

## 1. Auf der VM installieren (einmalig)

| Was | Woher | Hinweis |
|---|---|---|
| **Node.js LTS** (64-Bit) | https://nodejs.org → „LTS“ | Standard-Installer, alles mit *Weiter* bestätigen. Häkchen „Automatically install the necessary tools“ ist **nicht** nötig. |

Sonst nichts – kein IIS, keine Datenbank, kein Git.

Prüfen (neue PowerShell öffnen):
```
node -v
```
Es muss eine Versionsnummer erscheinen (z. B. `v22.x`).

## 2. Ordner auf die VM kopieren

Den Ordner `vm-server` per Remotedesktop kopieren (Strg+C auf dem PC → Strg+V auf der VM) nach **`C:\infra-website`**.

Danach liegen dort: `server.mjs`, `admin.html`, `run.cmd`, `install.ps1`, `ANLEITUNG.md`.

## 3. Einrichten

PowerShell **als Administrator** öffnen (Startmenü → „PowerShell“ → Rechtsklick → *Als Administrator ausführen*):

```
cd C:\infra-website
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

- Fragt nach einem **Passwort** für die Upload-Seite (mind. 8 Zeichen).
- Ist Port 80 schon belegt: `.\install.ps1 -Port 8080`
- Anderer Upload-Ordner, z. B. eine Netzwerkfreigabe: `.\install.ps1 -WatchDir "D:\website-upload"`

Am Ende stehen die Adressen da, z. B.:
```
Website:       http://10.0.0.25/
Upload-Seite:  http://10.0.0.25/admin
Upload-Ordner: C:\infra-website\upload
```

**Was das Skript am System ändert – nur das:**
- 1 Firewall-Regel „Infra-Website“ (eingehend, nur dieser Port – sonst erreichen andere Rechner die Seite nicht)
- 2 geplante Aufgaben: „Infra-Website“ (Start beim Hochfahren, auch ohne Anmeldung) und „Infra-Website Neustart 2 Uhr“

## 4. Neue Version veröffentlichen

Auf dem eigenen PC im Projekt:
```
npm.cmd run build
```
Dann **einer** dieser Wege:

**a) Upload-Seite** – `http://<VM-IP>/admin` öffnen, mit dem Passwort anmelden (Benutzername egal), auf die Kugel klicken und `dist` wählen – oder den Ordner auf die Kugel ziehen. Der Ring um die Kugel zeigt den Fortschritt.

**b) Upload-Ordner** – den Ordner `dist` (oder seinen Inhalt) nach `C:\infra-website\upload` kopieren. Der Server prüft alle 10 Sekunden; sobald sich nichts mehr ändert, geht die Version live und der Upload-Ordner wird geleert. Status steht auf der Upload-Seite unter „Ordner-Status“.

> Der Upload-Ordner wird nach jeder Veröffentlichung **geleert** – dort nichts anderes ablegen.

## Übersicht auf der Upload-Seite
Besucher und Seitenaufrufe (heute, 14 Tage), meistbesuchte Seiten, CPU/RAM/Festplatte, Laufzeit, Server- und Systemdaten, Antwort-Codes, letzte Veröffentlichungen und Neustarts. Aktualisiert sich alle 10 Sekunden.

## Wartung
| Aufgabe | So geht's |
|---|---|
| Protokoll ansehen | Upload-Seite → Bereich „Protokoll“ (oder Ordner `logs\`) |
| Passwort / Port / Ordner ändern | `install.ps1` erneut ausführen |
| Server sofort neu starten | Aufgabenplanung → „Infra-Website Neustart 2 Uhr“ → *Ausführen* |
| Alles entfernen | Aufgaben „Infra-Website*“ und Firewall-Regel „Infra-Website“ löschen, Ordner löschen |

## Hinweise
- Die Upload-Seite läuft über HTTP: Das Passwort geht unverschlüsselt durchs Firmennetz → kein Passwort verwenden, das anderswo genutzt wird.
- Die VM braucht **ausgehend Internet** (Supabase für News/Redaktion, HubSpot-Kalender).
- Für einen Namen statt IP (`http://infra-website/`) bei der IT einen DNS-Eintrag anfragen.
