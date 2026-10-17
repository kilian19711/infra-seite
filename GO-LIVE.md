# Go-Live-Checkliste Website-Relaunch

Offene Punkte vor dem Livegang. Erledigtes abhaken.

## Login & Sicherheit (Redaktion)
- [ ] **Richtiges Login einrichten: SSO (Microsoft Entra ID / Azure AD) oder E-Mail + Passwort mit MFA** statt nur Magic-Link.
      Aktuell (Testphase): E-Mail + Passwort ohne MFA. Supabase → Authentication → Providers → Azure aktivieren,
      danach in `src/lib/cms.js` `signIn()` auf `signInWithOAuth({ provider: 'azure' })` umstellen.
- [ ] Schutz vor geleakten Passwörtern einschalten: Authentication → Providers → Email → „Leaked password protection“.
- [ ] Registrierung sperren: Authentication → Sign In / Providers → „Allow new users to sign up“ aus.
- [ ] URL Configuration: Site URL `https://infrastructure-systemhaus.de` (für Passwort-Reset-Mails).
- [ ] Redakteure anlegen (Authentication → Users → Add user → Create new user, „Auto Confirm“), zuerst kilian.ulmer@l-mobile.com.
- [ ] Rollen: aktuell darf jeder angemeldete Redakteur alles. Bei größerem Team Rollen (Autor/Freigabe) ergänzen.
- [ ] Supabase-Projekt von privater Organisation „Kilian“ in Firmen-Organisation übertragen, Tarif mit Backups (Pro).

## Redaktionssystem / KI
- [ ] `LANGDOCK_API_KEY` als Edge-Function-Secret setzen, Modellname (`LANGDOCK_MODEL`) und Endpoint prüfen.
- [ ] Automatik erst einschalten, nachdem einige KI-Entwürfe von Hand geprüft wurden (Faktentreue, Ton). Anfangs max. 1 Beitrag/Tag, Relevanz ≥ 8.
- [ ] Sophos-Feed ersetzen (aktuelle URL leitet ins Leere).
- [ ] Automatischer Rebuild beim Veröffentlichen (Deploy-Hook), damit Google die fertige HTML-Seite bekommt.

## Inhalte & Freigaben
- [ ] Google-Bewertungen einmalig übernehmen: Bewertung, Anzahl und Texte in `GOOGLE_SNAPSHOT` (`src/pages/HomeSections.jsx`) eintragen.
- [ ] Beispiel-Bewertungen in `src/pages/HomeSections.jsx` (`REVIEWS`, `example: true`) löschen, sobald echte vorliegen.
- [ ] Freigaben Partner- und Kundenlogos, Kundenbewertungen (Name, Funktion, Firma).
- [ ] Schnell-Check-Fragen und Phishing-Szenarien fachlich gegenlesen.
- [ ] Phishing-Training öffentlich oder intern?
- [ ] Menü-Kurztexte und selbst formulierte Texte gegenprüfen.

## Technik
- [ ] **Englisch-Modus komplett übersetzen**: alle Seiteninhalte, Startseiten-Bereiche, Werkzeuge, Meta-Titel/Beschreibungen (+ hreflang). Bisher übersetzt der DE/EN-Schalter nur Menüs und Support-Panel – sonst Schalter vor Go-live ausblenden.
- [x] HubSpot-Meeting-Link eingebunden (aktuell Lucas baramundi-Kalender) – ggf. durch allgemeinen Kalender / Round-Robin ersetzen.
- [ ] Datenschutzinformation um HubSpot Meetings (Cookies, USA-Übermittlung) und den Cookie-Hinweis ergänzen.
- [ ] Kontaktformular anbinden (aktuell Demo, nichts wird versendet). Terminbuchung läuft über HubSpot.
- [ ] Hosting festlegen; `.htaccess` gilt nur für Apache.
- [ ] Prerendering aller Seiten (nicht nur Aktuelles) für beste Auffindbarkeit.
- [ ] Lizenzen der übernommenen Bilder/Stockfotos prüfen; Logo als Original-Vektordatei vom Marketing.
- [ ] Impressum/Datenschutz aktualisieren (Supabase, Langdock als Auftragsverarbeiter, Login-Cookies).

## Kontaktformular → infrastructure@l-mobile.com (aktuell Zwischenlösung Supabase+Resend – zum Go-live wird der Versand anders gelöst)
- [ ] Resend-Konto: Domain (z. B. infrastructure-systemhaus.de) verifizieren (DNS-Einträge)
- [ ] Supabase-Secrets setzen: `RESEND_API_KEY`, `CONTACT_FROM` (z. B. `Website <website@infrastructure-systemhaus.de>`)
- [ ] Testanfrage senden
