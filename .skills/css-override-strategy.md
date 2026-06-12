# CSS Override Strategy — Minimalist Green Theme

## Problem
This project uses Tailwind utility classes inline in TSX files for a dark-mode AI-style design.
The redesign converts it to a light, minimalist, green-themed design **purely through CSS overrides** in `globals.css`, without touching component logic.

## Critical Bugs Found & Fixed

### 1. `bg-grid-pattern` Hidden Entire Login Page
**Bug:** `.bg-grid-pattern { display: none }` — this class is on the ROOT div of `/login`, hiding everything.
**Fix:** Use `background-image: none` instead of `display: none` for pattern classes that may exist on content containers.

### 2. `svg { display: none }` and Media Queries
**Bug:** Global `svg` selector hid charts and maps, but the fix inside the desktop media query (`@media (min-width: 768px)`) was overriding this with `svg[viewBox] { display: block !important; width: 100% !important; height: 100% !important; }`, which made Lucide icons appear gigantic on desktop screens.
**Fix:** Exclude Lucide icons from the media-query scoped selector as well: `svg[viewBox]:not(.lucide):not([class*="lucide"])`.

### 3. Button Gradient Stripping Must Exclude Buttons
**Bug:** `[class*="bg-gradient-to-"] { background: none }` strips gradients from buttons too.
**Fix:** `[class*="bg-gradient-to-"]:not(button):not([type="submit"]) { background: none }`

### 4. `.text-white` Override Breaks Button Text  
**Bug:** Global `.text-white { color: var(--dark) }` makes button text dark on colored buttons.
**Fix:** Higher-specificity selectors for button children: `button[class*="from-indigo"] span { color: #fff }`

### 5. `div[class*="bg-white/5"]` Too Broad
**Bug:** Chat bubble selector matched stat cards, nav bars, and other divs across the app.
**Fix:** Scope to chat context only: `.fixed div[class*="bg-white/5"]` and `div[class*="bg-zinc-900/95"] div[class*="bg-white/5"]`

### 6. Sidebar Doesn't Offset Secondary Navigation
**Bug:** Only `main` and `.main-content` got `margin-left: 220px`. Secondary nav bars and footers overlapped the sidebar.
**Fix:** Also target `footer` and `div.max-w-7xl` children with the offset rule inside the `@media` query.

## Design Token Structure
```
--bg:            #f4f7f3  (light sage)
--bg-raised:     #eef2ed  (slightly darker)
--surface:       #ffffff  (cards, inputs)
--border:        #dce3db  (all borders)
--text:          #111a12  (main text)
--text-secondary: #5a6659 (labels)
--primary:       #1b4d2c  (deep moss green)
--accent:        #2e7d32  (leaf green)
--danger:        #c62828  (deep red)
--warning:       #e65100  (deep orange)
```

## File Structure
- `globals.css` — Single source of truth for all visual overrides
- No component files modified for styling — all done via CSS specificity
- Exception: Map tiles, marker HTML, chart colors are hardcoded in component files
