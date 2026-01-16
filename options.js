const DEFAULT_TIMEOUT_MINUTES = 30;
const timeoutInput = document.getElementById("timeout");
const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");

async function loadSettings() {
  const stored = await chrome.storage.sync.get({ timeoutMinutes: DEFAULT_TIMEOUT_MINUTES });
  timeoutInput.value = stored.timeoutMinutes;
}

function showStatus(message) {
  statusEl.textContent = message;
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
}

saveButton.addEventListener("click", async () => {
  const minutes = Number(timeoutInput.value);
  if (!Number.isFinite(minutes) || minutes < 5) {
    showStatus("Please choose a value of at least 5 minutes.");
    return;
  }

  saveButton.disabled = true;
  await chrome.storage.sync.set({ timeoutMinutes: minutes });
  showStatus("Saved!");
  saveButton.disabled = false;
});

loadSettings().catch((error) => {
  console.error("Failed to load settings", error);
});
