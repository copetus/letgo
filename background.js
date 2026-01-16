const DEFAULT_TIMEOUT_MINUTES = 30;
const ALARM_NAME = "letgo-tab-sweep";
const ALARM_PERIOD_MINUTES = 1;

const tabLastAccessed = new Map();

async function getTimeoutMinutes() {
  const stored = await chrome.storage.sync.get({ timeoutMinutes: DEFAULT_TIMEOUT_MINUTES });
  return Number(stored.timeoutMinutes) || DEFAULT_TIMEOUT_MINUTES;
}

function recordTabAccess(tabId) {
  tabLastAccessed.set(tabId, Date.now());
}

async function initializeTabAccess() {
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    tabLastAccessed.set(tab.id, now);
  }
}

async function sweepInactiveTabs() {
  const timeoutMinutes = await getTimeoutMinutes();
  const cutoff = Date.now() - timeoutMinutes * 60 * 1000;
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id) continue;

    const lastAccessed = tabLastAccessed.get(tab.id) ?? tab.lastAccessed ?? Date.now();
    const isActive = Boolean(tab.active);
    const isPinned = Boolean(tab.pinned);

    if (!isActive && !isPinned && lastAccessed < cutoff) {
      await chrome.tabs.remove(tab.id);
      tabLastAccessed.delete(tab.id);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeTabAccess();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  recordTabAccess(tabId);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    recordTabAccess(tab.id);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabLastAccessed.delete(tabId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    sweepInactiveTabs().catch((error) => {
      console.error("LetGo sweep failed", error);
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.timeoutMinutes) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
  }
});
