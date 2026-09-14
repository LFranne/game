# Handoff: Ab ins Grüne – Postkarten-Generator

Stand: 2026-09-14. Dieses Dokument fasst den kompletten bisherigen Arbeitsstand zusammen, damit eine andere KI/Session ohne den ursprünglichen Chatverlauf nahtlos weiterarbeiten kann.

## Was das ist

Ein reiner Frontend-Prototyp (vanilla HTML/CSS/JS, **keine** Build-Tools, **keine** npm-Dependencies, **kein** Backend) für einen digitalen Postkarten-Generator für die Ferienmarke „Ab ins Grüne" (Bad Wildbad, Schwarzwald). Vollständige Produktanforderungen: siehe [`PRD.md`](./PRD.md) im selben Ordner.

Kurzfassung des Kern-Flows: Gast lädt eigenes Foto hoch → Foto wird in eine Postkarte im Markendesign eingebaut → Empfänger + Nachricht eintippen → Karte umdrehen (Vorder-/Rückseite) → Vorschau → Teilen/Export als Bild. Kein Login, keine Datenbank, keine Speicherung vergangener Postkarten, kein E-Mail-Versand, keine Social-Media-Integration (siehe PRD, explizit ausgeschlossen für diesen Prototyp).

## Repo-Struktur

```
postkarte.html / .css / .js     ← der Postkarten-Generator (das eigentliche Projekt)
assets/                         ← Original-Logo-SVGs (unverändert aus dem Brand-Ordner kopiert)
index.html / style.css / game.js ← unabhängiges, komplett separates Mini-Projekt (Pac-Man-Spiel,
                                    nichts mit dem Postkarten-Generator zu tun, nicht anfassen)
docs/
  PRD.md                        ← vollständige Produktanforderungen (deutsch)
  HANDOFF.md                    ← dieses Dokument
  Ab_ins_Gruene_Brand_Guideline.pdf ← komplettes Brand Book (Original)
```

Das Repo ist ein Git-Repository (`git log` zeigt nur die zwei Pac-Man-Commits — **alle Postkarten-Dateien sind bisher nicht committet**, nur lokal auf der Platte). Falls Versionsstände gesichert werden sollen: `git add postkarte.* assets/ docs/` + commit.

Es gibt **keinen Build-Prozess**: `postkarte.html` kann direkt im Browser geöffnet werden, oder über einen simplen statischen Server (`python -m http.server`) für zuverlässigeres `fetch`/Asset-Verhalten.

## Marken-Vorgaben (verbindlich, siehe Brand-Guideline-PDF in `docs/`)

**Farben** (als CSS Custom Properties in `postkarte.css`, `:root`):

