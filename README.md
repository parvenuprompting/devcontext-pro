# DevContext Pro

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square&logo=googlechrome)
![Version](https://img.shields.io/badge/Version-1.3.0-emerald?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)
![Security](https://img.shields.io/badge/Security-Data--Leak--Protected-brightgreen?style=flat-square)
![Auto Injection](https://img.shields.io/badge/Auto--Injection-Active-blueviolet?style=flat-square)
![Extraction History](https://img.shields.io/badge/Extraction--History-12__Items-orange?style=flat-square)
![Tech Stack](https://img.shields.io/badge/JavaScript-Vanilla-yellow?style=flat-square&logo=javascript)

> Premium Chrome Extensie voor het extraheren van schone DOM-context, componentstructuren en API-state

## 🎯 Overzicht

DevContext Pro is een professionele ontwikkelaarstool ontworpen om het proces van het extraheren van HTML-componenten, het opschonen van DOM-structuren en het vastleggen van API-state van webpagina's te stroomlijnen. Gebouwd met Manifest V3 en Side Panel API, biedt het een premium, glassmorphic interface met krachtige extractiemogelijkheden en automatische storingsherstel-injectie.

## ✨ Functionaliteiten

### 🔍 Scrape Component (`Alt+S`)
- Interactieve element-selector met visuele overlay
- Klik op een element om de HTML-structuur te extraheren
- Slimme formattering met juiste inspringing
- Eén-klik kopiëren naar klembord

### 🔲 Multi-Select Mode (`Alt+M`)
- Selecteer meerdere DOM-elementen op één pagina
- Verzamelt geselecteerde elementen in een georganiseerde context-bucket
- Gecombineerde export naar klembord

### 🧹 Clean DOM
- Verwijdert onnodige scripts, inline stijlen en SVG-paden
- Stript HTML-commentaren
- Geoptimaliseerd voor AI-context (klaar voor Gemini & ChatGPT)
- Configureerbare opschoonvoorkeuren

### 📊 Copy API State
- Extraheer `localStorage` en `sessionStorage`
- Leg `cookies` en ge-whiteliste framework-state vast (`__NEXT_DATA__`, `__NUXT__`, `__INITIAL_STATE__`, etc.)
- Geformatteerd als Markdown voor eenvoudig delen en documenteren

### ⚖️ Diff Mode
- Leg een DOM-snapshot vast vóór een interactie
- Voer een actie uit op de pagina en leg de veranderingen vast
- Genereer een overzichtelijke diff van gewijzigde en verwijderde attributen/elementen

### 🎨 Color Picker
- Geïntegreerde EyeDropper tool voor het selecteren van sRGB kleurencodes
- Houdt automatisch een geschiedenis bij van de laatste 12 gekozen kleuren

### ⚡ Quick Actions
- **TS Interface**: Genereer TypeScript prop interfaces van DOM-elementen
- **CSS Selector**: Extraheer unieke CSS-selectors en XPath
- **Network**: Leg actieve netwerkverzoeken vast
- **Markdown**: Exporteer elementen direct als schone Markdown-documentatie

### 🛡️ Ask AI (Met Data-Lek Beveiliging)
- Stuur gekopieerde DOM-context direct door naar Gemini of ChatGPT
- Gebruikt uitsluitend bewust geëxtraheerde snippets (geen blinde klembord-reads)
- Blokkeert gevoelige API-state snapshots automatisch om gegevenslekken te voorkomen

### 📜 Extractie-geschiedenis
- Houdt automatisch de laatste 12 geëxtraheerde items bij in de Side Panel
- Inclusief type-badges, timestamps en snelle "Copy" knop om eerdere snippets direct te hergebruiken

---

## 🚀 Installatie

### Vanuit de broncode

1. Clone of download deze repository
2. Open Chrome en ga naar `chrome://extensions/`
3. Schakel **Developer mode** in (rechtsboven)
4. Klik op **Load unpacked**
5. Selecteer de `devcontext-pro` map
6. Klik op het DevContext Pro werkbalkpictogram om de Side Panel te openen

---

## 💎 Gebruik

1. Open de DevContext Pro Side Panel in Chrome
2. Kies je gewenste actie:
   - **Scrape Component**: Klik om te activeren (`Alt+S`), klik vervolgens op een element op de pagina
   - **Multi-Select Mode**: Schakel in (`Alt+M`) om meerdere elementen achter elkaar te selecteren
   - **Clean DOM**: Kopieer direct de volledig opgeschoonde paginastructuur
   - **Copy API State**: Extraheer alle API-gerelateerde state-informatie
   - **Ask AI**: Stuur de laatst geëxtraheerde snippet door naar je favoriete AI-provider

### Voorkeuren

Configureer het extractiegedrag via het **Preferences** menu:
- **Asset Placeholders**: Vervang afbeeldingen door lichtgewicht placeholders
- **Preserve Aria/Data Attrs**: Behoud bewaarde ARIA- en data-attributen
- **Exclude Comments**: Verwijder HTML-commentaren uit de uitvoer
- **Auto-format for Gemini**: Formatteer uitvoer optimaal voor AI-verwerking
- **Remove Scripts & Styles**: Strip `<script>`, `<style>` en inline stijlen
- **Smart Trim Tailwind**: Optimaliseer lange Tailwind CSS-klassenlijsten

---

## 🏗️ Architectuur

```
devcontext-pro/
├── manifest.json          # Manifest V3 configuratie
├── icons/                 # Extensie pictogrammen (16, 32, 48, 128)
├── assets/                # Afbeeldingen en visualisaties
├── sidepanel/
│   ├── sidepanel.html     # Side Panel HTML structuur
│   ├── sidepanel.css      # Glassmorphism styling & thema's
│   └── sidepanel.js       # SidePanelController & State management
└── scripts/
    ├── background.js      # Service worker & command handling
    ├── content.js         # DevContextPro DOM-scraper & overlays
    ├── content.css        # Overlay & notificatie stijlen
    └── utils.js           # Gedeelde helpers (TS generation, diffs)
```

---

## 🎨 Design Filosofie

DevContext Pro biedt een premium gebruikerservaring met:
- **Dark Mode First**: Diep indigo (`#1e1b4b`) en leisteen grijs (`#0f172a`) palet
- **Glassmorphism**: Matglaseffecten met subtiele transparantie
- **Vloeiende Animaties**: Micro-interacties voor verbeterde UX
- **Material Design 3**: Moderne, professionele interfacecomponenten

---

## 🔐 Machtigingen

- `storage`: Gebruikersvoorkeuren, kleurgeschiedenis en extractiegeschiedenis lokaal opslaan
- `sidePanel`: Weergave en besturing van de Side Panel interface
- `scripting`: Automatische (her-)injectie van content scripts bij onvoorbereide tabs
- `host_permissions` (`<all_urls>`): Content script toegang voor DOM-extractie en opschoning op webpagina's

---

## 🛠️ Ontwikkeling

### Tech Stack
- **Vanilla JavaScript**: Geen externe dependencies of frameworks
- **Manifest V3**: Conform alle moderne Chrome Extensie richtlijnen
- **Lokale Scripts**: Geen externe CDN-aanroepen voor maximale beveiliging

### Belangrijkste Componenten

**SidePanelController** (`sidepanel/sidepanel.js`)
- Beheert UI-interacties en voorkeuren
- Zorgt voor automatische content script injectie via `ensureContentScript()`
- Beheert klembord-tracking, data-lek beveiliging en extractiegeschiedenis

**DevContextPro** (`scripts/content.js`)
- Elementselectie met visuele overlay
- DOM-opschoning, multi-select context buckets en diff-berekeningen
- Handelt in-page notificaties en klembordacties af

**BackgroundService** (`scripts/background.js`)
- Service worker voor sneltoetsen (`Alt+S`, `Alt+M`) en achtergrond-taken

---

## 📋 Roadmap

- [x] Geschiedenis van geëxtraheerde componenten (v1.3.0)
- [x] Automatische script-injectie / storingsherstel (v1.3.0)
- [x] Data-lek beveiliging voor Ask AI (v1.3.0)
- [ ] Exporteren naar meerdere formaattypen (JSON, XML)
- [ ] Custom CSS selector bouwer
- [ ] Cloud sync voor voorkeuren

---

## 🔧 Probleemoplossing

### "Kan niet op deze pagina draaien"
Sommige pagina's (zoals `chrome://` of `edge://` internetsites) blokkeren content script injecties vanuit de browser. Probeer de extensie op een normale website te gebruiken of herlaad de pagina.

### Pictogrammen niet zichtbaar
Als je een plaatsbekleding pictogram ziet:
1. Ga naar `chrome://extensions/`
2. Klik op **Remove** op de DevContext Pro kaart
3. Sluit Chrome volledig en open het opnieuw
4. Laad de extensie opnieuw via **Load unpacked**

---

## 📄 Licentie

Dit project wordt gelicentieerd onder de **MIT-licentie**.

---

**Gebouwd met ❤️ voor ontwikkelaars die waarde hechten aan schone code en premium UX**
