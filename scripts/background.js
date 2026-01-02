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

        this.setupDefaultPreferences();
    }

    async setupDefaultPreferences() {
        const defaults = {
            excludeComments: true,
            autoFormat: true,
            removeScripts: true,
            smartTrimTailwind: true
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
            console.log('DevContext Pro installed successfully');
            this.setupDefaultPreferences();
        } else if (details.reason === 'update') {
            console.log('DevContext Pro updated to version', chrome.runtime.getManifest().version);
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

            default:
                sendResponse({ success: false, error: 'Unknown action' });
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
}

new BackgroundService();
