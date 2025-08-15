// background.js - track active tab time per URL
// Stores cumulative time in chrome.storage.session (MV3 ephemeral) and syncs last URL details.

const SESSION_KEY = 'timeTracking';
let current = { tabId: null, url: null, start: null };

function now(){ return Date.now(); }

async function loadState(){
  const data = await chrome.storage.session.get(SESSION_KEY);
  return data[SESSION_KEY] || {}; // { url: { totalMs, lastTitle } }
}
async function saveState(state){
  await chrome.storage.session.set({ [SESSION_KEY]: state });
}

async function switchContext(newTab){
  const state = await loadState();
  const ts = now();
  if(current.tabId !== null && current.url){
    const elapsed = ts - (current.start || ts);
    if(elapsed > 0){
      state[current.url] = state[current.url] || { totalMs: 0, lastTitle: '' };
      state[current.url].totalMs += elapsed;
    }
  }
  if(newTab){
    current = { tabId: newTab.id, url: newTab.url, start: ts };
    if(newTab.url){
      state[newTab.url] = state[newTab.url] || { totalMs: 0, lastTitle: '' };
      state[newTab.url].lastTitle = newTab.title || '';
    }
  }else{
    current = { tabId: null, url: null, start: null };
  }
  await saveState(state);
}
// Removed broadcastTick (popup polls instead)

async function handleFocusChanged(windowId){
  if(windowId === chrome.windows.WINDOW_ID_NONE){
    await switchContext(null);
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if(tab){ await switchContext(tab); }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const tab = await chrome.tabs.get(tabId); await switchContext(tab); } catch {}
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if(tabId === current.tabId && changeInfo.url){
    switchContext(tab);
  }
});
chrome.windows.onFocusChanged.addListener(handleFocusChanged);

// Heartbeat timer every 5s to persist running session & notify popup
// Heartbeat could be used to persist partial elapsed later if desired.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(msg?.type === 'get_time'){
    (async () => {
      try {
        const state = await loadState();
        let total = state[msg.url]?.totalMs || 0;
        if(current.url === msg.url){
          total += now() - (current.start || now());
        }
        sendResponse({ totalMs: total });
      } catch(e) {
        console.log('get_time error:', e.message);
        sendResponse({ totalMs: 0 });
      }
    })();
    return true; // async
  }
});

// Initialize by capturing current active tab when service worker starts
chrome.runtime.onStartup.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if(tab) await switchContext(tab);
  } catch(e) {
    console.log('Init tab capture failed:', e.message);
  }
});

// Also try on install/enable
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if(tab) await switchContext(tab);
  } catch(e) {
    console.log('Install tab capture failed:', e.message);
  }
});
