# Graph Report - Webpage Infrastructure  (2026-10-16)

## Corpus Check
- 54 files · ~364,365 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .css 2, .xml 1)

## Summary
- 386 nodes · 801 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.83)
- Token cost: 74,641 input · 0 output

## Community Hubs (Navigation)
- App Shell & Routing
- Seitenrenderer & Wayfinding
- Kontakt & Home-Bausteine
- News-Build & Prerender
- Build-Tooling (package.json)
- Redaktion & CMS
- Edge Function fetch-news
- Regionskarte
- Go-Live-Checkliste
- Phishing-Training
- 3D-Hintergrund (three.js)
- Runtime-Abhängigkeiten
- Supabase Schema
- Lint-Konfiguration
- Animiertes Logo
- Spotlight-Karten
- baramundi-Rechner
- Edge Function contact
- Cron-Secret

## God Nodes (most connected - your core abstractions)
1. `react` - 23 edges
2. `Page()` - 23 edges
3. `Breadcrumbs()` - 21 edges
4. `Scene3D()` - 16 edges
5. `View()` - 14 edges
6. `ContactBox()` - 12 edges
7. `SupportButton()` - 10 edges
8. `mdToHtml()` - 10 edges
9. `About()` - 10 edges
10. `PhishLab()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Langdock KI-Redaktion` --shares_data_with--> `News-Vorlage Frontmatter`  [INFERRED]
  GO-LIVE.md → src/content/news/_VORLAGE.md
- `staticNews()` --calls--> `mdToHtml()`  [EXTRACTED]
  scripts/news.mjs → src/lib/markdown.js
- `staticNews()` --calls--> `parseFrontmatter()`  [EXTRACTED]
  scripts/news.mjs → src/lib/markdown.js
- `cmsNews()` --calls--> `mdToHtml()`  [EXTRACTED]
  scripts/news.mjs → src/lib/markdown.js
- `View()` --calls--> `HubSpotMeeting()`  [EXTRACTED]
  src/App.jsx → src/components/HubSpotMeeting.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **SEO / Auffindbarkeit** — index_seo_meta, public_robots_robots_txt, go_live_prerendering [INFERRED 0.75]

## Communities (19 total, 2 thin omitted)

### Community 0 - "App Shell & Routing"
Cohesion: 0.06
Nodes (56): App(), Clock(), Footer(), getRoute(), Intro(), Nav(), normalize(), reduceMotion() (+48 more)

### Community 1 - "Seitenrenderer & Wayfinding"
Cohesion: 0.09
Nodes (37): View(), Canvas, Scene3D(), Breadcrumbs(), Related(), fmtDate(), byRoute, listingPrefixes (+29 more)

### Community 2 - "Kontakt & Home-Bausteine"
Cohesion: 0.09
Nodes (40): ContactBox(), ContactForm(), ProfileStudioCard(), SplitText(), Needs, OnThisPage(), contactFor(), meetingHref() (+32 more)

### Community 3 - "News-Build & Prerender"
Cohesion: 0.09
Nodes (31): cmsNews(), dir, env, publishedNews(), root, staticNews(), dist, esc() (+23 more)

### Community 4 - "Build-Tooling (package.json)"
Cohesion: 0.07
Nodes (31): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react, name, private (+23 more)

### Community 5 - "Redaktion & CMS"
Cohesion: 0.14
Nodes (21): Redaktion, nav, cms, DEMO, demoSeed(), load(), now(), save() (+13 more)

### Community 6 - "Edge Function fetch-news"
Cohesion: 0.14
Nodes (11): ai(), cors, decode(), FEEDS, Item, json(), parseFeed(), passesQuality() (+3 more)

### Community 7 - "Regionskarte"
Cohesion: 0.18
Nodes (15): dist(), FAR, imageBox(), IMG_DE, IMG_REGION, km(), NEAR, pill() (+7 more)

### Community 8 - "Go-Live-Checkliste"
Cohesion: 0.14
Nodes (14): Go-Live-Checkliste, Englisch-Modus Uebersetzung, GOOGLE_SNAPSHOT Bewertungen, HubSpot Meetings, Kontaktformular (Supabase+Resend), Langdock KI-Redaktion, Prerendering / SEO, Redaktion Login (SSO/MFA) (+6 more)

### Community 9 - "Phishing-Training"
Cohesion: 0.22
Nodes (13): ChatView(), CONTEXTS, day(), fake, IT, MailView(), newRound(), OLD_MAILS() (+5 more)

### Community 10 - "3D-Hintergrund (three.js)"
Cohesion: 0.20
Nodes (8): three, BUILDERS, buildGlobe(), CYAN, fibonacciSphere(), glowTexture(), Scene3D(), VIOLET

### Community 11 - "Runtime-Abhängigkeiten"
Cohesion: 0.20
Nodes (10): dependencies, @fontsource/jetbrains-mono, @fontsource-variable/inter, gsap, @gsap/react, lenis, react, react-dom (+2 more)

### Community 12 - "Supabase Schema"
Cohesion: 0.36
Nodes (6): posts_author_idx, posts_published_idx, public.authors, public.posts, public.suggestions, suggestions_new_idx

### Community 13 - "Lint-Konfiguration"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 14 - "Animiertes Logo"
Cohesion: 0.53
Nodes (4): MARK, MARK_BOX, VIEWBOX, WORD

### Community 15 - "Spotlight-Karten"
Cohesion: 0.53
Nodes (5): clamp(), falloff(), SHAPES, SpotlightCard(), THEMES

### Community 16 - "baramundi-Rechner"
Cohesion: 0.60
Nodes (5): BaramundiCalc(), clamp(), clientSavings(), eur(), num()

## Knowledge Gaps
- **109 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 132 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Build-Tooling (package.json)` to `App Shell & Routing`, `Seitenrenderer & Wayfinding`, `News-Build & Prerender`, `Redaktion & CMS`, `Phishing-Training`, `3D-Hintergrund (three.js)`, `Animiertes Logo`, `Spotlight-Karten`, `baramundi-Rechner`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.061569416498993966 - nodes in this community are weakly interconnected._
- **Why does `mdToHtml()` connect `News-Build & Prerender` to `Redaktion & CMS`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Seitenrenderer & Wayfinding` be split into smaller, more focused modules?**
  _Cohesion score 0.09292929292929293 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime-Abhängigkeiten` to `Build-Tooling (package.json)`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Kontakt & Home-Bausteine` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._