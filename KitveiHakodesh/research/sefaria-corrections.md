# Reporting a Text Correction to Sefaria, Using the Seforim DB

This is a documentation-only guide. It does not add any code to the project — it explains how
**you** (a person, working by hand or with a throwaway script) can turn a suspected typo you noticed
in the app into a correction report Sefaria will actually act on, and it honestly answers whether
that last step (sending the email) can be automated for free.

Everything below was checked against the real DB at:

```
C:\Users\Admin\AppData\Roaming\otzaria\books\seforim.db
```

(the same file `vue-frontend/.env.development` points `DB_PATH` at).

---

## 1. What Sefaria will and won't act on

From Sefaria's own guidance ([How to Report a Mistake](https://developers.sefaria.org/docs/how-to-report-a-mistake)):

- Most "errors" people report are actually **differences between textual traditions/editions**,
  not mistakes — Sefaria will *not* change the text for those. Different versions are allowed to
  coexist.
- They only act on genuine **printer errors or digitization/OCR mistakes**.
- The Sefaria **Community Translation** is the one exception — that's crowdsourced, so you're
  expected to just fix it yourself in their editor rather than report it.

So before writing a report: check the row against **at least one other version of the same line**
(the DB makes this trivial, see §3) and against a printed edition if you have one. If it's just a
variant spelling/nikud/word between two legitimate witnesses, it's not a bug — don't report it.

---

## 2. The exact format Sefaria expects

Sefaria has no submission API and no structured form for this — it's a plain email (or the in-app
"Feedback" button). But they do specify **four required pieces of information**, verbatim from
their docs:

1. **The URL of the page you're looking at.**
2. **What text version you're looking at** (they say: click the "about" button on sefaria.org to
   find this).
3. **What the current text is.**
4. **What you think the text should be**, and your source for that (a printed edition + page
   number, a manuscript, etc.).

Address: **corrections@sefaria.org**

Nothing else is required — no ticket ID, no ref-object JSON, no CSV. It's meant to be read by a
person. The email template in §5 below packages exactly these four fields.

---

## 3. Where this data lives in the seforim DB

Five tables matter for this:

| Table | Role |
|---|---|
| `book` | one row per sefer. `title` / `heRef` are Hebrew-only — there is **no English title stored anywhere in this DB**. |
| `line` | one row per printed line/verse. `heRef` is the Hebrew ref string (e.g. `"בראשית א, א"`); `content` is the *default* displayed text (HTML-ish, e.g. `<big>` around the first letter, `<h1>`/`<h2>` for headers — those header rows have `heRef = NULL`, skip them). |
| `book_version` | one row per **named version/edition** of a book. Its columns (`versionTitle`, `heVersionTitle`, `versionSource`, `license`, `priority`, `versionNotes`) are literally Sefaria's own Version-object field names — this table is a structured mirror of Sefaria's version metadata, not something Otzaria invented. |
| `version_line` | the actual text of one `line`, *per* `versionId` — this is what lets you compare witnesses for the same verse. |
| `source` | tells you where a **book's structural data** came from (`Sefaria`, `DictaToOtzaria`, `wikisourceToOtzaria`, `pninimToOtzaria`, `Unknown`) — joined via `book.sourceId`. |

### Real sample (Bereshit 1:1, `bookId = 1`, `lineId = 3`)

`line` row:

```
id=3  bookId=1  lineIndex=2  heRef='בראשית א, א'
content='(א) <big>בְּ</big>רֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃'
```

`version_line` rows for that same `lineId` (five different witnesses):

| versionId | versionTitle | versionSource | license | content |
|---|---|---|---|---|
| 3 | Miqra according to the Masorah | he.wikisource.org/.../מקרא_על_פי_המסורה | CC-BY-SA | `(א) בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃` |
| 5 | Tanach with Nikkud | tanach.us/Tanach.xml | Public Domain | `(א) בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃` |
| 6 | Tanach with Ta'amei Hamikra | tanach.us/Tanach.xml | Public Domain | `(א) בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃` |
| 7 | Tanach with Text Only | tanach.us/Tanach.xml | Public Domain | `(א) בראשית ברא אלהים את השמים ואת הארץ` |
| 8 | Tanakh in Yiddish (Neuhausen/Charlap, NY 1914) | hebrewbooks.org/44090 | unknown | `(א) אין אנפאנג האט גאט בעשאפען דעם הימעל און די ערד.` |

