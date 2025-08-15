// popup.js — fully AI-powered verdict with clean key UX and diagnostics
const els = {
  setup: document.getElementById("setup"),
  verdictCard: document.getElementById("verdictCard"),
  linksCard: document.getElementById("linksCard"),
  avoidBrainrotCard: document.getElementById("avoidBrainrotCard"),
  avoidBrainrotLinks: document.getElementById("avoidBrainrotLinks"),
  apiKey: document.getElementById("apiKey"),
  saveKey: document.getElementById("saveKey"),
  keyStatus: document.getElementById("keyStatus"),
  status: document.getElementById("status"),
  verdict: document.getElementById("verdict"),
  verdictLine: document.getElementById("verdictLine"),
  confidence: document.getElementById("confidence"),
  confidenceValue: document.getElementById("confidenceValue"),
  reason: document.getElementById("reason"),
  resetKey: document.getElementById("resetKey"),
  analyzeLinks: document.getElementById("analyzeLinks"),
  linksStatus: document.getElementById("linksStatus"),
  linksResults: document.getElementById("linksResults"),
  spectrumPointer: document.getElementById("spectrumPointer"),
  spectrum: document.getElementById("spectrum"),
  statsBtn: document.getElementById("statsBtn"),
  statsPanel: document.getElementById("statsPanel"),
  closeStats: document.getElementById("closeStats"),
  statsContent: document.getElementById("statsContent"),
  maxStats: document.getElementById("maxStats"),
  spectrumStages: document.getElementById("spectrumStages"),
  verdictGif: document.getElementById("verdictGif"),
  gifImage: document.getElementById("gifImage"),
  learningPrompt: document.getElementById("learningPrompt"),
  learningLinks: document.getElementById("learningLinks"),
  timeSpent: document.getElementById("timeSpent"),
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
if(els.statsBtn){
  els.statsBtn.addEventListener('click', () => toggleStats(true));
}
if(els.closeStats){
  els.closeStats.addEventListener('click', () => toggleStats(false));
}
if(els.maxStats){
  els.maxStats.addEventListener('click', () => toggleMaxStats());
}

function toggleMaxStats(){
  if(!els.statsPanel) return;
  const isMax = els.statsPanel.classList.toggle('max');
  els.maxStats.textContent = isMax ? 'minimize' : 'maximize';
}

function toggleStats(show){
  if(!els.statsPanel) return;
  els.statsPanel.style.display = show ? 'block' : 'none';
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
  if(els.avoidBrainrotCard) els.avoidBrainrotCard.style.display = "none";
  els.status.textContent = "Analyzing…";
  els.status.className = "status analyzing";
  if(els.verdictLine) els.verdictLine.style.display = "none";
  els.verdict.textContent = "";
  if(els.confidence) els.confidence.textContent = "";
  if(els.confidenceValue) els.confidenceValue.textContent = "";
  els.reason.textContent = "";
  if(els.spectrum) els.spectrum.style.display = "none";
  if(els.timeSpent){ els.timeSpent.textContent = 'Time on this page: --:--'; }
  if(els.verdictGif){ els.verdictGif.style.display = 'none'; }
  if(els.learningPrompt){ els.learningPrompt.style.display = 'none'; }
  // Clear any highlight classes
  if(els.spectrumStages) {
    els.spectrumStages.querySelectorAll('span').forEach(span => span.classList.remove('highlight'));
  }
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

  // Save debug (without key) prior to call
  window.__debug = { request: { ...body, messages: body.messages.map(m => ({...m, content: (m.content||'').slice(0,4000) })) } };

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
      if(els.confidence) els.confidence.textContent = "";
      if(els.confidenceValue) els.confidenceValue.textContent = "";
      els.reason.textContent = content || "(empty)";
      return;
    }

    // Display
    const v = verdictObj.verdict || "uncertain";
    els.verdict.classList.remove("ok","bad");
    if(v === "valuable") els.verdict.classList.add("ok");
    if(v === "brainrot") els.verdict.classList.add("bad");
    const emoji = v === 'valuable' ? '💡' : v === 'brainrot' ? '💀' : '🤔';
    
    // Update status to just show analyzing completed
    els.status.textContent = "Analysis complete";
    els.status.className = "status";
    
    // Display verdict line with all info
    if(els.verdictLine) {
      els.verdictLine.style.display = "flex";
    }
    els.verdict.textContent = `${emoji} ${v.charAt(0).toUpperCase() + v.slice(1)}`;
    if(els.confidenceValue) {
      els.confidenceValue.textContent = `${Math.round((verdictObj.confidence||0)*100)}%`;
    }
    
    // Show spectrum
    if(els.spectrum) {
      els.spectrum.style.display = "block";
    }
    
    // Show brainrot avoidance if verdict is bad
    if((v === 'brainrot' || v === 'doomscroll') && els.avoidBrainrotCard) {
      showBrainrotAvoidance();
    } else if(els.avoidBrainrotCard) {
      els.avoidBrainrotCard.style.display = 'none';
    }
    
    els.reason.textContent = verdictObj.justification || "";

    // Show verdict GIF and special effects
    showVerdictGif(v);
    
    // Add special effects based on verdict
    if(v === 'valuable' || v === 'peak' || v === 'decent') {
      showConfetti();
    } else if(v === 'brainrot' || v === 'doomscroll') {
      showWompWomp();
      showTouchGrassMessage();
    }

    // Move spectrum pointer and highlight matching stage
    if(els.spectrumPointer && els.spectrumStages){
      // Map verdict to new stage positions
      let posMap = {
        brainrot: 0.05,
        doomscroll: 0.25, 
        uncertain: 0.45, // map to meh
        meh: 0.45,
        decent: 0.70,
        valuable: 0.95, // map to peak
        peak: 0.95
      };
      let pos = posMap[v] ?? 0.45;
      
      // Adjust position slightly based on confidence
      const conf = Math.max(0, Math.min(1, verdictObj.confidence||0));
      if(v === 'brainrot') pos = 0.05 + conf * 0.15;          
      else if(v === 'doomscroll') pos = 0.25 + conf * 0.15;    
      else if(v === 'uncertain' || v === 'meh') pos = 0.35 + conf * 0.20;    
      else if(v === 'decent') pos = 0.60 + conf * 0.20;     
      else if(v === 'valuable' || v === 'peak') pos = 0.80 + conf * 0.15;     
      
      els.spectrumPointer.style.left = `calc(${(pos*100).toFixed(2)}% - 10px)`;
      
      // Highlight matching spectrum stage
      els.spectrumStages.querySelectorAll('span').forEach(span => {
        span.classList.remove('highlight');
        const spanVerdict = span.getAttribute('data-verdict');
        if(spanVerdict === v || 
           (v === 'valuable' && spanVerdict === 'peak') ||
           (v === 'uncertain' && spanVerdict === 'meh')) {
          span.classList.add('highlight');
        }
      });
    }

    // Store model raw response snippet
    if(window.__debug){
      window.__debug.response = {
        raw: content.slice(0,6000),
        parsed: verdictObj
      };
      updateStatsPanel();
    }

    // Cache page object for link analysis reuse
    window.__cachedPage = page;
    window.__cachedKey = apiKey;
  startTimeUpdates(page.url);

  }catch(err){
    els.status.textContent = "Error";
    if(els.verdictLine) els.verdictLine.style.display = "none";
    els.verdict.textContent = "";
    if(els.confidence) els.confidence.textContent = "";
    if(els.confidenceValue) els.confidenceValue.textContent = "";
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
    const emoji = item.verdict === 'valuable' ? '💡' : item.verdict === 'brainrot' ? '💀' : '🤔';
    div.innerHTML = `
      <div class="linkVerdict">
        <span class="badge ${badgeClass}">${emoji} ${item.verdict||'?'}</span>
      </div>
      <div class="linkUrl">${escapeHtml(item.url||'')}</div>
      <div class="linkJust">${escapeHtml(item.justification||'')}</div>
    `;
    els.linksResults.appendChild(div);
  });
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function updateStatsPanel(){
  if(!els.statsContent || !window.__debug) return;
  try{
    const safe = JSON.stringify(window.__debug, null, 2);
    els.statsContent.textContent = safe;
  }catch(e){
    els.statsContent.textContent = 'Failed to serialize debug data.';
  }
}

