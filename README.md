# Brainrot Radar (Chrome Extension)

Instant AI-powered radar sweep of any page (and its outbound links) using **Perplexity Sonar** to spot VALUE vs BRAINROT.
- First-run popup asks for your **pplx-...** API key (stored in chrome.storage).
- On each click, the extension captures a compact text sample + meta from the active tab and sends it to Perplexity.
- Shows **verdict (valuable/brainrot/uncertain)**, **confidence**, and a short **justification**.
- Optional outbound link scan classifies top links in one shot.
- Robust error messages for missing/invalid key, network/CORS, rate limits, and server errors.

## Install

1. Download and unzip the folder.
2. Open `chrome://extensions` → enable **Developer mode**.
3. Click **Load unpacked** → choose the unzipped folder.

## Notes / Troubleshooting

- If you see a network/CORS error, Perplexity may disallow browser-origin requests for your account/plan. You can proxy via a tiny server (e.g., Cloudflare Worker) as a workaround.
- Host permissions include `https://api.perplexity.ai/*` for direct calls.
- Captured text is capped at ~20k chars to keep token usage predictable.
