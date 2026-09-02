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

## 2. GitHub Pages

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

**Layer one — already in the repo, works automatically.** Each old URL exists as a
directory containing an `index.html` that redirects to the new page (`services/`,
`about-us/`, `contacts/`, `car-services/brakes/`, and so on — 24 in total). GitHub Pages
serves these, so the redirects work the moment the site goes live, with no dashboard
configuration. All 24 were tested end to end.

**Layer two — optional but better for SEO.** Import `cloudflare-redirects.csv` under
**Cloudflare → Bulk Redirects**: create a list, upload the CSV, attach it to a Bulk
Redirect Rule. These are true 301s served at the edge, which Google treats more
decisively than the meta-refresh stubs and which never reach GitHub at all. Cloudflare's
free plan allows 20; the CSV uses 16, with subpath matching collapsing the nine
`/car-services/*` pages into one row.

The two layers do not conflict — Cloudflare intercepts first when configured, and the
in-repo stubs are the fallback if a rule is ever removed.

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