let timeInterval;
function startTimeUpdates(url){
  if(!els.timeSpent || !url) return;
  if(timeInterval) clearInterval(timeInterval);
  const refresh = async () => {
    try{
      const res = await chrome.runtime.sendMessage({ type: 'get_time', url });
      if(!res) return;
      const ms = res.totalMs || 0;
      els.timeSpent.textContent = 'Time on this page: ' + formatDuration(ms);
    }catch{}
  };
  refresh();
  timeInterval = setInterval(refresh, 1000);
}

function formatDuration(ms){
  const totalSec = Math.floor(ms/1000);
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  const base = h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  return base;
}

function showVerdictGif(verdict){
  if(!els.verdictGif || !els.gifImage) return;
  
  // Use working GIF URLs (HTTPS Giphy/Tenor direct links)
  const gifUrls = {
    brainrot: [
      'https://media.giphy.com/media/ZRUcenc6iO4CAVmO8i/giphy.gif', // Cat blep
      'https://media.giphy.com/media/xT5LMzIK1AdZJ4cYW4/giphy.gif', // Brain loading
      'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif'  // Confused
    ],
    uncertain: [
      'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', // Thinking
      'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', // Confused
      'https://media.giphy.com/media/l3V0H7bYv5Ml5TOfu/giphy.gif'   // Shrug
    ],
    valuable: [
      'https://media.giphy.com/media/CAYVZA5NRb529kKQUc/giphy.gif', // Gigachad
      'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',   // Success
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif'   // Celebration
    ]
  };

  const urls = gifUrls[verdict] || gifUrls.uncertain;
  const randomUrl = urls[Math.floor(Math.random() * urls.length)];
  
  // Load GIF with better error handling
  els.gifImage.onerror = () => {
    console.log('GIF failed to load, using fallback');
    createFallbackGif(verdict);
  };
  
  els.gifImage.onload = () => {
    console.log('GIF loaded successfully');
  };
  
  els.gifImage.src = randomUrl;
  els.verdictGif.style.display = 'block';
}