| Token | Hex | Verwendung |
|---|---|---|
| `--c-wald` | `#253C28` | Hauptfarbe, Logo, Kernkommunikation |
| `--c-wald2` | `#4A613C` | Sekundär-Grün |
| `--c-wald3` | `#7C8E51` | großflächige, ruhige Hintergründe |
| `--c-fichte` | `#BBD034` | kräftige Akzentfarbe |
| `--c-graphite` | `#202829` | Text/Logo auf hellem Grund |
| `--c-dust` | `#F2EFED` | heller Hintergrund („Postkarten-Papier") |
| `--c-white` / `--c-gold` `#A17621` / `--c-gold2` `#D4A12C` / `--c-gold3` `#FFD962` | Akzente |

**Typografie** (Google Fonts, per `<link>` in `postkarte.html` geladen, mit System-Font-Fallback in CSS):
- **Zilla Slab** — Überschriften, Zitate
- **Asap Condensed** — Fließtext, UI, Tabellen

**Logo-Regeln (verbindlich):**
- Nur freigegebene Farbvarianten: Graphite, Wald, Wald3, Fichte, **Dust** (Dust-Variante nur auf **dunklem** Hintergrund).
- Immer Original-SVG verwenden, nicht strecken/verzerren/einfärben/mit Schatten versehen.
- Ausreichend Freiraum um das Logo lassen; nicht auf unruhigem Fotountergrund ohne Schutzfläche platzieren.
- Verfügbare Logo-Dateien liegen bereits in `assets/` (aus dem originalen Corporate-Design-Ordner kopiert, unverändert): `AIG_logotype_signet_links_wald.svg`, `AIG_logotype_signet_links_dust.svg`, `AIG_signet_wald.svg`, `AIG_signet_dust.svg`. Weitere Logo-Varianten (Farben/Layouts) existieren im Original-Ordner, siehe PDF S. 23–25, sind aber noch nicht in dieses Projekt kopiert.
- **Wichtiger technischer Hinweis:** Diese SVGs haben **kein** `width`/`height`-Attribut, nur ein `viewBox`. Deshalb ist `img.naturalWidth`/`naturalHeight` beim Zeichnen auf `<canvas>` browserabhängig unzuverlässig. In `postkarte.js` sind die Seitenverhältnisse deshalb als Konstanten fest codiert (`LOGO_FULL_RATIO = 559/103`, `LOGO_SIGNET_RATIO = 122.46/103`, direkt aus den `viewBox`-Werten der SVG-Dateien). Bei einem Logo-Austausch müssen diese Konstanten entsprechend angepasst werden.

**Markenton:** warm, hochwertig, „nie steril" — Leitsatz: *„Nicht einfach übernachten. Den Schwarzwald persönlich erleben."*

## Architektur (aktueller Stand)

- **State-Objekt** in `postkarte.js`: `{ photo, crop, recipientName, senderName, message, side, format }`.
- **Crop-Invariante:** `state.crop` ist ein Rechteck `{ sx, sy, sw, sh }` in **Naturpixeln des Originalfotos** und gehört immer zum aktuellen `state.photo`. Erzwungen durch eine einzige Schreibstelle `setPhoto(img, crop)` — `state.photo` und `state.crop` dürfen **nie einzeln** gesetzt werden. Bewusst ein Rechteck statt eines fertig zugeschnittenen Bildes: nur ein Resampling (Original → Karte) statt zwei, kein zweites Vollbild-Canvas im Speicher (relevant bei 12-MP-Handyfotos), nachträgliches Ändern bleibt möglich — und der **Export braucht null Sonderbehandlung**, weil das Vorschau-Canvas die Exportquelle ist.
- **Layout-Geometrie der Vorderseite** liegt in der reinen Funktion `getFrontLayout(w, h)` → `{ margin, bandHeight, frame, photo }`. `renderFront()` und der Zuschneide-Dialog nutzen dieselben Zahlen ohne Duplizierung. `getCropAspect()` liefert daraus das Seitenverhältnis des Foto-Ausschnitts im **aktuellen** Format — das ist **nicht** das Kartenverhältnis: quer ≈ 1,800 (Karte 1,414), hoch ≈ 0,828 (Karte 0,707), weil Rand und Markenband Höhe wegnehmen.
- **Zwei `<canvas>`-Elemente** (`#canvas-front`, `#canvas-back`), die gleichzeitig Live-Vorschau **und** Exportquelle sind — kein separater Export-Renderer.
- **Adaptives Kartenformat:** zwei feste Formate (`FORMATS.landscape = 1697×1200`, `FORMATS.portrait = 1200×1697`, gleiches Pixelbudget, nur transponiert). `pickFormat(imgW, imgH)` wählt anhand des Seitenverhältnisses des hochgeladenen Fotos (mit Toleranzband für „nahezu quadratisch" → Querformat). `applyFormat(key)` setzt **beide** Canvases + das CSS-`aspect-ratio` immer gemeinsam, damit Vorder-/Rückseite strukturell nie unterschiedliche Maße haben können — auch nicht nach dem Flip (der nur eine CSS-`rotateY`-Drehung ist, keine Größenänderung).
- **Foto-Upload + Zuschneide-Flow:** `FileReader` → `Image` → **Zuschneide-Dialog** → State → Re-Render. Rein client-seitig, kein Server-Upload. Die Reihenfolge im Upload-Handler ist **zwingend**:

  ```
  Snapshot sichern (photo, crop, format)   // VOR jeder Änderung, sonst sichert Abbrechen den neuen Zustand
   → applyFormat(pickFormat(...))          // Format steht
   → getCropAspect()                       // erst jetzt bekannt, hängt am Format
   → coverFit(...)                         // Startwert = bisheriges Verhalten (mittig)
   → setPhoto(img, base) → openCropDialog(snapshot)
  ```

  `pickFormat()` bewertet weiterhin das **Original**-Verhältnis, nicht den Zuschnitt — sonst entstünde eine Zirkelabhängigkeit (Crop-Ratio hängt vom Format ab, Format vom Crop).
- **Zuschneide-Dialog:** natives `<dialog>` + `showModal()` (liefert Fokusfalle, Escape, Top-Layer und inerten Hintergrund ohne selbstgebaute Logik). Markup steht am Ende von `<body>` **außerhalb von `.layout`** — `.postcard-flip` setzt `perspective` und `.postcard-flip-inner` ein `transform`, beides erzeugt einen Containing Block, in dem ein Overlay falsch säße.
  - **Zoom/Pan-Modell:** nicht das Rechteck direkt manipulieren, sondern `{ zoom, cx, cy }` halten und ableiten (`sw = base.sw / zoom`, Mittelpunkt geklemmt auf `[sw/2, imgW - sw/2]`). Dadurch ist „das Bild füllt den Ausschnitt immer vollständig" eine **Konstruktionseigenschaft**: `coverFit()` liefert `base.sw ≤ imgW`, für `zoom ≥ 1` gilt also `sw ≤ imgW`, die Klemmgrenzen können nie invertieren. Zoom läuft immer mit Ankerpunkt (Bildpunkt unter Cursor/Finger-Mittelpunkt bleibt stehen), gemeinsamer Pfad für Mausrad, Pinch und Slider.
  - **Abbrechen = exakt der Zustand davor** (Snapshot inkl. Format zurückspielen): erster Upload + Abbrechen → leerer Platzhalter; Foto ersetzen + Abbrechen → altes Foto, alter Zuschnitt, altes Format.
  - **Nachträglich ändern** über den Button „Ausschnitt anpassen" in der Formularspalte (sichtbar sobald ein Foto existiert). Bewusst **nicht** per Klick auf die Karte — diese Fläche hat bereits den Flip-Handler.
  - **Nicht anfassen, sonst bricht es:** `touch-action: none` auf `#crop-canvas` (sonst scrollt/zoomt auf dem Smartphone die Seite statt des Ausschnitts); `wheel`-Listener mit `{ passive: false }` (sonst wird `preventDefault()` ignoriert); Pointer-Umrechnung über `getBoundingClientRect()`, **nicht** über `canvas.width` (sonst läuft das Verschieben um den `devicePixelRatio`-Faktor daneben); `cropLastDist` bei `pointerup`/`pointercancel` zurücksetzen (sonst Sprung beim Abheben eines Fingers); `photoInput.value` beim Schließen leeren (sonst lässt sich dieselbe Datei nicht erneut wählen).
- **Absender („Von"):** `state.senderName`, Eingabefeld mit `maxlength="40"` wie beim Empfänger. Auf der Rückseite sitzt der Empfänger auf Adresslinie 1–2, **„Von: …" auf Linie 3**. Nutzt dieselbe `fitLines()`-Überlaufsicherung (`maxLines: 1` + Präfix-Parameter) — kein eigener Umbruchcode. Erweitert bewusst den PRD-Scope (dort nur Empfänger und Nachricht); war im HANDOFF als rückfragepflichtig markiert und ist mit dem Umsetzungsplan zu wishpost.one entschieden worden.
- **Klebende Vorschau (mobil):** `.preview-column` ist unterhalb des 900px-Umbruchs `position: sticky; top: 0`, damit die Karte beim Tippen nicht wegscrollt. Die Kartenhöhe ist auf **50vh** begrenzt (`width: min(100%, calc(50vh * var(--card-aspect)))`, `--card-aspect` wird von `applyFormat()` gesetzt), damit darunter genug Platz für die Bedienelemente bleibt — die Referenz wishpost.one belegt dafür 63–78 % der Viewporthöhe, das ist zu viel. **Achtung:** Dieser Media-Query-Block muss in `postkarte.css` **nach** `.postcard-flip { width: 100% }` stehen — Media Queries erhöhen die Spezifität nicht, bei gleicher Spezifität gewinnt die spätere Regel. Stand er davor, wurde die Höhenbegrenzung im Hochformat wirkungslos (genau dieser Fehler ist bei der Umsetzung aufgetreten und wurde behoben).
- **Unteres Marken-Band der Vorderseite:** Das „Band“ ist mit `COLORS.dust` gefüllt — **derselben Farbe wie der Kartenhintergrund**, es ist also gar nicht sichtbar. Optisch sichtbar ist nur die freie Fläche vom unteren Rand des Fotorahmens bis zur Kartenunterkante, und die ist um `margin` höher als `bandHeight`. Der Stapel aus Logo + Grusstext wird deshalb in `h - bandY` zentriert, **nicht** in `bandHeight` — sonst sitzt er sichtbar zu hoch (genau dieser Fehler wurde korrigiert).

- **`[hidden] { display: none !important; }`** ist nötig, weil `.btn { display: inline-flex }` das `hidden`-Attribut sonst überschreibt (betrifft „Ausschnitt anpassen").
- **Flip-Mechanik:** CSS-3D-Flip (`perspective` + `transform-style: preserve-3d` + `rotateY(180deg)`). Wichtig: `.postcard-face` (Rotation + `backface-visibility`) und `.postcard-face-clip` (Zuschnitt/`border-radius`/`overflow:hidden`) sind bewusst auf **zwei verschachtelte Elemente** aufgeteilt — eine Kombination aus `backface-visibility:hidden` + `overflow:hidden` + 3D-`transform` auf demselben Element ist ein bekannter WebKit/Safari-Bug, der zu einer spiegelverkehrten Rückseite führte. Zusätzlich `-webkit-`-Präfixe als Absicherung. **Nicht** wieder zusammenführen.
- **Rendering:** `renderFront()`/`renderBack()` zeichnen bei jeder State-Änderung komplett neu, berechnen alle Positionen/Größen als Anteil von `canvas.width`/`canvas.height` (nicht absolute Pixelwerte) — dadurch funktioniert das adaptive Format ohne separate Layout-Logik pro Format.
- **Web-Font-Handling:** `document.fonts.ready.then(() => renderAll())` am Ende von `postkarte.js` — Canvas-Text wartet nicht automatisch auf Font-Ladeende, ohne diesen Hook könnte Text mit falschen Fallback-Metriken gezeichnet/umgebrochen werden.
- **Teilen/Export:** `buildCombinedCanvas()` stapelt Vorder- und Rückseiten-Canvas vertikal in ein Offscreen-Canvas (→ ein Bild mit beiden Seiten, niemand muss „welche Seite teilen" entscheiden). `sharePostcard()` nutzt `navigator.share` mit Datei (Web Share API, v.a. Mobile) und fällt auf einen Datei-Download (`<a download>` + `URL.createObjectURL`) zurück, wenn Web Share nicht verfügbar ist. `renderAll()` wird direkt vor dem Export nochmal aufgerufen, um sicherzustellen, dass garantiert der aktuelle State exportiert wird.

## Bisherige Iterationen (Kurzchronologie)

1. **Erster Prototyp gebaut** — Grundfunktionen wie im PRD (Upload, Vorder-/Rückseite, Flip, Formularfelder, Teilen), mit Platzhalter-Branding (da zu dem Zeitpunkt noch keine echten Markenassets vorlagen).
2. **Echte Markenassets eingebaut** — echte Farben/Fonts/Logo-SVGs aus dem Brand-Book übernommen (siehe oben).
3. **Design-Korrekturen (Iteration 2):** Header-Logo (war auf dunklem Hintergrund kaum sichtbar → helle Dust-Variante, größer), großflächige Tannen-/Landschafts-Clipart auf der Vorderseite entfernt (passte nicht zum hochwertigen Markenauftritt), Logo/Grußtext-Überlappung im unteren Band der Vorderseite behoben (Ursache: Schriftgröße war massiv zu groß berechnet — jetzt vertikal gestapelt statt nebeneinander).
4. **Kern-Flow-Korrekturen (Iteration 3, aktueller Stand):**
   - Adaptives Kartenformat (siehe Architektur oben) statt starrem Hochformat.
   - Flip-Spiegelung behoben (WebKit-Bug, siehe Architektur oben).
   - Datenfluss Empfänger/Nachricht → Rückseite → Export abgesichert (Font-Ready-Re-Render + expliziter Re-Render vor Export).
5. **Redesign nach Referenzbildern (Iteration 4) — durchgeführt, dann auf Nutzerwunsch wieder verworfen.** Der Nutzer zeigte drei Screenshots eines Instagram-Reels („postcard generator" von `design4me_`) als visuelle Referenz: gerissene/Deckle-Kante um die ganze Karte, Foto füllt fast die komplette Vorderseite mit Logo/Text direkt auf dem Foto überlagert (statt separatem Band), runder „Postmark"-Stempel mit Kreistext, Briefmarke mit Landschaftsmotiv, Umschlag-Share-Screen. Diese Ideen wurden in `postkarte.js` umgesetzt (neue Funktionen `drawDeckledRect`, `drawCircularText`, `drawPostmark`, erweiterte `drawStamp`, komplett neue `renderFront`/`renderBack`) — **wurden aber danach per „gehe zurück zur vorherigen Version" komplett rückgängig gemacht.** `postkarte.js` ist wieder auf dem Stand von Punkt 4. `postkarte.html`/`.css` waren von diesem Redesign nie betroffen.
   - Die Referenzbilder selbst liegen nicht mehr als Datei vor (waren temporäre Chat-Anhänge, nicht in `Downloads` gespeichert) — die obige Beschreibung ist alles, was davon dokumentiert ist. Falls die Foto-dominante/Deckle-Kanten-Richtung später doch gewünscht ist, müsste sie neu inspiriert/beschrieben werden.
   - **Explizite Scope-Entscheidungen aus dieser Iteration, die für künftige Arbeit relevant bleiben:** kein neues „Von"-Feld (Absendername) hinzufügen ohne Rückfrage — das wäre ein neues Formularfeld, kein reines Redesign (**inzwischen entschieden und in Iteration 5 umgesetzt**); keine Comic-/Cartoon-Sticker (passt nicht zur Brand-Bildsprache „hochwertig, nie steril").

6. **Referenzanalyse wishpost.one + Paket A (Iteration 5, aktueller Stand).** Grundlage: `~/.claude/plans/analysiere-die-seite-https-wishpost-one-wild-charm.md` (Analyse der Referenz + beschlossener Umsetzungsplan). Umgesetzt wurden genau die dort beschlossenen sechs Schritte:
   1. `capture="environment"` aus dem Datei-Input entfernt — öffnete auf Android direkt die Kamera statt der Galerie, Widerspruch zum PRD. `accept="image/*"` bleibt.
   2. `getFrontLayout()` / `getCropAspect()` extrahiert (reines Refactoring, Geometrie bit-identisch verifiziert).
   3. `state.crop` + `setPhoto()` eingeführt (siehe Crop-Invariante oben).
   4. Zuschneide-Dialog gebaut (siehe oben) — schließt die größte Lücke gegenüber der Referenz: vorher schnitt `coverFit()` immer mittig zu, bei Panoramafotos verschwand ein Großteil des Motivs.
   5. Absender-Feld ergänzt.
   6. Klebende Vorschau mobil.

   **Bewusst *nicht* übernommen** (in der Analyse begründet): mehrere Kartenstile, Sepia-/Retro-Fotofilter und Handschrift-Typografie (widersprechen dem Brand Book bzw. sind eine offene Markenfrage, keine Umsetzungsentscheidung); Supabase-Persistenz und Link-Versand (PRD schließt Konten/Datenbank/Backend aus — Phase-2-Thema); der Umbau der Flip-Mechanik. Die Referenz löst den Flip zwar architektonisch sauberer (Rotation 0° → 90°, Seitentausch per `opacity`/`visibility` am Scheitelpunkt, dadurch kein `preserve-3d`/`backface-visibility` nötig), **unserer funktioniert aber und ist verifiziert** — der Warnkommentar im CSS schützt vor dem Rückfall. Von der Texteingabe wurde nichts übernommen: die Referenz hat **kein einziges `maxlength`**, lässt Namen mitten im Buchstaben über den Kartenrand laufen und verliert überlange Nachrichten stillschweigend — unser Stand ist dort nachweislich besser.

7. **Teilen-Ausbau, Stufe 1 (Iteration 6, aktueller Stand).** Bewusst **ohne Backend** — die Variante mit teilbarem Link und drehbarer Karte wurde besprochen und auf später vertagt (siehe unten).
   - **Story-Format 9:16** (`buildStoryCanvas()`, 1080×1920) als zweite Exportvariante für Instagram Story und WhatsApp-Status: Markenverlauf als Hintergrund, Vorder- und Rückseite mit runden Ecken und Schatten darauf gestapelt, Dust-Logo unten. `buildCombinedCanvas()` bleibt unverändert die Quelle des normalen Exports und wird hier **nicht** wiederverwendet — dessen wald-farbene Fläche läge sonst als dunkler Kasten auf dem Verlauf.
   - **Format-Umschalter** („Beide Seiten“ / „Story 9:16“) steuert `shareFormat`; `sharePostcard()` wählt Quelle und Dateiname danach aus.
   - **WhatsApp- und E-Mail-Button.** Wichtig zu wissen: diese Links können **technisch kein Bild anhängen**, sie öffnen nur eine vorformulierte Nachricht. Der Weg mit Bild bleibt `navigator.share` (Teilen-Dialog des Geräts), der auf dem Smartphone WhatsApp, Instagram & Co. ohnehin selbst anbietet. Die Oberfläche sagt das über einen Hinweistext auch so.
   - **Layout-Umbau als Folge:** Die Teilen-Bedienung sitzt jetzt in der **Formularspalte**, nicht mehr in der Vorschauspalte. Grund: die Vorschauspalte klebt mobil am oberen Rand, und `position: sticky` kann nur innerhalb der eigenen Elternbox wandern — alles, was nicht mitkleben soll, muss die Spalte wirklich verlassen. Mit den neuen Bedienelementen in der Vorschau stieg deren Höhe auf **84 % der Viewporthöhe** im Hochformat (gemessen bei 375×812) und verdrängte die Formularfelder — genau der Fehler, den Schritt 6 des wishpost-Plans vermeiden wollte. Nach dem Umbau: **41 % quer, 61 % hoch.** In der Vorschauspalte bleiben nur Karte und „Karte umdrehen“.
   - Einschränkung des Story-Formats: Im **Hochformat** belegen die beiden gestapelten Karten nur rund **50 % der Story-Breite** — zwei Hochkant-Karten übereinander sind in 9:16 zwangsläufig sehr hoch. Der Nachrichtentext ist dort auf dem Handy klein. Im Querformat ist das unkritisch. Falls das stört, wäre ein eigenes Story-Layout nötig (z. B. nur Vorderseite groß), nicht nur ein anderer Skalierungsfaktor.

8. **Briefmarken-Varianten, Sticker und WhatsApp/E-Mail-Buttons — gebaut und auf Nutzerwunsch wieder entfernt (Iteration 7).** Umgesetzt waren: drei Briefmarken-Varianten (Gold / Wald / Natur) mit in Rand und Motiv aufgeteiltem `drawStamp()`, vier Sticker (Tanne, Berg, Sonne, Herz) mit automatischer Platzierung in den Fotoecken, Auswahl je über gerenderte Mini-Vorschauen, sowie Direkt-Buttons für WhatsApp und E-Mail. **Alles wieder zurückgebaut** — `postkarte.js/.html/.css` sind an diesen Stellen auf dem Stand von Iteration 6: eine einzige goldene Briefmarke mit Signet, keine Sticker, keine Messenger-Buttons.

   Auch der ebenfalls in dieser Runde ergänzte Button „Bild speichern“ wurde auf Nutzerwunsch wieder entfernt. Geblieben ist davon nur die interne Aufteilung des Exports in `currentExport()` (Canvas + Dateiname je nach Format) und `saveBlob()`, beide nur noch von `sharePostcard()` genutzt. **Teilen läuft damit wieder über genau einen Button**, der den Teilen-Dialog des Geräts nutzt und sonst als Datei speichert.

   Zwei Erkenntnisse, die beim nächsten Anlauf Zeit sparen:
   - Eine **helle Briefmarke braucht zwingend eine Kontur**. Der Kartengrund ist ebenfalls `dust`; ohne Strich verschwindet die Perforation und die Marke liest sich nicht mehr als Briefmarke. (Dieselbe Falle wie beim unsichtbaren Markenband, siehe oben.)
   - **Frei verschiebbare Sticker sind ein eigenes Vorhaben**, kein Nebenprodukt: die Kartenfläche trägt bereits den Flip-Handler, freies Platzieren bräuchte Trefferprüfung, eigenen Drag-Zustand und ein Unterdrücken des Flips. Die umgesetzte Variante platzierte deshalb automatisch in den Ecken.

## Offene Idee: Teilen per Link (Phase 2)

Besprochen und bewusst zurückgestellt. Falls es später kommen soll, sind das die festgehaltenen Erkenntnisse:

- **Instagram und TikTok nehmen von einer Website aus keine Links entgegen** — weder Feed noch Story. Dafür bleibt der Bild-/Story-Export der einzige Weg. Links lohnen sich für WhatsApp, Telegram, Signal, E-Mail, SMS und Facebook.
- Ein Link braucht zwingend **Speicherung der Karte** (die URL kann das Foto nicht tragen — selbst stark komprimiert ergibt das zehntausende Zeichen) **und eine serverseitig ausgelieferte Vorschau**: WhatsApps Crawler führt kein JavaScript aus, ohne `og:image` aus dem Server erscheint nur ein nackter Link. Genau dieses Vorschaubild ist aber der Werbeeffekt, um den es dem PRD geht.
- Minimale Bauform wäre Objektspeicher + eine kleine serverlose Funktion; die Freigabeseite könnte das vorhandene `.postcard-flip`-Markup unverändert wiederverwenden, wenn Vorder- und Rückseite als Bilder abgelegt werden.
- **Das bricht bewusst den PRD-Scope** (dort sind Konten, Datenbank und Backend ausgeschlossen) und bringt DSGVO-Pflichten mit: Gästefotos sind personenbezogene Daten — EU-Hosting, Löschfrist, Löschmöglichkeit, Hinweis im Flow. Ohne Konten gilt außerdem: wer den Link hat, sieht die Karte.

## Bekannte Einschränkungen / offene Punkte

- **Bis einschließlich Iteration 4 gab es keinen Zugriff auf ein Browser-Werkzeug.** Alle Änderungen wurden nur statisch geprüft (`node --check` für JS-Syntax, lokaler HTTP-Server + `curl` für Ressourcen-Erreichbarkeit, manuelle Code-Durchsicht der Canvas-Mathematik). **Das tatsächliche visuelle Ergebnis im Browser wurde nie automatisiert getestet** — der Nutzer hat es selbst im Browser geprüft und dabei die Probleme gefunden, die in Iteration 3 behoben wurden. Nach jeder weiteren Änderung sollte im Browser gegengeprüft werden (Desktop + mobile Breite ~375px, idealerweise auch Safari/iOS wegen des Flip-Fixes).
- **In Iteration 5 stand erstmals ein Browser-Werkzeug zur Verfügung.** Automatisiert gegengeprüft wurden: Geometrie-Gleichheit des Refactorings (bit-identisch), Zuschnitt-Invariante über den gesamten Zoom-Bereich und an allen Pan-Grenzen, Ankunft des Zuschnitts in Vorschau **und** Export (pixelgleich), alle Abbrechen-Pfade inkl. Formatwechsel, Empfänger/Absender kurz – 40 Zeichen – überlanges Einzelwort in beiden Formaten (kein Überlauf über den Kartenrand), klebende Vorschau bei 375 px sowie Unverändertheit des Desktop-Zweispalters. Panorama-Fotos (4000×1100) sind damit **nicht mehr** wie früher auf die Bildmitte festgelegt.
- **Vom Browser-Werkzeug *nicht* prüfbar und daher offen:** Escape zum Schließen des Dialogs — die synthetischen Tastendrücke der Automatisierung lösen Chromes Close-Watcher nicht aus (gegengeprüft mit einem leeren `<dialog>` ohne eigene Listener: verhält sich identisch, ist also eine Werkzeug-Grenze, kein Code-Fehler). Der `cancel`-Handler selbst ist verifiziert (Event direkt ausgelöst → Dialog schließt, Snapshot wird zurückgespielt). **Am echten Gerät gegenprüfen.**
- Weiterhin unbestätigt/zu prüfen: Kontrast von Logo/Grußtext auf sehr hellen oder sehr dunklen Fotos, Web-Share-Verhalten auf echten Mobilgeräten (iOS Safari, Android Chrome), **Pinch-Zoom und Ziehen auf echten Touch-Geräten** (nur mit synthetischen Pointer-Events bzw. Maus getestet), sowie die **EXIF-Orientierung von iPhone-Fotos** — betrifft schon den bisherigen Code, wird durch den Zuschnitt aber erstmals sichtbar.
- Kein Zugriff auf eine echte Instagram-/Social-Media-Vorschau — falls „Teilen" später mit Link-Preview-Metadaten (Open Graph) erweitert werden soll, ist das noch nicht umgesetzt (auch bewusst außerhalb des PRD-Scopes für den ersten Prototyp).

## Arbeitspräferenzen des Nutzers (aus dem bisherigen Verlauf)

- **Keine neuen Features ungefragt hinzufügen**, wenn explizit nur Korrekturen/Redesign angefragt sind — der Nutzer hat das mehrfach betont (z. B. „Bitte jetzt keine zusätzlichen Funktionen wie Sticker, Filter, weitere Texte, Social-Media-Auswahl oder ähnliches hinzufügen").
- Referenzbilder/-vorlagen sollen als **Inspiration**, nicht 1:1 kopiert werden — Markenfarben/Logo/Typografie aus dem Brand Book haben immer Vorrang.
- Wichtige Design-/Architektur-Entscheidungen wurden über einen strukturierten Plan (Root-Cause-Analyse vor Umsetzung) vorab abgestimmt, bevor Code geändert wurde — bei größeren Änderungen ist dieses Vorgehen (erst analysieren/planen, dann konkret umsetzen) offenbar erwünscht.
- Vanilla HTML/CSS/JS, kein Build-Tool, keine npm-Dependencies — diese Konvention stammt ursprünglich vom bereits vorhandenen Pac-Man-Mini-Projekt im selben Repo und wurde bewusst fortgeführt.
