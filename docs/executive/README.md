# Executive product overview (PDF)

Management briefing document for Kastros HR.

## Files

| File | Purpose |
|------|---------|
| `Kastros-HR-Product-Overview.html` | Source (edit here for content updates) |
| `../Kastros-HR-Executive-Overview.pdf` | Generated PDF for email / print |
| `../../public/downloads/Kastros-HR-Executive-Overview.pdf` | Same PDF (optional static download URL) |

## Regenerate the PDF

```bash
npm install
npm run docs:pdf
```

Requires `puppeteer` (dev dependency). The script opens the HTML via `file://` and writes the PDF with page numbers in the footer.

## Share with leadership

Attach `docs/Kastros-HR-Executive-Overview.pdf` to email, or after deploy open:

`/downloads/Kastros-HR-Executive-Overview.pdf`

(if the copy under `public/downloads/` is committed or uploaded).
