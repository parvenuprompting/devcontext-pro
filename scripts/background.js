/**
 * DevContext Pro v1.3 - Background Service Worker
 */

class BackgroundService {
    constructor() {
        this.init();
    }

    init() {
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        // Global keyboard shortcut handler
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });

        // Set side panel behavior to open on action click
        if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
            chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
                .catch((error) => console.error(error));
        }

        this.setupDefaultPreferences();
    }

    async setupDefaultPreferences() {
        const defaults = {
            // Original preferences
            excludeComments: true,
            autoFormat: true,
            removeScripts: true,
            smartTrimTailwind: true,
            // v1.3 new preferences
            assetPlaceholders: true,
            preserveAriaData: true,
            includeTailwindConfig: false,
            inferComponentNames: true,
            aiProvider: 'gemini',
            customPrompts: []
        };

        const existing = await chrome.storage.sync.get(Object.keys(defaults));

        const toSet = {};
        for (const [key, value] of Object.entries(defaults)) {
            if (existing[key] === undefined) {
                toSet[key] = value;
            }
        }

        if (Object.keys(toSet).length > 0) {
            await chrome.storage.sync.set(toSet);
        }
    }

    handleInstall(details) {
        if (details.reason === 'install') {
            console.log('DevContext Pro v1.3 installed successfully');
            this.setupDefaultPreferences();
        } else if (details.reason === 'update') {
            console.log('DevContext Pro updated to version', chrome.runtime.getManifest().version);
            // Ensure new v1.3 preferences are set for existing users
            this.setupDefaultPreferences();
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'storeTemporary':
                this.storeTemporaryData(request.key, request.data, sendResponse);
                break;

            case 'retrieveTemporary':
                this.retrieveTemporaryData(request.key, sendResponse);
                break;

            case 'openAITab':
                this.openAITab(request.provider, request.context, sendResponse);
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    async handleCommand(command) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Check if we can run on this page
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                console.log('Cannot activate on this page');
                return;
            }

            const prefs = await chrome.storage.sync.get([
                'excludeComments', 'autoFormat', 'removeScripts', 'smartTrimTailwind',
                'assetPlaceholders', 'preserveAriaData', 'includeTailwindConfig', 'inferComponentNames'
            ]);

            if (command === 'activate-scraper') {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'startElementSelection',
                    preferences: prefs
                });
            } else if (command === 'toggle-multi-select') {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'startMultiSelectMode',
                    preferences: prefs
                });
            }
        } catch (error) {
            console.error('Error handling command:', error);
        }
    }

    async storeTemporaryData(key, data, sendResponse) {
        try {
            await chrome.storage.local.set({ [key]: data });
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async retrieveTemporaryData(key, sendResponse) {
        try {
            const result = await chrome.storage.local.get(key);
            sendResponse({ success: true, data: result[key] });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async openAITab(provider, context, sendResponse) {
        try {
            const maxLength = 4000;
            let truncatedContext = context;
            if (context.length > maxLength) {
                truncatedContext = context.substring(0, maxLength) + '\n\n[Content truncated]';
            }

            const encodedContext = encodeURIComponent(truncatedContext);

            const urls = {
                gemini: `https://gemini.google.com/app?text=${encodedContext}`,
                chatgpt: `https://chat.openai.com/?q=${encodedContext}`
            };

            const url = urls[provider] || urls.gemini;
            await chrome.tabs.create({ url });

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
}

new BackgroundService();
