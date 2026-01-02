/**
 * DevContext Pro v1.3 - Popup Controller
 */

class PopupController {
  constructor() {
    this.statusEl = document.getElementById('status');
    this.lastCopiedContent = '';
    this.multiSelectActive = false;
    this.diffModeActive = false;
    this.init();
  }

  init() {
    this.loadPreferences();
    this.loadCustomPrompts();
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Main actions
    document.getElementById('scrapeComponent').addEventListener('click', () => this.handleScrapeComponent());
    document.getElementById('cleanDOM').addEventListener('click', () => this.handleCleanDOM());
    document.getElementById('copyAPI').addEventListener('click', () => this.handleCopyAPI());

    // Multi-select mode
    document.getElementById('multiSelectMode').addEventListener('click', () => this.toggleMultiSelectMode());
    document.getElementById('multiSelectCheck').addEventListener('change', (e) => this.toggleMultiSelectMode(e.target.checked));

    // Diff mode
    document.getElementById('startDiff').addEventListener('click', () => this.handleStartDiff());
    document.getElementById('captureDiff').addEventListener('click', () => this.handleCaptureDiff());

    // Quick actions
    document.getElementById('genTSInterface').addEventListener('click', () => this.handleGenerateTSInterface());
    document.getElementById('copySelector').addEventListener('click', () => this.handleCopySelector());
    document.getElementById('networkSnap').addEventListener('click', () => this.handleNetworkSnapshot());
    document.getElementById('exportMarkdown').addEventListener('click', () => this.handleExportMarkdown());

    // Ask AI
    document.getElementById('askAI').addEventListener('click', () => this.handleAskAI());
    document.querySelectorAll('input[name="aiProvider"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.savePreference('aiProvider', e.target.value));
    });

    // Preferences
    const prefs = [
      'assetPlaceholders', 'preserveAriaData', 'excludeComments',
      'autoFormat', 'removeScripts', 'smartTrimTailwind',
      'includeTailwindConfig', 'inferComponentNames'
    ];
    prefs.forEach(pref => {
      const el = document.getElementById(pref);
      if (el) {
        el.addEventListener('change', (e) => this.savePreference(pref, e.target.checked));
      }
    });

