/**
 * DevContext Pro v1.3 - Side Panel Controller
 */

class SidePanelController {
    constructor() {
        this.statusEl = document.getElementById('status');
        this.lastCopiedContent = '';
        this.lastCopiedContentSource = '';
        this.multiSelectActive = false;
        this.diffModeActive = false;
        this.history = [];
        this.init();
    }

    init() {
        this.loadPreferences();
        this.loadColorHistory();
        this.loadHistory();
        this.attachEventListeners();

        // Listen for content copied from content scripts
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'contentCopied') {
                this.lastCopiedContent = request.content;
                this.lastCopiedContentSource = request.source || 'scrape';
                this.addToHistory(request.content, request.source || 'scrape');
            }
        });

        // Check Color Picker support
        if (!window.EyeDropper) {
            document.getElementById('pickColorBtn').disabled = true;
            document.getElementById('pickColorBtn').title = 'EyeDropper API not supported in this browser';
        }
    }

    attachEventListeners() {
        // Color Picker
        document.getElementById('pickColorBtn').addEventListener('click', () => this.handlePickColor());
        document.getElementById('copyColorBtn').addEventListener('click', () => this.handleCopyColor());

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
        const genTS = document.getElementById('genTSInterface');
        const copySelector = document.getElementById('copySelector');
        const networkSnap = document.getElementById('networkSnap');
        const exportMarkdown = document.getElementById('exportMarkdown');

        if (genTS) genTS.addEventListener('click', () => {
            this.handleGenerateTSInterface();
        });
        if (copySelector) copySelector.addEventListener('click', () => {
            this.handleCopySelector();
        });
        if (networkSnap) networkSnap.addEventListener('click', () => {
            this.handleNetworkSnapshot();
        });
        if (exportMarkdown) exportMarkdown.addEventListener('click', () => {
            this.handleExportMarkdown();
        });


        // History
        const clearHistBtn = document.getElementById('clearHistory');
        if (clearHistBtn) clearHistBtn.addEventListener('click', () => this.clearHistory());

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


    }

    // ============================================
    // COLOR PICKER
    // ============================================

    async handlePickColor() {
        if (!window.EyeDropper) return;

        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            const color = result.sRGBHex;

            this.updateColorDisplay(color);
            await this.copyToClipboard(color);
            await this.addToColorHistory(color);

            this.updateStatus(`Picked ${color}`, 'success');
            this.showContentNotification(`Color picked: ${color}`);

            setTimeout(() => {
                this.updateStatus('Ready', 'ready');
            }, 2000);

        } catch (e) {
            if (!e.toString().includes('aborted')) {
                console.error('Color picker error:', e);
                this.updateStatus('Color picker failed', 'error');
            }
        }
    }

    updateColorDisplay(color) {
        document.getElementById('currentColorPreview').style.backgroundColor = color;
        document.getElementById('currentColorCode').textContent = color;
    }

    async handleCopyColor() {
        const color = document.getElementById('currentColorCode').textContent;
        if (color && color !== '#------') {
            await this.copyToClipboard(color);
            this.updateStatus('Color copied', 'success');
            this.showContentNotification(`Color copied: ${color}`);
            setTimeout(() => {
                this.updateStatus('Ready', 'ready');
            }, 1500);
        }
    }

    async copyToClipboard(text, source = 'scrape') {
        try {
            await navigator.clipboard.writeText(text);
            this.lastCopiedContent = text;
            this.lastCopiedContentSource = source;
            this.addToHistory(text, source);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    async loadColorHistory() {
        const { colorHistory = [] } = await chrome.storage.local.get('colorHistory');
        this.renderColorHistory(colorHistory);
    }

    async addToColorHistory(color) {
        let { colorHistory = [] } = await chrome.storage.local.get('colorHistory');

        // Remove duplicate if exists to move it to top
        colorHistory = colorHistory.filter(c => c !== color);

        // Add to front
        colorHistory.unshift(color);

        // Keep last 12 colors
        if (colorHistory.length > 12) {
            colorHistory.pop();
        }

        await chrome.storage.local.set({ colorHistory });
        this.renderColorHistory(colorHistory);
    }

    renderColorHistory(colors) {
        const container = document.getElementById('colorHistory');
        container.innerHTML = colors.map(color => `
          <div class="color-item" 
               style="background-color: ${color}" 
               title="${color}"
               data-color="${color}">
          </div>
      `).join('');

        container.querySelectorAll('.color-item').forEach(item => {
            item.addEventListener('click', () => {
                const color = item.dataset.color;
                this.updateColorDisplay(color);
                this.copyToClipboard(color);
                this.updateStatus(`Copied ${color}`, 'success');
                this.showContentNotification(`Color copied: ${color}`);
                setTimeout(() => this.updateStatus('Ready', 'ready'), 1500);
            });
        });
    }

    async showContentNotification(message) {
        try {
            const tab = await this.getActiveTab();
            if (!tab.url || tab.url.startsWith('chrome://')) return;

            chrome.tabs.sendMessage(tab.id, {
                action: 'showNotification',
                message: message,
                isError: false
            }).catch(() => {
                // Ignore errors if content script isn't ready
            });
        } catch (e) {
            console.log('Could not show notification', e);
        }
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

    async ensureContentScript(tabId) {
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            return true;
        } catch (err) {
            // Content script is er niet → injecteren
            try {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['scripts/utils.js', 'scripts/content.js']
                });
                await chrome.scripting.insertCSS({
                    target: { tabId },
                    files: ['scripts/content.css']
                });
                // Korte delay zodat de script kan initialiseren
                await new Promise(r => setTimeout(r, 100));
                return true;
            } catch (injectErr) {
                console.error('Injectie mislukt:', injectErr);
                return false;
            }
        }
    }

    // ============================================
    // EXTRACTION HISTORY
    // ============================================

    async loadHistory() {
        const { extractionHistory = [] } = await chrome.storage.local.get('extractionHistory');
        this.history = extractionHistory;
        this.renderHistory();
    }

    async addToHistory(content, source = 'scrape') {
        if (!content) return;
        const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const preview = textContent.replace(/\s+/g, ' ').trim().slice(0, 60);

        const item = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            content: textContent,
            source: source,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            preview: preview || 'Empty content'
        };

        // Remove duplicate if identical content
        this.history = this.history.filter(h => h.content !== item.content);
        this.history.unshift(item);

        if (this.history.length > 12) {
            this.history.pop();
        }

        await chrome.storage.local.set({ extractionHistory: this.history });
        this.renderHistory();
    }

    renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;

        if (this.history.length === 0) {
            container.innerHTML = '<div class="history-empty">Geen geschiedenis aanwezig</div>';
            return;
        }

        container.innerHTML = this.history.map(item => `
          <div class="history-item" data-id="${item.id}">
            <div class="history-info">
              <div class="history-header">
                <span class="history-badge ${item.source}">${item.source}</span>
                <span class="history-time">${item.timestamp}</span>
              </div>
              <div class="history-preview">${this.escapeHTML(item.preview)}</div>
            </div>
            <button class="history-copy-btn">Copy</button>
          </div>
        `).join('');

        container.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', async () => {
                const id = el.dataset.id;
                const item = this.history.find(h => h.id === id);
                if (item) {
                    await navigator.clipboard.writeText(item.content);
                    this.lastCopiedContent = item.content;
                    this.lastCopiedContentSource = item.source;
                    this.updateStatus('Opnieuw gekopieerd', 'success');
                    setTimeout(() => this.updateStatus('Ready', 'ready'), 1500);
                }
            });
        });
    }

    async clearHistory() {
        this.history = [];
        await chrome.storage.local.set({ extractionHistory: [] });
        this.renderHistory();
        this.updateStatus('Geschiedenis gewist', 'ready');
        setTimeout(() => this.updateStatus('Ready', 'ready'), 1500);
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

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

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const prefs = await this.getAllPreferences();

            await chrome.tabs.sendMessage(tab.id, {
                action: 'startElementSelection',
                preferences: prefs
            });

            this.updateStatus('Click on any element to scrape', 'processing');

        } catch (error) {
            console.error('Error in scrapeComponent:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : error.message;
            this.updateStatus(msg, 'error');
        }
    }

    async handleCleanDOM() {
        try {
            this.updateStatus('Cleaning DOM...', 'processing');

            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const prefs = await this.getAllPreferences();

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'cleanDOM',
                preferences: prefs
            });

            if (response && response.success) {
                await navigator.clipboard.writeText(response.cleanedHTML);
                this.lastCopiedContent = response.cleanedHTML;
                this.lastCopiedContentSource = 'cleanDOM';
                this.addToHistory(response.cleanedHTML, 'cleanDOM');

                chrome.tabs.sendMessage(tab.id, {
                    action: 'showNotification',
                    message: '✓ Full DOM copied to clipboard',
                    isError: false
                }).catch(() => {});

                this.updateStatus('✓ Copied to clipboard', 'success');

                setTimeout(() => {
                    this.updateStatus('Ready', 'ready');
                }, 2000);
            }

        } catch (error) {
            console.error('Error in cleanDOM:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : 'Error: ' + error.message;
            this.updateStatus(msg, 'error');
        }
    }

    async handleCopyAPI() {
        try {
            this.updateStatus('Extracting API state...', 'processing');

            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const prefs = await this.getAllPreferences();

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'extractAPIState',
                preferences: prefs
            });

            if (response && response.success) {
                await navigator.clipboard.writeText(response.apiState);
                this.lastCopiedContent = response.apiState;
                this.lastCopiedContentSource = 'apiState';
                this.addToHistory(response.apiState, 'apiState');

                chrome.tabs.sendMessage(tab.id, {
                    action: 'showNotification',
                    message: '✓ API state copied to clipboard',
                    isError: false
                }).catch(() => {});

                this.updateStatus('✓ API state copied', 'success');

                setTimeout(() => {
                    this.updateStatus('Ready', 'ready');
                }, 2000);
            }

        } catch (error) {
            console.error('Error in copyAPI:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : 'Error: ' + error.message;
            this.updateStatus(msg, 'error');
        }
    }

    // ============================================
    // MULTI-SELECT MODE
    // ============================================

    async toggleMultiSelectMode(forceState) {
        try {
            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

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
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : error.message;
            this.updateStatus(msg, 'error');
        }
    }

    // ============================================
    // DIFF MODE
    // ============================================

    async handleStartDiff() {
        try {
            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'startDiffMode'
            });

            if (response && response.success) {
                this.diffModeActive = true;
                document.getElementById('startDiff').disabled = true;
                document.getElementById('captureDiff').disabled = false;
                this.updateStatus('Snapshot captured. Perform your action.', 'processing');
            }

        } catch (error) {
            console.error('Error starting diff:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : error.message;
            this.updateStatus(msg, 'error');
        }
    }

    async handleCaptureDiff() {
        try {
            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'captureDiff'
            });

            if (response && response.success) {
                this.diffModeActive = false;
                document.getElementById('startDiff').disabled = false;
                document.getElementById('captureDiff').disabled = true;
                this.lastCopiedContent = response.diff;
                this.lastCopiedContentSource = 'diff';
                this.addToHistory(response.diff, 'diff');
                this.updateStatus('✓ Diff copied', 'success');

                setTimeout(() => {
                    this.updateStatus('Ready', 'ready');
                }, 2000);
            }

        } catch (error) {
            console.error('Error capturing diff:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : error.message;
            this.updateStatus(msg, 'error');
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

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const prefs = await this.getAllPreferences();

            await chrome.tabs.sendMessage(tab.id, {
                action: 'startElementSelection',
                preferences: prefs
            });

            this.updateStatus('Click element, output will be copied', 'processing');

        } catch (error) {
            console.error('Error generating TS interface:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : error.message;
            this.updateStatus(msg, 'error');
        }
    }

    async handleCopySelector() {
        try {
            this.updateStatus('Select element for CSS selector...', 'processing');

            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const prefs = await this.getAllPreferences();

            await chrome.tabs.sendMessage(tab.id, {
                action: 'startElementSelection',
                preferences: prefs,
                quickAction: 'cssSelector'
            });

            this.updateStatus('Click element to get CSS selector', 'processing');

        } catch (error) {
            console.error('Error copying selector:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : 'Failed to start selector';
            this.updateStatus(msg, 'error');
        }
    }

    async handleNetworkSnapshot() {
        try {
            this.updateStatus('Capturing network activity...', 'processing');

            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getNetworkActivity'
            });

            if (response && response.success) {
                const networkContent = JSON.stringify(response.entries, null, 2);
                this.lastCopiedContent = networkContent;
                this.lastCopiedContentSource = 'network';
                this.addToHistory(networkContent, 'network');
                this.updateStatus(`✓ ${response.entries.length} requests copied`, 'success');

                setTimeout(() => {
                    this.updateStatus('Ready', 'ready');
                }, 2000);
            }

        } catch (error) {
            console.error('Error capturing network:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : (error.message || 'Network capture failed');
            this.updateStatus(msg, 'error');
        }
    }

    async handleExportMarkdown() {
        try {
            this.updateStatus('Select element for markdown export...', 'processing');

            const tab = await this.getActiveTab();
            this.checkSystemPage(tab);

            const ready = await this.ensureContentScript(tab.id);
            if (!ready) {
                this.updateStatus('Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.', 'error');
                return;
            }

            const prefs = await this.getAllPreferences();

            await chrome.tabs.sendMessage(tab.id, {
                action: 'startElementSelection',
                preferences: prefs,
                quickAction: 'markdown'
            });

            this.updateStatus('Click element to export as markdown', 'processing');

        } catch (error) {
            console.error('Error exporting markdown:', error);
            const msg = error.message && error.message.includes('Receiving end')
                ? 'Kan niet op deze pagina draaien. Probeer de pagina te vernieuwen.'
                : 'Failed to start markdown export';
            this.updateStatus(msg, 'error');
        }
    }

    // ============================================
    // ASK AI
    // ============================================

    async handleAskAI() {
        try {
            const prefs = await chrome.storage.sync.get(['aiProvider']);
            const provider = prefs.aiProvider || 'gemini';

            // Gebruik NOOIT een blinde clipboard-read. Alleen content die deze
            // extensie zelf bewust heeft gekopieerd via scrape/clean/markdown-acties.
            if (!this.lastCopiedContent) {
                this.updateStatus('Kopieer eerst een component of DOM-snippet', 'error');
                return;
            }

            // Blokkeer expliciet content die uit "Copy API State" komt.
            if (this.lastCopiedContentSource === 'apiState') {
                this.updateStatus('API-state bevat mogelijk gevoelige data — niet naar AI gestuurd', 'error');
                return;
            }

            let context = this.lastCopiedContent;

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


}

new SidePanelController();
