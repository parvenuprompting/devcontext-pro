class DevContextPro {
    constructor() {
        this.selectedElement = null;
        this.overlay = null;
        this.isSelecting = false;
        this.preferences = {};

        this.init();
    }

    init() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });
    }

    handleMessage(request, sender, sendResponse) {
        this.preferences = request.preferences || {};

        switch (request.action) {
            case 'startElementSelection':
                this.startElementSelection();
                sendResponse({ success: true });
                break;

            case 'cleanDOM':
                this.cleanAndCopyDOM(sendResponse);
                break;

            case 'extractAPIState':
                this.extractAPIState(sendResponse);
                break;

            case 'showNotification':
                this.showNotification(request.message, request.isError || false);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    startElementSelection() {
        if (this.isSelecting) return;

        this.isSelecting = true;
        this.createOverlay();

        document.addEventListener('mouseover', this.handleMouseOver);
        document.addEventListener('click', this.handleClick, true);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    stopElementSelection() {
        this.isSelecting = false;

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        document.removeEventListener('mouseover', this.handleMouseOver);
        document.removeEventListener('click', this.handleClick, true);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'devcontext-overlay';
        this.overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #6366f1;
      background: rgba(99, 102, 241, 0.1);
      z-index: 999999;
      transition: all 0.1s ease;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
    `;
        document.body.appendChild(this.overlay);
    }

    handleMouseOver = (e) => {
        if (!this.isSelecting) return;

        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();

        this.overlay.style.left = rect.left + window.scrollX + 'px';
        this.overlay.style.top = rect.top + window.scrollY + 'px';
        this.overlay.style.width = rect.width + 'px';
        this.overlay.style.height = rect.height + 'px';
    }

    handleClick = async (e) => {
        if (!this.isSelecting) return;

        e.preventDefault();
        e.stopPropagation();

        this.selectedElement = e.target;
        const html = this.extractCleanHTML(this.selectedElement);

        try {
            await navigator.clipboard.writeText(html);
            this.showNotification('✓ Component copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showNotification('✗ Failed to copy', true);
        }

        this.stopElementSelection();
    }

    handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            this.stopElementSelection();
            this.showNotification('Selection cancelled');
        }
    }

    extractCleanHTML(element) {
        const clone = element.cloneNode(true);

        if (this.preferences.removeScripts) {
            clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());

            // Remove complex SVG paths to reduce size
            try {
                clone.querySelectorAll('svg path').forEach(path => {
                    const d = path.getAttribute('d');
                    if (d && d.length > 100) {
                        path.remove();
                    }
                });
            } catch (e) {
                // Silently skip SVG path errors
                console.log('SVG path processing skipped:', e.message);
            }
        }

        if (this.preferences.excludeComments) {
            this.removeComments(clone);
        }

        if (this.preferences.smartTrimTailwind) {
            this.trimTailwindClasses(clone);
        }

        let html = clone.outerHTML;

        if (this.preferences.autoFormat) {
            html = this.formatForGemini(html);
        }

        return html;
    }

    trimTailwindClasses(node) {
        // Visual-only patterns (REMOVE these)
        const visualPatterns = [
            /\b(m|p)(t|b|l|r|x|y)?-\d+\b/,           // Margin & Padding
            /\b(rounded|shadow)(-\w+)?$/,             // Rounded & Shadow
            /\bbg-([\w-]+)-\d{2,3}$/,                 // Background colors
            /\btext-([\w-]+)-\d{2,3}$/,               // Text colors
            /\bborder-([\w-]+)-\d{2,3}$/,             // Border colors
            /\btext-(xs|sm|base|lg|xl|\dxl)$/,        // Text sizes
            /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
            /\b(w|h)-\d+$/,                           // Fixed width/height
            /\bgap-\d+$/,                             // Gap values
            /\bspace-(x|y)-\d+$/                      // Space values
        ];

        // Structural classes (KEEP these - they define layout)
        const structuralPattern = /^(flex|grid|container|relative|absolute|fixed|sticky|static|hidden|block|inline|inline-block|inline-flex|inline-grid|table|flow-root|contents|overflow|z-|order-|col-|row-|items-|justify-|self-|place-|basis-|grow|shrink)/;

        const elementsWithClasses = node.querySelectorAll('[class]');

        elementsWithClasses.forEach(el => {
            const originalClasses = el.getAttribute('class');
            if (!originalClasses) return;

            const classes = originalClasses.split(/\s+/);

            const kept = classes.filter(cls => {
                // Always keep structural classes
                if (structuralPattern.test(cls)) return true;

                // Check if it's a responsive/state variant (e.g., md:flex, hover:bg-blue)
                if (cls.includes(':')) {
                    const parts = cls.split(':');
                    const baseClass = parts[parts.length - 1];

                    // Keep if the base class is structural
                    if (structuralPattern.test(baseClass)) return true;

                    // Remove if it's visual styling
                    for (const pattern of visualPatterns) {
                        if (pattern.test(baseClass)) return false;
                    }

                    return true; // Keep custom variants
                }

                // Remove if matches any visual pattern
                for (const pattern of visualPatterns) {
                    if (pattern.test(cls)) return false;
                }

                // Keep custom classes (not Tailwind)
                return true;
            });

            if (kept.length > 0) {
                el.setAttribute('class', kept.join(' ') + ' [...]');
            } else {
                el.setAttribute('class', '[tailwind-classes]');
            }
        });
    }

    removeComments(node) {
        const iterator = document.createNodeIterator(
            node,
            NodeFilter.SHOW_COMMENT,
            null
        );

        const comments = [];
        let comment;
        while (comment = iterator.nextNode()) {
            comments.push(comment);
        }

        comments.forEach(c => c.remove());
    }

    formatForGemini(html) {
        let formatted = html;

        formatted = formatted.replace(/\s+/g, ' ');
        formatted = formatted.replace(/>\s+</g, '>\n<');

        const lines = formatted.split('\n');
        let indentLevel = 0;
        const indented = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';

            if (trimmed.startsWith('</')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            const indentedLine = '  '.repeat(indentLevel) + trimmed;

            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
                indentLevel++;
            }

            return indentedLine;
        });

        return indented.join('\n');
    }

    cleanAndCopyDOM(sendResponse) {
        const html = this.extractCleanHTML(document.body);
        sendResponse({ success: true, cleanedHTML: html });
    }

    extractAPIState(sendResponse) {
        const apiState = {
            localStorage: { ...localStorage },
            sessionStorage: { ...sessionStorage },
            cookies: document.cookie,
            windowVariables: {}
        };

        for (const key in window) {
            if (window.hasOwnProperty(key) && typeof window[key] !== 'function') {
                try {
                    const value = window[key];
                    if (typeof value === 'object' && value !== null) {
                        apiState.windowVariables[key] = JSON.stringify(value, null, 2);
                    } else if (typeof value !== 'object') {
                        apiState.windowVariables[key] = String(value);
                    }
                } catch (e) {
                    // Skip properties that can't be accessed
                }
            }
        }

        let formatted = '# API State Snapshot\n\n';
        formatted += '## LocalStorage\n```json\n' + JSON.stringify(apiState.localStorage, null, 2) + '\n```\n\n';
        formatted += '## SessionStorage\n```json\n' + JSON.stringify(apiState.sessionStorage, null, 2) + '\n```\n\n';
        formatted += '## Cookies\n```\n' + apiState.cookies + '\n```\n\n';
        formatted += '## Window Variables\n```json\n' + JSON.stringify(apiState.windowVariables, null, 2) + '\n```\n';

        sendResponse({ success: true, apiState: formatted });
    }

    showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${isError ? '#ef4444' : '#10b981'};
      color: white;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 9999999;
      animation: slideIn 0.3s ease;
    `;

        const style = document.createElement('style');
        style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }
}

new DevContextPro();