function createFallbackGif(verdict){
  const messages = {
    brainrot: '💀 brainrot detected',
    uncertain: '🤔 mid energy',
    valuable: '💡 peak content'
  };
  
  els.gifImage.src = `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f1736" stroke="#223059"/>
      <text x="50%" y="50%" fill="#9aa3b2" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14">
        ${messages[verdict] || '🤔 mid energy'}
      </text>
    </svg>
  `)}`;
}

function showConfetti(){
  // Create confetti container
  const confetti = document.createElement('div');
  confetti.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
  `;
  
  // Create confetti pieces
  for(let i = 0; i < 30; i++){
    const piece = document.createElement('div');
    piece.textContent = ['🎉','✨','🔥','💯','🚀'][Math.floor(Math.random() * 5)];
    piece.style.cssText = `
      position: absolute;
      font-size: 16px;
      left: ${Math.random() * 100}%;
      animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    confetti.appendChild(piece);
  }
  
  // Add CSS animation
  if(!document.getElementById('confettiStyle')){
    const style = document.createElement('style');
    style.id = 'confettiStyle';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(confetti);
  
  // Clean up after animation
  setTimeout(() => {
    if(confetti.parentNode) confetti.parentNode.removeChild(confetti);
  }, 4000);
}

function showTouchGrassMessage(){
  // Create message overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 92, 92, 0.95);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-family: ui-sans-serif, system-ui;
    font-size: 18px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    animation: touchGrassAnim 3s ease-in-out forwards;
  `;
  overlay.textContent = '🌱 Touch grass subu! 🌱';
  
  // Add CSS animation
  if(!document.getElementById('touchGrassStyle')){
    const style = document.createElement('style');
    style.id = 'touchGrassStyle';
    style.textContent = `
      @keyframes touchGrassAnim {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(overlay);
  
  // Clean up after animation
  setTimeout(() => {
    if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 3000);
}

function showLearningPrompt(){
  if(!els.learningPrompt || !els.learningLinks) return;
  
  // Curated educational resources
  const learningResources = [
    {
      title: "Khan Academy",
      desc: "Free world-class education for anyone, anywhere",
      url: "https://www.khanacademy.org/",
      icon: "📚"
    },
    {
      title: "Brilliant",
      desc: "Interactive problem solving in math, science & CS",
      url: "https://brilliant.org/",
      icon: "🧠"
    },
    {
      title: "Coursera",
      desc: "Online courses from top universities",
      url: "https://www.coursera.org/",
      icon: "🎓"
    },
    {
      title: "MIT OpenCourseWare",
      desc: "Free MIT course materials for self-paced learning",
      url: "https://ocw.mit.edu/",
      icon: "🔬"
    },
    {
      title: "TED-Ed",
      desc: "Short educational videos on fascinating topics",
      url: "https://ed.ted.com/",
      icon: "💡"
    }
  ];
  
  // Pick 3 random resources
  const selected = learningResources
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  
  els.learningLinks.innerHTML = '';
  selected.forEach(resource => {
    const link = document.createElement('a');
    link.className = 'learningLink';
    link.href = resource.url;
    link.target = '_blank';
    link.innerHTML = `
      <div class="linkTitle">${resource.icon} ${resource.title}</div>
      <div class="linkDesc">${resource.desc}</div>
    `;
    els.learningLinks.appendChild(link);
  });
  
  els.learningPrompt.style.display = 'block';
}

function showBrainrotAvoidance(){
  if(!els.avoidBrainrotCard || !els.avoidBrainrotLinks) return;
  
  // Quality content alternatives
  const qualityResources = [
    {
      title: "TED Talks",
      desc: "Inspiring talks from amazing speakers",
      url: "https://www.ted.com/talks",
      icon: "🎤"
    },
    {
      title: "National Geographic",
      desc: "Explore our planet and beyond",
      url: "https://www.nationalgeographic.com/",
      icon: "🌍"
    },
    {
      title: "BBC Nature",
      desc: "Discover the wonders of the natural world",
      url: "https://www.bbc.com/nature",
      icon: "🦁"
    },
    {
      title: "Kurzgesagt",
      desc: "Science made simple and beautiful",
      url: "https://www.youtube.com/@kurzgesagt",
      icon: "🧬"
    },
    {
      title: "The Guardian Science",
      desc: "Latest discoveries and scientific insights",
      url: "https://www.theguardian.com/science",
      icon: "🔬"
    },
    {
      title: "MIT Technology Review",
      desc: "The latest in technology and innovation",
      url: "https://www.technologyreview.com/",
      icon: "⚡"
    }
  ];
  
  // Pick 3 random quality resources
  const selected = qualityResources
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  
  els.avoidBrainrotLinks.innerHTML = '';
  selected.forEach(resource => {
    const link = document.createElement('a');
    link.className = 'learningLink';
    link.href = resource.url;
    link.target = '_blank';
    link.innerHTML = `
      <div class="linkTitle">${resource.icon} ${resource.title}</div>
      <div class="linkDesc">${resource.desc}</div>
    `;
    els.avoidBrainrotLinks.appendChild(link);
  });
  
  els.avoidBrainrotCard.style.display = 'block';
}

function showWompWomp(){
  // Create womp womp overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(30, 30, 30, 0.95);
    color: #999;
    padding: 20px 30px;
    border-radius: 12px;
    font-family: ui-sans-serif, system-ui;
    font-size: 24px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: wompWompAnim 2.5s ease-in-out forwards;
    text-align: center;
  `;
  overlay.innerHTML = '📉<br>womp womp<br>💀';
  
  // Add CSS animation
  if(!document.getElementById('wompWompStyle')){
    const style = document.createElement('style');
    style.id = 'wompWompStyle';
    style.textContent = `
      @keyframes wompWompAnim {
        0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
        15% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        30% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
        45% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(overlay);
  
  // Clean up after animation
  setTimeout(() => {
    if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 2500);
}