    // Custom prompts
    document.getElementById('addPrompt').addEventListener('click', () => this.showPromptModal());
    document.getElementById('cancelPrompt').addEventListener('click', () => this.hidePromptModal());
    document.getElementById('savePrompt').addEventListener('click', () => this.saveCustomPrompt());
  }

  // ============================================
  // PREFERENCES
  // ============================================

  async loadPreferences() {
    const defaults = {
      excludeComments: true,
      autoFormat: true,
      removeScripts: true,
      smartTrimTailwind: true,
      assetPlaceholders: true,
      preserveAriaData: true,
      includeTailwindConfig: false,
      inferComponentNames: true,
      aiProvider: 'gemini'
    };

    const prefs = await chrome.storage.sync.get(defaults);

    // Set checkbox states
    Object.keys(defaults).forEach(key => {
      const el = document.getElementById(key);
      if (el && el.type === 'checkbox') {
        el.checked = prefs[key];
      }
    });

    // Set AI provider radio
    const providerRadio = document.querySelector(`input[name="aiProvider"][value="${prefs.aiProvider}"]`);
    if (providerRadio) {
      providerRadio.checked = true;
    }
  }

  async savePreference(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }

  async getAllPreferences() {
    return await chrome.storage.sync.get([
      'excludeComments', 'autoFormat', 'removeScripts', 'smartTrimTailwind',
      'assetPlaceholders', 'preserveAriaData', 'includeTailwindConfig', 'inferComponentNames'
    ]);
  }

  // ============================================
  // STATUS & UTILITIES
  // ============================================

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  updateStatus(message, type = 'ready') {
    this.statusEl.className = `status ${type}`;
    this.statusEl.querySelector('span').textContent = message;

    if (type === 'success') {
      document.body.classList.add('success-glow');
      setTimeout(() => {
        document.body.classList.remove('success-glow');
      }, 1000);
    }
  }

  checkSystemPage(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      throw new Error('Not available on system pages. Try a normal website.');
    }
  }

  // ============================================
  // MAIN ACTIONS
  // ============================================

  async handleScrapeComponent() {
    try {
      this.updateStatus('Activating element selector...', 'processing');

      const tab = await this.getActiveTab();
      this.checkSystemPage(tab);

      const prefs = await this.getAllPreferences();

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
          throw new Error('Refresh the page and try again.');
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
      const prefs = await this.getAllPreferences();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'cleanDOM',
        preferences: prefs
      });

      if (response.success) {
        await navigator.clipboard.writeText(response.cleanedHTML);
        this.lastCopiedContent = response.cleanedHTML;

        chrome.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: '✓ Full DOM copied to clipboard',
          isError: false
        });

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
      const prefs = await this.getAllPreferences();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractAPIState',
        preferences: prefs
      });

      if (response.success) {
        await navigator.clipboard.writeText(response.apiState);
        this.lastCopiedContent = response.apiState;

        chrome.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: '✓ API state copied to clipboard',
          isError: false
        });

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

  // ============================================
  // MULTI-SELECT MODE
  // ============================================

  async toggleMultiSelectMode(forceState) {
    try {
      const tab = await this.getActiveTab();
      this.checkSystemPage(tab);

      const prefs = await this.getAllPreferences();
      const newState = forceState !== undefined ? forceState : !this.multiSelectActive;

      if (newState) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'startMultiSelectMode',
          preferences: prefs
        });
        this.multiSelectActive = true;
        document.getElementById('multiSelectCheck').checked = true;
        document.getElementById('multiSelectMode').classList.add('active');
        this.updateStatus('Multi-select mode active', 'processing');

        setTimeout(() => {
          window.close();
        }, 800);
      } else {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'stopMultiSelectMode'
        });
        this.multiSelectActive = false;
        document.getElementById('multiSelectCheck').checked = false;
        document.getElementById('multiSelectMode').classList.remove('active');
        this.updateStatus('Ready', 'ready');
      }

    } catch (error) {
      console.error('Error toggling multi-select:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  // ============================================
  // DIFF MODE
  // ============================================

  async handleStartDiff() {
    try {
      const tab = await this.getActiveTab();
      this.checkSystemPage(tab);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'startDiffMode'
      });

      if (response.success) {
        this.diffModeActive = true;
        document.getElementById('startDiff').disabled = true;
        document.getElementById('captureDiff').disabled = false;
        this.updateStatus('Snapshot captured. Perform your action.', 'processing');
      }

    } catch (error) {
      console.error('Error starting diff:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  async handleCaptureDiff() {
    try {
      const tab = await this.getActiveTab();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'captureDiff'
      });

      if (response.success) {
        this.diffModeActive = false;
        document.getElementById('startDiff').disabled = false;
        document.getElementById('captureDiff').disabled = true;
        this.lastCopiedContent = response.diff;
        this.updateStatus('✓ Diff copied', 'success');

        setTimeout(() => {
          this.updateStatus('Ready', 'ready');
        }, 2000);
      }

    } catch (error) {
      console.error('Error capturing diff:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  // ============================================
  // QUICK ACTIONS
  // ============================================

  async handleGenerateTSInterface() {
    try {
      this.updateStatus('Select element for TS interface...', 'processing');

      const tab = await this.getActiveTab();
      this.checkSystemPage(tab);

      const prefs = await this.getAllPreferences();

      // First start selection, then generate interface
      await chrome.tabs.sendMessage(tab.id, {
        action: 'startElementSelection',
        preferences: prefs
      });

      this.updateStatus('Click element, then use popup again', 'processing');

      setTimeout(() => {
        window.close();
      }, 800);

    } catch (error) {
      console.error('Error generating TS interface:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  async handleCopySelector() {
    try {
      this.updateStatus('Generating selector...', 'processing');

      const tab = await this.getActiveTab();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'generateCSSSelector'
      });

      if (response.success) {
        this.lastCopiedContent = `CSS: ${response.css}\nXPath: ${response.xpath}`;
        this.updateStatus('✓ Selectors copied', 'success');

        setTimeout(() => {
          this.updateStatus('Ready', 'ready');
        }, 2000);
      } else {
        this.updateStatus('Select an element first', 'error');
      }

    } catch (error) {
      console.error('Error copying selector:', error);
      this.updateStatus('Select an element first', 'error');
    }
  }

  async handleNetworkSnapshot() {
    try {
      this.updateStatus('Capturing network activity...', 'processing');

      const tab = await this.getActiveTab();
      this.checkSystemPage(tab);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getNetworkActivity'
      });

      if (response.success) {
        this.lastCopiedContent = response.entries;
        this.updateStatus(`✓ ${response.entries.length} requests copied`, 'success');

        setTimeout(() => {
          this.updateStatus('Ready', 'ready');
        }, 2000);
      }

    } catch (error) {
      console.error('Error capturing network:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  async handleExportMarkdown() {
    try {
      this.updateStatus('Exporting markdown...', 'processing');

      const tab = await this.getActiveTab();

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'exportMarkdownDoc'
      });

      if (response.success) {
        this.lastCopiedContent = response.markdown;
        this.updateStatus('✓ Markdown exported', 'success');

        setTimeout(() => {
          this.updateStatus('Ready', 'ready');
        }, 2000);
      } else {
        this.updateStatus('Select an element first', 'error');
      }

    } catch (error) {
      console.error('Error exporting markdown:', error);
      this.updateStatus('Select an element first', 'error');
    }
  }

  // ============================================
  // ASK AI
  // ============================================

  async handleAskAI() {
    try {
      const prefs = await chrome.storage.sync.get(['aiProvider', 'customPrompts']);
      const provider = prefs.aiProvider || 'gemini';

      // Get clipboard content
      let context = '';
      try {
        context = await navigator.clipboard.readText();
      } catch (e) {
        context = this.lastCopiedContent || 'No content copied yet';
      }

      // Check if there's a selected prompt to prepend
      const selectedPrompt = document.querySelector('.prompt-item.selected');
      if (selectedPrompt && prefs.customPrompts) {
        const promptId = selectedPrompt.dataset.id;
        const prompt = prefs.customPrompts.find(p => p.id === promptId);
        if (prompt) {
          context = prompt.prompt + '\n\n' + context;
        }
      }

      // Truncate for URL safety (URLs have length limits)
      const maxLength = 4000;
      if (context.length > maxLength) {
        context = context.substring(0, maxLength) + '\n\n[Content truncated. Full context is in your clipboard.]';
      }

      const encodedContext = encodeURIComponent(context);

      const urls = {
        gemini: `https://gemini.google.com/app?text=${encodedContext}`,
        chatgpt: `https://chat.openai.com/?q=${encodedContext}`
      };

      chrome.tabs.create({ url: urls[provider] });
      this.updateStatus(`Opening ${provider}...`, 'success');

    } catch (error) {
      console.error('Error opening AI:', error);
      this.updateStatus(error.message, 'error');
    }
  }

  // ============================================
  // CUSTOM PROMPTS
  // ============================================

  async loadCustomPrompts() {
    const { customPrompts = [] } = await chrome.storage.sync.get('customPrompts');
    this.renderPromptsList(customPrompts);
  }

  renderPromptsList(prompts) {
    const list = document.getElementById('promptsList');

    if (prompts.length === 0) {
      list.innerHTML = '<div class="no-prompts">No custom prompts yet</div>';
      return;
    }

    list.innerHTML = prompts.map(prompt => `
      <div class="prompt-item" data-id="${prompt.id}">
        <span class="prompt-name">${this.escapeHtml(prompt.name)}</span>
        <div class="prompt-actions">
          <button class="prompt-select" title="Use this prompt">✓</button>
          <button class="prompt-delete" title="Delete">×</button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    list.querySelectorAll('.prompt-item').forEach(item => {
      item.querySelector('.prompt-select').addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectPrompt(item);
      });
      item.querySelector('.prompt-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePrompt(item.dataset.id);
      });
    });
  }

  selectPrompt(item) {
    document.querySelectorAll('.prompt-item').forEach(i => i.classList.remove('selected'));
    item.classList.toggle('selected');
  }

  showPromptModal() {
    document.getElementById('promptModal').classList.add('visible');
    document.getElementById('promptName').focus();
  }

  hidePromptModal() {
    document.getElementById('promptModal').classList.remove('visible');
    document.getElementById('promptName').value = '';
    document.getElementById('promptText').value = '';
  }

  async saveCustomPrompt() {
    const name = document.getElementById('promptName').value.trim();
    const prompt = document.getElementById('promptText').value.trim();

    if (!name || !prompt) {
      this.updateStatus('Please fill in all fields', 'error');
      return;
    }

    const { customPrompts = [] } = await chrome.storage.sync.get('customPrompts');

    const newPrompt = {
      id: Date.now().toString(),
      name: name,
      prompt: prompt
    };

    customPrompts.push(newPrompt);
    await chrome.storage.sync.set({ customPrompts });

    this.renderPromptsList(customPrompts);
    this.hidePromptModal();
    this.updateStatus('✓ Prompt saved', 'success');

    setTimeout(() => {
      this.updateStatus('Ready', 'ready');
    }, 2000);
  }

  async deletePrompt(id) {
    const { customPrompts = [] } = await chrome.storage.sync.get('customPrompts');
    const filtered = customPrompts.filter(p => p.id !== id);
    await chrome.storage.sync.set({ customPrompts: filtered });
    this.renderPromptsList(filtered);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

new PopupController();
