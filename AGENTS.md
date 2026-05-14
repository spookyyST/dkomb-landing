# AGENTS.md - dkomb.ru static landing

## Project Context

This folder contains a static placeholder landing page for `dkomb.ru`, the website of
АО «Северо-Западный Комбинат ДримЛим» / АО «СЗКД».

The current goal is a premium one-page industrial landing page that communicates scale,
reliability, and production discipline. It is intentionally built without a bundler so it
can be uploaded to almost any static hosting.

## Stack

- `index.html`: semantic HTML5, SEO meta, Open Graph, JSON-LD Organization.
- `styles.css`: project visual system, responsive layout, demo image layers, reveal states.
- `script.js`: Vanilla JS for navigation, Intersection Observer reveals, Lucide icons, and
  demo form submission.
- Tailwind is loaded through the browser CDN for utility support. Do not add npm or a build
  step unless the project is explicitly upgraded.
- Lucide icons are loaded through a pinned CDN script.

## Visual Rules

- Keep the direction editorial / Swiss industrial minimalism.
- Preserve the palette: warm white `#F7F7F2`, coal black `#050607`, sky `#A8D8F0`,
  steel `#B8C0C7`, accent `#C7A24B`.
- Use large condensed grotesk typography for headlines. Current fonts: IBM Plex Sans
  Condensed and Manrope.
- Avoid decorative blobs, rounded marketing cards, heavy shadows, and generic gradient hero
  sections.
- Cards, panels, and form containers should stay square or near-square. Radius should remain
  `0` unless a future brand system says otherwise.

## Demo Assets

The first version uses external Pexels image URLs for demo mode:

- Sky background: `https://www.pexels.com/photo/blue-sky-96622/`
- Coal texture: `https://www.pexels.com/photo/black-charcoals-48884/`
- Aviation/propeller: `https://www.pexels.com/photo/propeller-of-an-aircraft-16091505/`

When final assets are ready, place them in `assets/` and update CSS variables in
`styles.css`. The central hero composition is isolated in `.hero__object`, so it can be
replaced by a transparent PNG such as `assets/hero-object.png`.

## Form Contract

`script.js` contains:

```js
const FORM_ENDPOINT = "";
```

Leave the empty string for demo mode. For production, set it to the backend endpoint that
accepts JSON:

```json
{
  "name": "Client name",
  "contact": "+7 000 000 00 00 or email@example.com",
  "message": "Optional comment",
  "source": "dkomb.ru static landing",
  "createdAt": "ISO timestamp"
}
```

The script validates that name and contact are present, and that contact looks like either a
phone number or email address.

## Acceptance Checks

- Open locally with `python3 -m http.server 8080` from this folder.
- Check desktop, tablet, and mobile widths.
- Confirm the navigation closes on mobile after link click.
- Confirm empty form fields show an error and valid fields show demo success.
- Keep this folder independent from existing root-level project files.
