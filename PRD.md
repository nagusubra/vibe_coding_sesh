# **PRD: Brainrot Radar (Chrome Extension)**

## **1. Project Overview**

**Goal:**
Provide a one-click AI-powered "radar sweep" for any webpage, classifying it as **valuable**, **brainrot**, or **uncertain**. Users instantly see whether the content is worth their time, plus a short AI justification.

**Key differentiator:**
Unlike keyword mapping or manual tagging, the extension leverages **Perplexity Sonar AI** for real-time, context-aware evaluation of the page’s content.

---

## **2. Target Users**

* Productivity enthusiasts, knowledge workers, or students who want to avoid wasting time online.
* Early adopters of AI-assisted browsing tools.
* Users who want instant, actionable feedback on the quality/value of content.

---

## **3. Core Features**

### **A. AI-Powered Verdict**

* Uses **Perplexity Sonar** API for content analysis.
* Returns structured JSON:

  * `verdict`: `valuable` / `brainrot` / `uncertain`
  * `confidence`: 0–1
  * `justification`: short human-readable explanation
* Only the verdict and justification are displayed in the popup.

### **B. API Key Management**

* First-run popup requests Perplexity API key (`pplx-...`).
* Stored securely using `chrome.storage.local`.
* Option to reset/change the key anytime from popup.

### **C. Page Content Extraction**

* Captures key content from active tab:

  * URL, title, hostname, meta descriptions, og\:title, og\:description
  * Up to 20k characters of page body text
* Sends structured JSON to AI API.

### **D. Error Handling / Diagnostics**

* Handles:

  * Missing API key
  * Invalid API key (401 Unauthorized)
  * Rate limiting (429)
  * Server errors (5xx)
  * Network/CORS issues
* Clear, human-readable messages in the popup for all failures.

### **E. UI / UX**

* Minimal, clean popup:

  * First-run: key entry
  * After key entry: AI verdict card
* Verdict highlighted (green for valuable, red for brainrot)
* Justification displayed in monospace box for clarity

---

## **4. User Flow**

```
[User clicks extension icon]
        ↓
[Check if API key exists]
   ├─ No → Show API key entry → User enters key → Save & continue
   └─ Yes → Proceed
        ↓
[Extract active page content]
        ↓
[Send content JSON to Perplexity Sonar]
        ↓
[Receive JSON verdict from API]
        ↓
[Show verdict, confidence %, and justification]
        ↓
[Handle errors if API fails or key is invalid]
```

---

## **5. Technical Details**

### **A. Frontend**

* **HTML/CSS/JS** for popup interface
* Color-coded verdict highlights
* Minimal layout: key entry → verdict card
* CSS handles responsive width (\~340px) for popup

### **B. Chrome APIs**

* `chrome.storage.local` → store API key
* `chrome.tabs.query` → get active tab
* `chrome.scripting.executeScript` → extract page content safely

### **C. Backend / AI Integration**

* Perplexity Sonar API (`https://api.perplexity.ai/chat/completions`)
* Payload structure:

```json
{
  "model": "sonar",
  "messages": [
    {"role": "system", "content": "Classify page as 'valuable' or 'brainrot'. Return JSON only."},
    {"role": "user", "content": "<structured page JSON>"}
  ],
  "response_format": {"type":"json_schema", "json_schema": { ... } },
  "temperature": 0.2
}
```

* Parses AI response and validates JSON structure

### **D. Security / Privacy**

* API key stored locally; not sent elsewhere
* Page content sent only to Perplexity Sonar API
* Minimal permissions requested (`activeTab`, `storage`, `scripting`, host for Perplexity)

---

## **6. Stretch Goals**

* Automatic scoring without user click (optional sidebar or toolbar badge)
* Historical streak tracking of “valuable vs brainrot” pages
* Export logs / weekly summaries
* Leaderboard for friends/teams
* UI animations for fun feedback (confetti, badge unlocks)

---

## **7. KPIs / Success Metrics**

* **Accuracy / usefulness:** User agrees with AI verdict at least 80% of the time
* **Engagement:** Daily active users clicking extension > 3x/week
* **Error rate:** API errors or failures < 5%
* **Adoption:** Number of users saving API key / using extension

---

## **8. Taglines / Marketing Copy**

* *“Is your browsing brainfuel or brainrot?”*
* *“Instant AI verdict on any page—know what’s worth your time.”*
* *“Turn every click into a score streak of productivity.”*
