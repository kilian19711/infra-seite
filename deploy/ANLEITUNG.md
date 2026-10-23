# Website auf der Windows-VM hosten (Firmennetz)

Die VM reicht locker (2 vCPU, 4 GB RAM, 45 GB frei). Die Website ist ~9 MB.

## Was auf die VM muss

| Datei | Wofür |
|---|---|
| `infra-website.zip` | die fertige Website |
| `install-iis.ps1` | richtet alles automatisch ein |

## Schritte

1. **Beide Dateien** in einen Ordner auf der VM kopieren, z. B. `C:\install\`.
2. **IIS URL Rewrite 2.1 installieren** (einmalig, kostenlos von Microsoft):
   https://www.iis.net/downloads/microsoft/url-rewrite → „x64 Installer“ herunterladen und ausführen.
   *(Falls IIS noch nicht installiert ist: erst Schritt 3 ausführen – das Skript bricht dann mit Hinweis ab –, URL Rewrite installieren, Skript erneut starten.)*
3. **PowerShell als Administrator** öffnen und ausführen:
   ```
   cd C:\install
   powershell -ExecutionPolicy Bypass -File .\install-iis.ps1
   ```
4. Am Ende steht die Adresse, z. B. `http://10.0.0.25/` – im Firmennetz im Browser öffnen.

## Was das Skript macht
- IIS mit statischen Inhalten und Komprimierung aktivieren
- Website nach `C:\inetpub\infra-website` entpacken
- IIS-Website „infra-website“ auf Port 80 anlegen (Standardseite wird gestoppt)
- Windows-Firewall für Port 80 im Domänen-/Privatnetz öffnen

## Update einspielen
Neue `infra-website.zip` in denselben Ordner legen und das Skript erneut ausführen – es ersetzt die alten Dateien.

## Hinweise
- **Nur HTTP im Firmennetz** ist für einen internen Test okay. Für HTTPS braucht es ein Zertifikat (intern von eurer IT oder Let's Encrypt, sobald die Seite öffentlich ist); dann in IIS eine HTTPS-Bindung anlegen (HTTP→HTTPS-Umleitung bauen wir dann ein).
- **Schöner Name statt IP** (z. B. `http://infra-website/`): DNS-Eintrag bei eurer IT anfragen.
- Datenbank, Redaktion und News kommen weiter von Supabase (Internet). Die VM braucht also **ausgehend Internet**, sonst bleiben „Aktuelles“ und die Redaktion leer. HubSpot-Kalender ebenso.
