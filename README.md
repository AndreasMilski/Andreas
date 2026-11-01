# Helfer – Zähler & Timer fürs iPhone

Kleine Web-App mit drei Werkzeugen:

- **Zähler**: beliebig viele Zähler mit Namen, +/−, Zurücksetzen
- **Stoppuhr**: mit Runden (schnellste grün, langsamste rot)
- **Timer**: Countdown mit Schnellwahl, Fortschrittsring, Alarmton, hält den Bildschirm wach

Alles wird lokal auf dem iPhone gespeichert, ohne Konto und ohne Server. Die App funktioniert auch offline.

## Aufs iPhone bringen

1. Auf GitHub im Repository: **Settings → Pages → Branch: `master` / `(root)` → Save**
   (Bei einem privaten Repository braucht GitHub Pages ein bezahltes Konto. Sonst das Repository auf „Public“ stellen.)
2. Nach etwa einer Minute ist die App erreichbar unter `https://<benutzername>.github.io/<repo>/`
3. Die Adresse auf dem iPhone in **Safari** öffnen → **Teilen-Knopf** → **„Zum Home-Bildschirm“**
4. Fertig: Die App startet jetzt mit eigenem Icon im Vollbild.

## Hinweis zum Timer

iOS pausiert Web-Apps im Hintergrund. Der Timer zählt zwar korrekt weiter, **der Alarmton kommt aber nur, wenn die App offen ist**.
Deshalb ist „Bildschirm wach halten“ standardmäßig an.

## Lokal testen

```
python3 -m http.server 8000
```
Dann http://localhost:8000 öffnen.
