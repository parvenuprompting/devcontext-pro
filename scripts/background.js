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
            case 'processHTML':
                this.processHTML(request.html, request.preferences, sendResponse);
                break;

            case 'convertToMarkdown':
                this.convertToMarkdown(request.html, sendResponse);
                break;

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

    processHTML(html, preferences, sendResponse) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            if (preferences.removeScripts) {
                doc.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());

                doc.querySelectorAll('svg path').forEach(path => {
                    const d = path.getAttribute('d');
                    if (d && d.length > 100) {
                        path.setAttribute('d', '...');
                    }
                });
            }

            if (preferences.excludeComments) {
                this.removeCommentsFromDoc(doc);
            }

            const processed = doc.documentElement.outerHTML;
            sendResponse({ success: true, processedHTML: processed });

        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    removeCommentsFromDoc(doc) {
        const treeWalker = document.createTreeWalker(
            doc,
            NodeFilter.SHOW_COMMENT,
            null
        );

        const comments = [];
        while (treeWalker.nextNode()) {
            comments.push(treeWalker.currentNode);
        }

        comments.forEach(comment => comment.remove());
    }

    convertToMarkdown(html, sendResponse) {
        try {
            let markdown = html;

            markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
            markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
            markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
            markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
            markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
            markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
            markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
            markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
            markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
            markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
            markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
            markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
            markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
            markdown = markdown.replace(/<[^>]+>/g, '');
            markdown = markdown.replace(/\n{3,}/g, '\n\n');

            sendResponse({ success: true, markdown: markdown.trim() });

        } catch (error) {
            sendResponse({ success: false, error: error.message });
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
