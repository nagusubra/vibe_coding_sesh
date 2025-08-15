// popup.js — fully AI-powered verdict with clean key UX and diagnostics
const els = {
  setup: document.getElementById("setup"),
  verdictCard: document.getElementById("verdictCard"),
  linksCard: document.getElementById("linksCard"),
  apiKey: document.getElementById("apiKey"),
  saveKey: document.getElementById("saveKey"),
  keyStatus: document.getElementById("keyStatus"),
  status: document.getElementById("status"),
  verdict: document.getElementById("verdict"),
  reason: document.getElementById("reason"),
  resetKey: document.getElementById("resetKey"),
  analyzeLinks: document.getElementById("analyzeLinks"),
  linksStatus: document.getElementById("linksStatus"),
  linksResults: document.getElementById("linksResults"),
};

document.addEventListener("DOMContentLoaded", init);
els.saveKey.addEventListener("click", onSaveKey);
els.resetKey.addEventListener("click", () => {
  chrome.storage.local.remove(["pplx_key"], () => {
    showSetup();
  });
});
if(els.analyzeLinks){
  els.analyzeLinks.addEventListener("click", onAnalyzeLinks);
}

async function init(){
  const { pplx_key } = await chrome.storage.local.get("pplx_key");
  if(!pplx_key){
    showSetup();
  }else{
    showVerdict();
    runAnalysis(pplx_key);
  }
}

function showSetup(){
  els.setup.style.display = "block";
  els.verdictCard.style.display = "none";
  if(els.linksCard) els.linksCard.style.display = "none";
  els.apiKey.value = "";
  els.keyStatus.textContent = "";
}

function showVerdict(){
  els.setup.style.display = "none";
  els.verdictCard.style.display = "block";
  if(els.linksCard) els.linksCard.style.display = "block";
  els.status.textContent = "Analyzing…";
  els.verdict.textContent = "";
  els.reason.textContent = "";
}

async function onSaveKey(){
  const key = (els.apiKey.value || "").trim();
  if(!key){
    els.keyStatus.textContent = "Please enter your Perplexity key (starts with 'pplx-').";
    return;
  }
  if(!/^pplx-[A-Za-z0-9_\-]{10,}$/.test(key)){
    els.keyStatus.textContent = "That doesn't look like a Perplexity key (expected 'pplx-...').";
    return;
  }
  await chrome.storage.local.set({ pplx_key: key });
  els.keyStatus.textContent = "Key saved locally. Starting analysis…";
  showVerdict();
  runAnalysis(key);
}

async function getActiveTab(){
  const tabs = await chrome.tabs.query({active:true,currentWindow:true});
  return tabs[0];
}

async function capturePage(tabId){
  // Use scripting API to safely capture text & meta from the page
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.content
          || document.querySelector(`meta[property="${name}"]`)?.content || null;
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: (a.textContent||'').trim().slice(0,120) }))
        .filter(l => l.href.startsWith('http'))
        .filter((v,i,self) => self.findIndex(o => o.href === v.href) === i)
        .slice(0,50);
      const text = document.body?.innerText || "";
      return {
        url: location.href,
        title: document.title,
        hostname: location.hostname,
        meta: {
          description: getMeta("description"),
          ogTitle: getMeta("og:title"),
          ogDescription: getMeta("og:description")
        },
        outboundLinks: links,
        contentSample: text.replace(/\s+/g," ").trim().slice(0, 20000),
        timestamp: new Date().toISOString()
      };
    }
  });
  return result;
}

