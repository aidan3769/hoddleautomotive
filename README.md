# Hoddle Automotive

Marketing website for Hoddle Automotive, a mechanic at 234 Hoddle St, Abbotsford VIC 3067.

Plain static HTML, CSS and JavaScript — no build step, no framework, no dependencies to
install. Open `index.html` in a browser and it runs.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home — hero, services, Google reviews, about teaser, how it works, FAQ, map |
| `services.html` | Full service listing |
| `about.html` | Story, stats, mission/vision, values |
| `contact.html` | Booking request form |
| `location.html` | Address, hours, getting here |

Shared assets: `style.css` (all pages), `script.js` (nav, mobile menu, FAQ accordion,
scroll fade-ins, footer year), `booking.js` (contact page only).

## Local development

There is no dev server or build. Either open the HTML files directly, or serve the
folder over HTTP if you want the booking form to behave exactly as it does in production:

```bash
python -m http.server 8000
```

## Booking form

`contact.html` posts through [EmailJS](https://www.emailjs.com) to
`info@hoddleautomotive.com.au`, using the workshop's own SMTP server. Reply-To is set to
the customer's address, so replying in the inbox goes straight back to them.

Configuration lives at the top of `booking.js`. The public key there is safe in
client-side code by design — it is meant to be visible. **The EmailJS private key must
never be added to this repository.**

If the keys are ever cleared, the form degrades gracefully: it shows a "please call us"
message rather than failing silently.

## Google reviews

The reviews section on the home page is hand-written static markup containing real
reviews copied from the Google Business listing. This avoids needing a Google Cloud API
key, a billing account, or any third-party script.

**To refresh it**, open the listing at
<https://www.google.com/maps?cid=6778337996010710507> and update three things inside
`<section id="reviews">` in `index.html`:

1. the rating and review count in `.reviews-summary`
2. the review count in the button label
3. the three `.review-card` blocks

Twice a year is plenty at the current rate of new reviews.

`reviews.js` is an unused alternative that fetches reviews live from the Google Places
API. It is kept for reference; its header explains how to switch over if that is ever
wanted. It is not linked from any page.

## Deployment

Hosted on **GitHub Pages** behind **Cloudflare**, replacing a live WordPress site on
shared hosting. That server also handles the client's email, so the switchover has real
failure modes.

**Read [MIGRATION.md](MIGRATION.md) before touching DNS.** It covers preserving the mail
records, the SPF change, the Cloudflare SSL mode that otherwise causes a redirect loop,
and importing `cloudflare-redirects.csv` so the old WordPress URLs keep working.

`CNAME` binds the custom domain for GitHub Pages — do not delete it.

Other things to check after deploying:

- **HTTPS must be enabled.** The booking form and the site's credibility both depend on it.
- **The domain must match** the absolute URLs in `robots.txt`, `sitemap.xml`, the
  `<link rel="canonical">` tags, the Open Graph tags, and the JSON-LD block in
  `index.html`. These all assume `https://hoddleautomotive.com.au/` with no `www`
  (which is what the live site already resolves to). If the site is ever served from a
  different address — a GitHub Pages URL, a staging subdomain — those URLs must change
  too, or search engines will keep indexing the old address instead of the new one.
- **Submit `sitemap.xml` in [Google Search Console](https://search.google.com/search-console)**
  after going live, and watch the Coverage report for 404s in the first fortnight —
  that is where a missed redirect will show up.

## SEO notes

Already in place: per-page titles and meta descriptions, canonical URLs, Open Graph tags,
one `<h1>` per page, alt text on every image, `robots.txt`, `sitemap.xml`, and
`LocalBusiness`/`AutoRepair` JSON-LD on the home page with address, hours, geo
coordinates and service area.

Deliberately **not** included: `AggregateRating` structured data for the Google reviews.
Google's structured-data policy excludes ratings collected from third-party sites, and
marking them up risks a manual penalty.

The largest remaining win is image weight — `image3.jpg` (269 KB) and
`service-tab.webp` (226 KB) are the heaviest assets and affect mobile load times.

## Conventions

- Brand cyan `#3FB0D8`, charcoal `#292929`; both defined as CSS custom properties at the
  top of `style.css`.
- Poppins for headings, Barlow for body, loaded from Google Fonts.
- Icons are inline SVG — no icon library.
- The navbar, mobile nav and footer are duplicated across the five HTML files. Edit one,
  edit all five.