This is exactly what you'd want for §1's sanity check — five witnesses side by side. If your
suspected typo only shows up in **one** version and the others agree, that's a real signal. If
every version reads differently, it's a tradition/edition difference, not a bug.

### Queries to pull this yourself

Get every version of one line (the comparison table above):

```sql
SELECT bv.versionTitle, bv.heVersionTitle, bv.versionSource, bv.license, vl.content
FROM version_line vl
JOIN book_version bv ON bv.id = vl.versionId
WHERE vl.lineId = ?;
```

Find the `lineId` from a book + Hebrew ref you already know:

```sql
SELECT l.id, l.heRef, l.content
FROM line l
JOIN book b ON b.id = l.bookId
WHERE b.title = ? AND l.heRef = ?;
```

(`book.title` is Hebrew, e.g. `'בראשית'` — there's no English lookup, see §4.)

### Confirming against Sefaria's *live* text before you report

Important: this DB is a **snapshot**. A typo in it may already have been fixed upstream, and
reporting an error Sefaria has already corrected wastes their time and yours. Check the live text
first — free, no key, read-only:

```
GET https://www.sefaria.org/api/v3/texts/<English ref>?version=primary
```

Response gives `versions[0]` with `text`, `versionTitle`, `license`, and **`status`**. Combine with
`/api/name/` from §4 and the whole check is automatic: `heRef` → English ref → live text → compare
to `version_line.content`.

**This was run as a live dry run** over sample rows (Genesis 1:1, 1:6, 2:10, 5:15). Every one
resolved correctly and the local DB text matched Sefaria's *byte for byte* — so this DB is a
faithful mirror, and any difference the diff surfaces is a genuine signal worth investigating rather
than import noise.

Two things that dry run also confirmed:

- Comparison needs light normalization of *our* side only — strip the Otzaria markup (`<big>` etc.)
  and the leading `(א)` verse marker, which Sefaria's text doesn't carry. Do **not** Unicode-normalize
  (see the warning in §5).
- The `status` field comes back **`locked`** on the established editions (e.g. Genesis's "Miqra
  according to the Masorah", CC-BY-SA). That's the same flag that governs the write API in §7 —
  so the diff tells you what to report, but never what you could fix yourself.

---

## 4. Mapping DB fields → Sefaria's 4 required fields

| Sefaria wants | Comes from | Notes |
|---|---|---|
| 1. URL of the page | **Not stored in this DB.** | See below — you have to look it up. |
| 2. Text version | `book_version.versionTitle` (+ `heVersionTitle`) | Copy verbatim — Sefaria's own "about" panel will show this exact string if it's the same version they host. |
| 3. Current text | `version_line.content` for that `versionId` | Strip Otzaria's display markup first (`<big>…</big>`, any stray `<h1>`/`<h2>` if you grabbed the wrong line) — Sefaria's text doesn't have these tags. |
| 4. What it should be + source | **Not in the DB — this is your judgment call.** | Base it on a printed edition, another version row above, or a manuscript. Sefaria explicitly wants your basis, not just an assertion. |

**On the URL (field 1):** this DB never stored an English title or a Sefaria slug — only Hebrew
`heRef` strings like `"בראשית א, א"`. You cannot derive `sefaria.org/Genesis.1.1` from that
offline (Hebrew book names don't map 1:1 to English slugs, and some categories number sections
differently).

**But you don't have to — Sefaria resolves it for you, free and without a key.** The
`GET /api/name/<string>` endpoint is read-only, needs no API key, and turns a Hebrew ref straight
into the canonical English ref and URL slug. Verified live against this DB's exact `heRef` format,
comma and all:

```
GET https://www.sefaria.org/api/name/<url-encoded heRef>
```

| `heRef` sent | `ref` returned | `url` returned |
|---|---|---|
| `בראשית א, א` | `Genesis 1:1` | `Genesis.1.1` |
| `בראשית יב, ג` | `Genesis 12:3` | `Genesis.12.3` |
| `בראשית א:א` | `Genesis 1:1` | `Genesis.1.1` |
| `ברכות ב א` | `Berakhot 2a` | `Berakhot.2a` |
| `רש"י על בראשית א א` | `Rashi on Genesis 1:1` | `Rashi_on_Genesis.1.1` |

The response also carries `is_ref` (true = it resolved to a real text), `is_segment` (true = it
pinned an individual verse, not a whole chapter/daf), plus `book` and `index`. So the final URL is
just:

```
https://www.sefaria.org/<url field>
```

**Check `is_ref` before trusting the result.** If the string doesn't resolve, the endpoint falls
back to returning a `completions` list of fuzzy title guesses instead — which is a *successful* HTTP
response containing the wrong thing. Treat `is_ref: false` (or a missing `url`) as "couldn't resolve,
look this one up by hand," never as a URL.

This makes URL generation for a whole batch of flagged lines fully automatable — one cheap GET per
distinct `heRef`. Be polite about it: cache results per ref, and don't hammer it in a tight loop.

---

## 5. Turning one DB row into a sendable report

Worked example (using the Bereshit 1:1 data above, versionId 6 — **hypothetical error, for format
illustration only**, not a real claim):

```
To: corrections@sefaria.org
Subject: Text correction — Tanach with Ta'amei Hamikra, בראשית א:א

1. URL: https://www.sefaria.org/Genesis.1.1
   (resolved from heRef "בראשית א, א" via GET /api/name/ — see §4)

2. Version: Tanach with Ta'amei Hamikra (תנ״ך מלווה בטעמי מקרא)

3. Current text:
   בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃

4. Should be:
   בְּרֵאשִׁית֙ בָּרָ֣א אֱלֹהִ֔ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃
   Basis: [cite the printed edition / page you compared against here]
```

> **Do not Unicode-normalize the text on its way out of the DB.** Running NFC/NFD over Hebrew can
> silently reorder or alter the exact nikud/te'amim sequence — which is frequently *the very thing
> being reported*. Copy the bytes as stored. Likewise prefer plain text over HTML in the email, and
> put Hebrew on its own lines so bidi reordering doesn't scramble how the reviewer reads it.

Building this from a batch of suspected rows (e.g. output from your own comparison script) is
just: for each flagged `(lineId, versionId)` pair, run the §3 query, fill this same four-line
template, and look up the URL by hand before sending. A CSV with columns
`lineId, heRef, versionTitle, currentText, proposedText, basis, url` is a reasonable intermediate
report to keep for yourself — Sefaria doesn't want the CSV, just the four fields per email.

**Send one email per correction**, not a batch list — Sefaria's flow (a person reads it, checks it,
maybe edits the text) works per-item; a bundled spreadsheet of unrelated corrections is harder for
them to act on than five separate short emails.

---

## 6. Can sending the email itself be automated, for free?

Short answer: **there's no way to make it fully automatic *and* free *and* with zero setup — pick
two.** Every real option below still needs *some* mailbox behind it; nothing sends mail out of thin
air (any service that claimed to would be spam infrastructure, and legitimate ones require auth for
exactly that reason).

Figures below were verified against current (2026) sources — see the links at the end of this
section. Free tiers change; re-check before depending on a number.

| Option | Actually automatic? | Free quota | Setup | Catch |
|---|---|---|---|---|
| **`mailto:` link** | **No** — hands the URI to the OS mail handler with To/Subject/Body pre-filled; the user presses Send. JS *cannot* bypass this (no technique does) | Unlimited, $0 | None | **Length is the killer here — see the Hebrew warning below** |
| **Web3Forms** | Yes — plain POST from the browser | **250 submissions/mo**, unlimited forms/domains, 30-day history | Submit + verify an email, get an access key. No dashboard login, no credit card | Free tier: **max 1 email recipient** (fine — we only mail corrections@), no file uploads, no domain restriction. Access key is public by design and only delivers to the mailbox that owns it |
| **EmailJS** | Yes — pure client-side, no backend | **200 requests/mo**, 2 templates, requests ≤50Kb, 7-day history | Account + connect a mail service + build a template + public key | No attachments on free; domain whitelist/strict mode are **paid**. Over quota, vendor's words: *"Requests to the server will stop being processed and will be ignored."* Non-browser clients (.NET, Node) are **blocked by default** — enable in Account → Security |
| **Formspree** | Yes | **50 submissions/mo** ("for testing and development") | Account | Too tight for anything but occasional use |
| **GitHub Actions** + `dawidd6/action-send-mail` + Gmail App Password | Yes, on a schedule/trigger | Public repos: free (public-repo usage doesn't draw the allowance). **Private on Free: works too** — draws down 2,000 Linux-min/mo; a send job is <1 min | Repo secrets for SMTP user/password | Cron is **frequently delayed** (docs: *"can be delayed during periods of high loads… High load times include the start of every hour"*); 5-min minimum; must be on the **default branch**. **Public** repos auto-disable schedules after 60 days of inactivity — GitHub's docs scope this to public only and are silent on private. At quota exhaustion with no payment method on file, usage is **blocked**. Secrets are readable by anyone who can push a workflow — pin the action to a commit SHA |
| **C# host, SMTP via MailKit** | Yes, no popup | Free — uses a mailbox you already have | Gmail App Password (needs 2-Step Verification on), `smtp.gmail.com` 587/STARTTLS or 465/SSL | This app *does* have a native C# host, so this is genuinely available. **Use MailKit — Microsoft has marked `System.Net.Mail.SmtpClient` obsolete/not-recommended for new code.** Credential storage in a shipped desktop app is a real problem — see `sefaria-corrections-gmail.md` |
| Anonymous relay, no account anywhere | — | — | — | Doesn't exist for legitimate mail |

**Never put a real ESP API key (Resend, Brevo, SendGrid, Mailgun, Postmark) in frontend JS** — that's
full account takeover for spam. Those services block browser calls by CORS on purpose. Only services
with a *purpose-built public token* (Web3Forms, EmailJS, Formspree) are safe from a browser.
SendGrid's free tier was discontinued 27 May 2025, so it's off the table entirely.

### ⚠️ The `mailto:` Hebrew problem — measured, not estimated

Per RFC 6068, non-ASCII in a `mailto:` body must be UTF-8 then percent-encoded
(`encodeURIComponent()` on the *values*, not the whole URI). Every Hebrew character becomes 6
characters (`א` → `%D7%90`).

**Measured on a real correction email** built from this DB (Genesis 1:1, the four required fields,
current + proposed text, one line of basis):

```
raw body chars     : 279
encoded body chars : 977      (3.5x inflation)
full mailto: URI   : 1,061
```

Against the known caps:

| Cap | Result |
|---|---|
| ~1,026 — strict Outlook builds | **TRUNCATED** |
| ~2,000 — common safe ceiling | OK |
| ~2,083 — IE/Edge URL cap | OK |

So a *minimal, single-verse* correction already overflows the strictest mail clients, and this was a
short verse with one line of basis. Anything longer — a Gemara passage, a fuller explanation, two
versions quoted — will blow past 2,000 too.

**Conclusion:** `mailto:` works for short corrections on mainstream clients and is unreliable at the
edges. If you use it, keep the body tight, use `%0D%0A` for line breaks, and give the user a
copyable textbox as a fallback so a truncated link never silently loses their text.

### Recommendation

- **Occasional, user-initiated, zero infrastructure:** `mailto:` — but only if you keep the body
  under ~300 Hebrew characters. No account, no key, no cap, no secret to store.
- **True one-click send from the Vue side, no popup:** Web3Forms (250/mo) is the better free tier
  and needs no account to start; EmailJS (200/mo) if you want templating and a configurable
  recipient.
- **Sending from the C# host instead** (which the browser cannot do — no raw SMTP in a webview):
  MailKit + Gmail App Password. The credential and distribution questions this raises are covered
  separately in **`sefaria-corrections-gmail.md`**.

Sources: [EmailJS pricing](https://www.emailjs.com/pricing/) ·
[Web3Forms limits](https://formtorch.com/compare/web3forms) ·
[Formspree free limits](https://splitforms.com/formspree-free-plan-limits) ·
[SendGrid free plan retirement](https://www.twilio.com/en-us/changelog/sendgrid-free-plan) ·
[RFC 6068](https://datatracker.ietf.org/doc/html/rfc6068) ·
[mailto character limits](https://www.growingwiththeweb.com/2012/07/getting-around-mailto-character-limit.html) ·
[action-send-mail](https://github.com/dawidd6/action-send-mail) ·
[Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage) ·
[Google App Passwords](https://support.google.com/accounts/answer/185833) ·
[SmtpClient obsolete](https://learn.microsoft.com/en-us/dotnet/api/system.net.mail.smtpclient)

---

## 7. Is there a code / GitHub / API path instead of email?

Researched directly against Sefaria's repos and docs. Summary: **no PR-based path exists**, and the
one API path is gated.

### GitHub: not an option

- **`Sefaria/Sefaria-Export`** is described in its own README as an auto-generated dump: *"This
  repository is a lightweight index and set of tools for accessing the Sefaria text corpus. The
  actual text data (~26GB, ~85K files) lives in a public GCS bucket"* (`gs://sefaria-export/`,
  regenerated monthly by a CronJob). Since a March 2026 restructure the text files aren't even in
  the repo any more.
- A Sefaria developer closed a typo PR there (a vowel correction in Bereshit 12:3) with: *"This repo
  is a dump of our main library. Please reach out to corrections@sefaria.org to suggest a
  correction."* **Zero text-content PRs have ever been merged**; several sit open since 2023. Any
  edit would be overwritten by the next monthly export regardless.
- **`Sefaria/Sefaria-Data`** is upstream *input* for one-time ingestion projects, deployed manually
  by their content engineers. There's no automatic path from a file there into the live database.
- Neither repo has any GitHub Action that ingests corrections. The only pipeline runs **outbound**:
  production DB → monthly export → GCS bucket.

### The write API: real, and less gated than the docs suggest — but blocked by `locked`

`POST /api/texts/<ref>` exists and works (form-encoded, with `apikey` and a `json` body of
`{versionTitle, versionSource, language, text}`). Routed at `sefaria/urls_shared.py` →
`reader/views.py::texts_api`. The v3 API (`/api/v3/texts/<ref>`) is **read-only** — `api/views.py`
defines only `get`.

The surprising part: **there is no moderator gate.** The entire authorization model for a text edit
is this check in `sefaria/tracker.py::modify_text`:

```python
if getattr(chunk.version(), "status", "") == "locked" and not is_user_staff(user):
    raise InputError("This text has been locked against further edits.")
```

No editors-group check, no staff check, no review queue, no diff approval. A logged-in user or any
API-key holder can overwrite any **unlocked** version, and the write lands live (recorded in
history). There's a public edit UI on the same footing: `sefaria.org/edit/<ref>` and
`/translate/<ref>`, gated only by that same `locked` flag.

**And that flag is what blocks this route for our purposes.** Checked against live data:

| Text | Versions | Status |
|---|---|---|
| Berakhot | William Davidson (Aramaic + English), Wikisource Talmud Bavli, Cohen | **all locked** |
| Berakhot | Sefaria Community Translation | unlocked |
| Genesis | every listed version | **all locked** |
| Shulchan Arukh, Orach Chayim | Community Translation, Wiki Translation, Wikisource | several unlocked |

The established, curated editions — exactly the ones a typo report would be about — are locked.
The unlocked ones are community/user-contributed versions. So the write API cannot fix the texts we
care about; only Sefaria staff can edit those.

On keys: they're stored in a Mongo `apikeys` collection keyed to a uid, and **nothing in the
codebase issues them** — there's no self-serve path. The current developer portal doesn't document
write endpoints at all (it says all documented endpoints need no key); the *archived* wiki revision
is the source of *"To obtain an API Key, please introduce yourself on the Sefaria developers mailing
list."*

If a meaningful list of verified errors accumulates from this DB, that conversation — "here is what
I found, here is my method, can I get a key or should I send batches" — is the realistic route, and
it's a stronger opening than a cold request.

### The site's own "report an error" button is just an email sender

Worth knowing, because it settles whether there's a hidden API worth using: the Feedback widget
(`static/js/Misc.jsx`, class `FeedbackBox`, wired in at `ConnectionsPanel.jsx:497`) posts to
**`POST /api/send_feedback`** (`sefaria/views.py:419 generate_feedback`). Body is form-encoded with
a single `json` field holding:

| field | value |
|---|---|
| `refs` | array of segment refs, or null |
| `type` | `content_issue` (the correction case), `translation_request`, `bug_report`, `help_request`, `feature_request`, `good_vibes`, `other` |
| `url` | `window.location.href` |
| `currVersions` | `{en: …, he: …}` |
| `email` | typed by the user; only shown when logged out |
| `msg` | the free-text message |
| `uid` | `Sefaria._uid`, or null |

CSRF applies (the view isn't exempt), so a caller needs a `csrftoken` cookie + `X-CSRFToken` header —
but no login, no key, no captcha, and no application-level rate limit. For `type == "content_issue"`
the handler does:

```python
to_email = "corrections@sefaria.org"
subject = "Correction from website - " + ' / '.join(refs)
```

That's it. No database record, no queue, no ticket ID, no captcha, no rate limiting, no login
required. **It is a plain relay into the same human inbox that `corrections@sefaria.org` reaches**,
so calling it programmatically gains nothing over composing the email ourselves.

**Sefaria themselves classify this as not-an-API.** Their own
`docs/decisions/documented_endpoints.md:199` lists it under *"Out of scope — forms / telemetry …
CSRF-form-shaped endpoints, not API-shaped consumer endpoints."* It's the wire format of a form,
carries no compatibility guarantee, and can change without notice.

**Do not batch-post to it.** It's unauthenticated and unthrottled, it derives the sender from a
caller-supplied `uid` field (so submissions can be attributed to arbitrary users), and it lands in a
small nonprofit's shared human-read mailbox with no dedup or triage tooling. Driving it at volume is
mail-flooding with a spoofed sender — abuse regardless of intent. The absence of a rate limit is
trust, not consent. It would also poison any future relationship with the very people whose help
we'd need for an API key.

(Related: the apikey branch of `modify_bulk_text_api` appears to be missing the `@staff_member_required`
check its logged-in branch has. That's almost certainly an oversight on their part, not an invitation —
using it to bypass staff-only bulk writes would be exploiting a bug.)

### One exception you can edit directly

The **Sefaria Community Translation** versions are crowdsourced and editable in their web editor —
for those, Sefaria explicitly says to fix the text yourself rather than report it
(*"open to contribution, so if you see an improvement that you think should be made - make it!"*).
Licensed/locked versions are not editable this way.

### Bottom line

For this project: **email (or the in-app Feedback button) is the sanctioned path**, one correction
at a time. If the volume grows enough to make that painful, the next step is asking Sefaria for an
API key — not building a GitHub-based workflow, which has no destination.

Sources: [How to Report a Mistake](https://developers.sefaria.org/docs/how-to-report-a-mistake) ·
[Sefaria API Documentation](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation) ·
[Sefaria-Export](https://github.com/Sefaria/Sefaria-Export) ·
[Sefaria-Data](https://github.com/Sefaria/Sefaria-Data)

---

## 8. What Sefaria's Terms actually permit (verified, quoted)

Checked directly, because the abuse assessments above should rest on their stated rules and not on
our guesses.

**`robots.txt`** ([www.sefaria.org/robots.txt](https://www.sefaria.org/robots.txt)) — complete contents:

```
User-agent: *
Disallow: /activity/
Disallow: /login?next=*
Disallow: /register?next=*
```

No `Crawl-delay`, and **no rules mentioning `/api/` at all** — API paths are allowed.

**Terms of Use**, §3 "Use of Service and Content" — the clause on point:

> "You may download our data directly from the Sefaria Data GitHub Repository … or by learning about
> our API on our developers site. However, any exploitation of the Service or its Content for any
> commercial use is strictly prohibited without our express, prior written consent … Any use of data
> mining, screen-scraping, robots, or similar data gathering and extraction systems, techniques, or
> code bases **whose primary purpose is simply to crawl the Service for its Content** is strictly
> prohibited."

Read the qualifier carefully: the ban targets tools whose *primary purpose is mass content
extraction*. The same clause **affirmatively points you at the API** as a sanctioned route. Resolving
a few refs and fetching the verses you're reporting on is squarely normal API use.

**Terms §5, "Refraining from Certain Activities"** — the limits that do bind us:

> "Engaging in automated uses of the Service that are abusive or disruptive of the services;"

> "Disrupting the services by placing a burden on the Service or the networks or servers connected
> with the Service;"

> "Disrupting the services by inundating the Service with communications or other traffic that
> suggests no serious intent to use the Service for its stated purpose;"

That third one is precisely why batch-posting to `/api/send_feedback` is out — it's inundation with
communications. Also relevant if you ever poke at endpoints:

> "Probing, scanning, or testing the vulnerability of any of our technical systems or networks unless
> all the following conditions are met: you email hello@sefaria.org requesting advance permission…"

**There is no numeric rate limit anywhere** — no requests/second, no quota, no crawl-delay, and no
separate API terms document. The only standards are the qualitative ones above. So: cache
aggressively, pace politely, and don't pull in bulk from the live site when
[Sefaria-Export](https://github.com/Sefaria/Sefaria-Export) exists for that.

**Licensing (§4)** — matters if this app ever displays or redistributes their text:

> "Reuse of Content that we host is welcome … Any reuse must comply with the underlying license(s)."

CC BY / CC BY-SA texts require attribution (hyperlink or URL to the page reused, an equivalent stable
copy, or a list of authors); modifications to CC BY-SA content must themselves be licensed CC BY-SA
3.0 or later; CC BY-NC texts can't be used commercially. **Licenses are per-text** — the API returns
a `license` field per version, so check it rather than assuming. And commercial use of the Service
needs their prior written consent regardless.

Sources: [robots.txt](https://www.sefaria.org/robots.txt) ·
[Terms of Use](https://www.sefaria.org/terms)