async function runAnalysis(apiKey){
  try{
    const tab = await getActiveTab();
    if(!tab?.id){
      els.status.textContent = "Could not find the active tab.";
      return;
    }
    const page = await capturePage(tab.id);
    els.status.textContent = "Contacting Perplexity…";

    // Structured output schema for reliable parsing
    const schema = {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["valuable","brainrot","uncertain"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        justification: { type: "string" }
      },
      required: ["verdict","confidence","justification"],
      additionalProperties: true
    };

    const system = "You are a strict content quality judge. Classify the page as 'valuable' (useful for learning/productivity) or 'brainrot' (likely to waste time). If unsure, return 'uncertain'. Reply ONLY with JSON matching the provided schema.";
    const user = "Here is the page object:\n" + JSON.stringify(page);

    const body = {
      model: "sonar",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_schema", json_schema: { schema } },
      temperature: 0.2
    };

    const resp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).catch(err => {
      // Network errors never set status codes
      throw new Error("Network error (check connection or CORS): " + err.message);
    });

    if(!resp.ok){
      // Try to read error details
      let detail = "";
      try { detail = await resp.text(); } catch {}
      // Friendly mapping
      if(resp.status === 401){
        throw new Error("401 Unauthorized — Your API key is invalid or missing.");
      }else if(resp.status === 403){
        throw new Error("403 Forbidden — Request blocked (possible CORS or plan/permissions). Details: " + detail);
      }else if(resp.status === 429){
        throw new Error("429 Rate limited — You’ve hit the usage limit. Try again later.");
      }else if(resp.status >= 500){
        throw new Error("Server error " + resp.status + " — Perplexity is having trouble. Try again soon.");
      }else{
        throw new Error("HTTP " + resp.status + " — " + (detail || "Unexpected response."));
      }
    }

    let data;
    try{
      data = await resp.json();
    }catch(e){
      throw new Error("Failed to parse JSON from API. " + e.message);
    }

    const content = data?.choices?.[0]?.message?.content || "";
    let verdictObj;
    try{
      verdictObj = JSON.parse(content);
    }catch(e){
      // If model didn't honor schema, show raw content
      els.status.textContent = "Received non-JSON content from model.";
      els.verdict.textContent = "";
      els.reason.textContent = content || "(empty)";
      return;
    }

    // Display
    const v = verdictObj.verdict || "uncertain";
    els.verdict.classList.remove("ok","bad");
    if(v === "valuable") els.verdict.classList.add("ok");
    if(v === "brainrot") els.verdict.classList.add("bad");
    els.status.textContent = `Verdict: ${v} • Confidence: ${Math.round((verdictObj.confidence||0)*100)}%`;
    els.verdict.textContent = page.title || page.url || "";
    els.reason.textContent = verdictObj.justification || "";

    // Cache page object for link analysis reuse
    window.__cachedPage = page;
    window.__cachedKey = apiKey;

  }catch(err){
    els.status.textContent = "Error";
    els.verdict.textContent = "";
    els.reason.textContent = String(err?.message || err);
  }
}

async function onAnalyzeLinks(){
  const apiKey = window.__cachedKey;
  if(!apiKey){
    els.linksStatus.textContent = "No API key in memory.";
    return;
  }
  const page = window.__cachedPage;
  if(!page){
    els.linksStatus.textContent = "Page data missing. Reopen popup.";
    return;
  }
  const links = (page.outboundLinks||[]).slice(0,10); // limit initial batch
  if(!links.length){
    els.linksStatus.textContent = "No outbound links detected.";
    return;
  }
  els.linksStatus.textContent = `Analyzing ${links.length} links…`;
  els.linksResults.innerHTML = "";

  // We'll send a single batch request with summarized link list for classification
  const system = "You are an assistant that classifies outbound links quickly. For each link decide if likely 'valuable', 'brainrot', or 'uncertain' for a productivity-focused user. Provide terse justification (max 140 chars). Return JSON.";
  const schema = {
    type: 'object',
    properties: {
      links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            verdict: { type: 'string', enum: ['valuable','brainrot','uncertain'] },
            justification: { type: 'string' }
          },
          required: ['url','verdict','justification']
        }
      }
    },
    required: ['links']
  };
  const user = "Links JSON array:" + JSON.stringify(links);
  try{
    const body = {
      model: 'sonar',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_schema', json_schema: { schema } },
      temperature: 0.1
    };
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if(!resp.ok){
      els.linksStatus.textContent = `HTTP ${resp.status} error.`;
      return;
    }
    let data;
    try{ data = await resp.json(); }catch(e){ els.linksStatus.textContent = 'Bad JSON from API.'; return; }
    const content = data?.choices?.[0]?.message?.content || '';
    let parsed;
    try{ parsed = JSON.parse(content); }catch(e){ els.linksStatus.textContent = 'Non-JSON content.'; return; }
    renderLinkVerdicts(parsed.links||[]);
    els.linksStatus.textContent = 'Done';
  }catch(e){
    els.linksStatus.textContent = 'Error: '+ (e.message||e);
  }
}

function renderLinkVerdicts(items){
  els.linksResults.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'linkRow';
    const badgeClass = item.verdict === 'valuable' ? 'ok' : item.verdict === 'brainrot' ? 'bad' : 'uncertain';
    div.innerHTML = `
      <div class="linkRowHeader">
        <span class="badge ${badgeClass}">${item.verdict||'?'}</span>
        <span style="flex:1;text-align:right;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.url||'')}</span>
      </div>
      <div class="linkJust">${escapeHtml(item.justification||'')}</div>
    `;
    els.linksResults.appendChild(div);
  });
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
