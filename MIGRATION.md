# Switchover checklist — WordPress → GitHub Pages + Cloudflare

The domain currently runs a live WordPress site on shared hosting at `43.250.142.95`,
**and that same server handles the client's email**. The email is the part most easily
broken by this migration, so it comes first.

---

## 1. Email must survive the nameserver change (do this before anything else)

Current DNS, captured 2 Sep 2026 from the existing nameservers
(`ns1.syd5.hostyourservices.net`, `ns2.syd5.hostyourservices.net`):

| Type | Name | Value | Notes |
|---|---|---|---|
| MX | `hoddleautomotive.com.au` | `mail.hoddleautomotive.com.au` (priority 0) | inbound mail |
| A | `mail` | `43.250.142.95` | **must be DNS-only / grey cloud** |
| A | `@` | `43.250.142.95` | this one changes to GitHub Pages |
| TXT | `@` | `v=spf1 a mx include:spf.hostyourservices.net ~all` | see warning below |
| TXT | `default._domainkey` | `v=DKIM1; k=rsa; …` | **DKIM — must survive verbatim** |

DKIM is the cryptographic signature on outgoing mail. If that record is lost or altered,
mail from the domain starts failing authentication at Gmail and Outlook and lands in
spam. Verify it is present and byte-identical after the move. Same for the `_caldav`,
`_carddav` and `_autodiscover` SRV/TXT records, which drive mail-client autoconfiguration.

When the nameservers move to Cloudflare, Cloudflare imports existing records
automatically — but **verify each of the above is present before flipping the
nameservers at the registrar.** Anything missed silently stops mail.

Two specific traps:

- **`mail.hoddleautomotive.com.au` must be grey cloud (DNS only), not orange.**
  Cloudflare's proxy only handles HTTP/HTTPS. Proxying the mail record breaks both
  incoming mail and the SMTP that the website's booking form sends through.
- **The SPF record could be tidied — optional, not required.** It currently starts
  `v=spf1 a mx ...`, where `a` means "the root A record may send mail for this domain".
  After the switch the root A record points at GitHub, so that clause stops describing
  the mail host and instead names GitHub's CDN edge servers.

  Nothing breaks either way: the `mx` clause still covers
  `mail.hoddleautomotive.com.au`, so legitimate mail keeps passing SPF. GitHub Pages IPs
  cannot send mail, so the stale clause is untidy rather than exploitable. Drop it
  whenever convenient:

  ```
  v=spf1 mx include:spf.hostyourservices.net ~all
  ```

---

## 2. Cloudflare Pages

Hosting is **Cloudflare Pages**, building from the GitHub repo
`aidan3769/hoddleautomotive`. GitHub is source control only — it does not serve the site.

Set up: Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
pick the repo, and leave the build settings empty (no build command, output directory
`/`). This is plain static HTML with no build step. Every push to `main` redeploys
automatically.

The preview lands at `https://<project>.pages.dev`, served **at the domain root** — not
in a subfolder — so every path behaves exactly as it will in production. Test there
before touching DNS.

Attaching the domain: in the Pages project, **Custom domains → Set up a custom domain**,
enter `hoddleautomotive.com.au`. Because the domain is already in this Cloudflare
account, the DNS record is created automatically. Repeat for `www` if wanted.

This replaces the GitHub Pages route entirely:

- **No A records to add.** Skip the `185.199.x.x` addresses in section 3 — Cloudflare
  Pages binds the domain itself.
- **`CNAME.add-at-cutover` is now unused.** It was a GitHub Pages mechanism. Harmless to
  leave, but it does nothing here and can be deleted.
- SSL is handled by Cloudflare end to end, so the `Full` vs `Flexible` trap does not
  apply — though `Full` remains the correct setting for the zone.

## 2b. (Not used) GitHub Pages

Repo: `aidan3769/hoddleautomotive`. Push and enable Pages **before** any DNS change. The
site then previews at <https://aidan3769.github.io/hoddleautomotive/>, where the whole
thing can be checked end to end while the client's live site carries on untouched.
Nothing about this step is visible to the public or the client.

Because this is a project repo rather than a `username.github.io` user site, the preview
lives in a subfolder. Every link in the site and in the 24 redirect stubs is therefore
**relative**, so it works both in that subfolder and later at the domain root. Do not
change them to root-relative (`/services.html`) — that would break the preview.

The one exception is `404.html`, which must use root-relative asset paths because
GitHub serves it for URLs at any depth. It will appear **unstyled in the github.io
preview** and correctly styled once the custom domain is attached. That is expected.

**The `CNAME` file is deliberately held back.** It currently sits in the repo as
`CNAME.add-at-cutover`. GitHub Pages reads a file named exactly `CNAME` and immediately
starts redirecting the `github.io` address to whatever domain it names — which would
break the preview, because the domain does not point at GitHub yet.

Rename it to `CNAME` (no extension) and commit **at stage two**, once the DNS records
are switched. Then in repo **Settings → Pages** confirm the custom domain reads
`hoddleautomotive.com.au` and tick **Enforce HTTPS** once the certificate issues (up to
24h after DNS resolves correctly).

## 3. Cloudflare settings

- **SSL/TLS mode must be `Full`.** The default `Flexible` causes an infinite redirect
  loop with GitHub Pages, because GitHub already forces HTTPS. This is the single most
  common failure in this setup.
- Root record: delete the `@` A record pointing at `43.250.142.95` and add these four,
  all proxied:

  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```

- `www`: point the existing CNAME at `aidan3769.github.io` (proxied). GitHub will
  redirect it to the bare domain, which is what the canonical tags in the HTML assume.

## 4. Redirects

Google has ~25 URLs from the WordPress site indexed. Without redirects each becomes a
404 and its search ranking is lost. This is handled in two layers.

**Primary: `_redirects`.** Cloudflare Pages reads this file from the repo root and issues
real 301s at the edge — no dashboard configuration, versioned with the code. This is the
mechanism that matters, and it is the reason `cloudflare-redirects.csv` (for the separate
Bulk Redirects product) is no longer needed.

**Fallback: the 24 stub directories.** Each old URL also exists as a folder containing an
`index.html` with a meta-refresh to the new page. These were written for GitHub Pages,
which has no `_redirects` support. They still work anywhere and cost 9.5 KB total.

Cloudflare Pages serves matching static files before consulting `_redirects`, so where
both exist the stub is likely to answer first — meaning a meta-refresh rather than a 301.
Both send the visitor to the right page; the 301 is simply cleaner for search engines.
If a tidier repo and guaranteed 301s are preferred, delete the 24 stub directories and
let `_redirects` do the work alone.

`404.html` catches anything missed — Cloudflare Pages serves it for unmatched paths, in
the site's own styling, with links back to the main pages and the phone number.

`404.html` catches anything missed, in the site's own styling, with links back to the
main pages and the phone number.

## 5. After go-live

- Visit a handful of old URLs directly (`/about-us/`, `/car-services/brakes/`,
  `/booking-form/`) and confirm each lands on the right new page.
- **Send a test email to `info@hoddleautomotive.com.au` from an outside address** and
  confirm it arrives — this is the check that catches a broken MX record.
- Submit a booking through the live form and confirm it arrives too.
- Submit `sitemap.xml` in
  [Google Search Console](https://search.google.com/search-console) and watch the
  Coverage report for 404s over the following fortnight.
