# Oxford Hall of Games

Small megagames and murder mysteries in Oxford.

This site is adapted from `jkeywo/rmg-website` commit
`2f21fe832a5a88e00593df12ede4d32814d8532b`. HTML, CSS and vanilla JavaScript
are served directly. The browser fetches and renders `games.neon`; there is
no compilation, generated event HTML, framework or production dependency.

## Local use

Install Node.js 22 or newer. Double-click `test-site.bat`, or run `npm start`
and open http://127.0.0.1:4173/. The same server also serves
http://127.0.0.1:4173/ox-hog-site/ to check GitHub's repository-path hosting.
Use an HTTP server rather than opening `index.html` as a file. Stop with Ctrl+C.

`npm test` runs the event, rendering and promotion-selection checks.
`npm run package` copies only public files into an empty `.site/` directory,
byte-for-byte. Delete that generated directory before packaging again.
No npm installation is needed for these commands.

## Editing events

Edit `games.neon`. Each event starts with a dash on its own line:

```text
-
name: Example game
slug: 2027-05-example
date: 14 May 2027
time: 7:00 PM – 10:30 PM
venue: Venue name and postcode
location: OXFORD
tagline: A short introduction.
tickets: https://www.tickettailor.com/events/oxfordhallofgames/REPLACE
listImage: images/example.jpg
bannerImage: images/example.jpg
logisticsBefore: |
  Attendance information to show before the description.
description: |
  First paragraph.

  Second paragraph, with **bold** or *italic* text.
logisticsAfter: |
  Attendance information to show after the description.
```

Use English `day Month year` dates and unique lowercase slugs containing only
letters, digits and hyphens. Separate repeat runs of a game by date in the slug.
Events remain upcoming on their event date and become past at the next
midnight in Europe/London, regardless of the visitor's timezone. Times are
display text in UK local time. Classification happens in the browser on navigation
or reload, so no scheduled publication is needed.

Optional fields: `theme`, `complexity`, `rules` (HTTPS rules-document link),
`eventUrl` (original event information, separate from the ticket checkout),
`ticketLabel` (for example, `SOXS Con tickets`), `bookingNote` (shown beside
upcoming ticket buttons, including on the homepage),
and `photos` (comma-separated filenames under `photos/<slug>/`). If adding
photos, also add `photos` to the public-file list in `tools/package.mjs`.
There are currently no photo galleries. Descriptions support paragraphs,
bold and italics; raw HTML is escaped. A `?source=relative-file.neon` query
can load local test content without changing the main event file.

Keep game information in `description`. The optional `logisticsBefore` and
`logisticsAfter` fields support the same formatting and appear before and after
the description for upcoming events. Past event pages hide both logistics
sections, time, venue and booking notes; they retain the date, game description
and reference links.

Update general copy, including the code of conduct, in `scripts/site-content.js`.
Contact details are in `index.html` and `scripts/app.js`. The mailing-list
message is intentionally plain text until a real signup service is supplied.

## Artwork and sources

The Oxford logo is `logos/oxhog.png`, also used as the favicon. Event banners
were visually verified and downloaded from the supplied Ticket Tailor pages
on 27 September 2026. They are served locally:

| Artwork | Source event |
|---|---|
| `images/black-swan.jpg` | https://www.tickettailor.com/events/oxfordhallofgames/2415189 |
| `images/heist.jpg` | https://www.tickettailor.com/events/oxfordhallofgames/1399964 |
| `images/raven-banner.jpg` | https://www.tickettailor.com/events/oxfordhallofgames/1667512 |
| `images/death-on-high-seas.jpg` | https://www.tickettailor.com/events/oxfordhallofgames/1539250 |

The July 2025 Heist! record uses the verified Heist artwork.
Death on High Seas had a stale Heist image
label on Ticket Tailor, but its actual artwork is correct. The two earlier
event records retain their separate Ticket Tailor links. Original attendance
instructions are stored separately and hidden for past events.

Additional events verified on 27 September 2026:

- **7 November 2026:** The Black Swan Crisis, SOXS Con. The [session page](https://www.soxsgamingday.org.uk/megagame-the-black-swan-crisis/)
  supplies the evening slot; the [convention ticket listing](https://www.eventbrite.com/e/soxs-con-2026-tickets-1993770446075)
  confirms date, venue and the separate Bookaby reservation step.
- **1 November 2025:** [Crisis: Mars](https://www.soxsgamingday.org.uk/megagame-crisis-mars/), confirmed against the
  [2025 programme](https://www.soxsgamingday.org.uk/soxs-con-2025/) and [Eventbrite](https://www.eventbrite.com/e/soxs-con-2025-tickets-1696134506969).
- **2 November 2024:** [Den of Wolves: New Eden](https://www.soxsgamingday.org.uk/mini-megagame-den-of-wolves-new-eden/), confirmed against the
  [2024 programme](https://www.soxsgamingday.org.uk/soxs-con-2024/) and [Eventbrite](https://www.eventbrite.com/e/soxs-con-tickets-1016611631757).
- **14 June 2024:** an Oxford New Eden event, confirmed by its
  [Meetup listing](https://www.meetup.com/oxfordonboard/events/300449594/), 18:30–22:30 at Ark-T @ The Venue.
- **12 April 2024:** the earlier Oxford New Eden event, confirmed by its
  [Meetup listing](https://www.meetup.com/oxfordonboard/events/299631195/), 19:00–23:00 at Ark-T @ The Venue.

`images/crisis-mars.png` and `images/new-eden.png` are the existing 2048×652
Ticket Tailor banners from the respective game folders under `C:\Art and Design`.
Both were visually checked before copying. SOXS game details link to their
original session pages; upcoming ticket buttons point to convention admission.

Replace artwork by adding an image and updating the event fields. Homepage
slides are configured in `carouselImages` in `scripts/app.js`; keep the name,
image and event slug together. Use the logo when artwork is unavailable.

## GitHub Pages staging

Staging: https://jkeywo.github.io/ox-hog-site/

Repository Settings → Pages uses **GitHub Actions**. **Publish staging**
tests and packages every push to `main`, then deploys the package to Pages.
Pull requests run checks without publishing. A manual staging run is also available.
The same public files are retained as the `site-release` artifact for 90 days.
The completed run summary records the source commit and live URL.

Only `index.html`, `games.neon`, `scripts/`, `styles/`, `logos/` and `images/`
are published. Documentation, tests, workflow code and credentials stay out
of the deployed package. Relative paths support both repository and domain roots.

## Cloudflare production

Production: https://ox-hog-site.pages.dev/

Cloudflare project: `ox-hog-site`, created as **Direct Upload**, with production
branch `production`. No Git integration or automatic production deployment.

Repository secrets required:

- `CLOUDFLARE_ACCOUNT_ID`: the account containing the Pages project.
- `CLOUDFLARE_API_TOKEN`: an API token with **Account → Cloudflare Pages → Edit**
  for that account. Configure this in GitHub Settings → Secrets and variables →
  Actions; never commit or paste credentials into site files.

To publish: open Actions → **Promote to production** → **Run workflow**, choose
`main`, and leave `staging_run_id` blank. It selects the latest completed,
successful **Publish staging** run and uploads its exact retained files.
It does not repackage current `main`, so newer unpublished changes cannot slip
into the release. The workflow validates repository, workflow, branch, event,
success status and artifact availability before upload.

For rollback, enter an earlier successful staging run's numeric ID (from its
Actions URL). The same workflow publishes that artifact. Missing or expired
artifacts fail with a clear error; no silent fallback to different code occurs.
After 90 days, restore the desired site revision in a new commit, publish it
to staging, review it, then promote that new run.

Production jobs are serialized. GitHub concurrency keeps one running and one
pending run, so avoid queuing several promotions at once. Summaries record
the staging run, source commit, immutable Cloudflare deployment URL and production URL.

## Domain setup after purchase

Until `oxhog.co.uk` is owned, use the provider URLs above. Do not set a custom
domain in GitHub prematurely, because it would redirect staging to an unavailable host.

1. Add `oxhog.co.uk` as a zone in the same Cloudflare account and change the
   registrar's nameservers to those Cloudflare assigns.
2. Under the Oxford Pages project's **Custom domains**, add `oxhog.co.uk`.
   Let Cloudflare create its apex DNS record and provision HTTPS.
3. Verify domain ownership with GitHub using its provided TXT record. In this
   repository's Pages settings, set the custom domain to `test.oxhog.co.uk`.
4. In Cloudflare DNS, add **CNAME** `test` → `jkeywo.github.io`, **DNS only**.
   Enable **Enforce HTTPS** in GitHub once the certificate is ready.
5. Check both hostnames and update the production workflow's environment URL
   and summary URL to `https://oxhog.co.uk/`. The site files need no rebuild.

With Actions-based Pages, a CNAME file is not needed. Cloudflare's apex custom
domain must be associated with the Pages project, not merely entered in DNS.
No domain purchase or DNS changes have been attempted as part of initial setup.
