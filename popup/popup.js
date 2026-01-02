class PopupController {
  constructor() {
    this.statusEl = document.getElementById('status');
    this.init();
  }

  init() {
    this.loadPreferences();
    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('scrapeComponent').addEventListener('click', () => this.handleScrapeComponent());
    document.getElementById('cleanDOM').addEventListener('click', () => this.handleCleanDOM());
    document.getElementById('copyAPI').addEventListener('click', () => this.handleCopyAPI());

    document.getElementById('excludeComments').addEventListener('change', (e) => this.savePreference('excludeComments', e.target.checked));
    document.getElementById('autoFormat').addEventListener('change', (e) => this.savePreference('autoFormat', e.target.checked));
    document.getElementById('removeScripts').addEventListener('change', (e) => this.savePreference('removeScripts', e.target.checked));
    document.getElementById('smartTrimTailwind').addEventListener('change', (e) => this.savePreference('smartTrimTailwind', e.target.checked));
  }



  async loadPreferences() {
    const defaults = {
      excludeComments: true,
      autoFormat: true,
      removeScripts: true,
      smartTrimTailwind: true
    };

    const prefs = await chrome.storage.sync.get(defaults);

    document.getElementById('excludeComments').checked = prefs.excludeComments;
    document.getElementById('autoFormat').checked = prefs.autoFormat;
    document.getElementById('removeScripts').checked = prefs.removeScripts;
    document.getElementById('smartTrimTailwind').checked = prefs.smartTrimTailwind;
  }

  async savePreference(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  updateStatus(message, type = 'ready') {
    this.statusEl.className = `status ${type}`;
    this.statusEl.querySelector('span').textContent = message;

    // Trigger success glow effect
    if (type === 'success') {
      document.body.classList.add('success-glow');
      setTimeout(() => {
        document.body.classList.remove('success-glow');
      }, 1000);
    }
  }

  async handleScrapeComponent() {
    try {
      this.updateStatus('Activating element selector...', 'processing');

      const tab = await this.getActiveTab();

      // Check if we can run on this page
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error('Selection is not allowed on this system page. Try a normal website.');
      }

      const prefs = await chrome.storage.sync.get(['excludeComments', 'autoFormat', 'removeScripts', 'smartTrimTailwind']);

      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'startElementSelection',
          preferences: prefs
        });

        this.updateStatus('Click on any element to scrape', 'processing');

        setTimeout(() => {
          window.close();
        }, 800);
      } catch (e) {
        if (e.message.includes('Receiving end does not exist')) {
          throw new Error('Content script not loaded. Refresh the page and try again.');
        }
        throw e;
      }

    } catch (error) {
      console.error('Error in scrapeComponent:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  async handleCleanDOM() {
    try {
      this.updateStatus('Cleaning DOM...', 'processing');

      const tab = await this.getActiveTab();
      const prefs = await chrome.storage.sync.get(['excludeComments', 'removeScripts', 'smartTrimTailwind', 'autoFormat']);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'cleanDOM',
        preferences: prefs
      });

      if (response.success) {
        await navigator.clipboard.writeText(response.cleanedHTML);
        this.updateStatus('✓ Copied to clipboard', 'success');

        setTimeout(() => {
          this.updateStatus('Ready', 'ready');
        }, 2000);
      }

    } catch (error) {
      console.error('Error in cleanDOM:', error);
      this.updateStatus('Error: ' + error.message, 'error');
    }
  }

  async handleCopyAPI() {
    try {
      this.updateStatus('Extracting API state...', 'processing');

      const tab = await this.getActiveTab();
      const prefs = await chrome.storage.sync.get(['autoFormat']);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractAPIState',
        preferences: prefs
      });

      if (response.success) {
        await navigator.clipboard.writeText(response.apiState);
        this.updateStatus('✓ API state copied', 'success');

        setTimeout(() => {
          this.updateStatus('Ready', 'ready');
        }, 2000);
      }

    } catch (error) {
      console.error('Error in copyAPI:', error);
      this.updateStatus('Error: ' + error.message, 'error');
    }
  }
}

new PopupController();
