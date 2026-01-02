/**
 * DevContext Pro v1.3 - Content Script
 * Premium developer tool for extracting clean DOM context
 */

class DevContextPro {
    constructor() {
        this.selectedElement = null;
        this.overlay = null;
        this.isSelecting = false;
        this.preferences = {};

        // v1.3 Multi-select mode
        this.multiSelectMode = false;
        this.contextBucket = [];
        this.bucketIndicator = null;

        // v1.3 Diff mode
        this.diffSnapshot = null;
        this.isDiffMode = false;

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

            case 'startMultiSelectMode':
                this.startMultiSelectMode();
                sendResponse({ success: true });
                break;

            case 'stopMultiSelectMode':
                this.stopMultiSelectMode();
                sendResponse({ success: true, bucket: this.contextBucket });
                break;

            case 'copyContextBucket':
                this.copyContextBucket(sendResponse);
                break;

            case 'clearContextBucket':
                this.contextBucket = [];
                this.updateBucketIndicator();
                sendResponse({ success: true });
                break;

            case 'startDiffMode':
                this.startDiffMode(sendResponse);
                break;

            case 'captureDiff':
                this.captureDiff(sendResponse);
                break;

            case 'cleanDOM':
                this.cleanAndCopyDOM(sendResponse);
                break;

            case 'extractAPIState':
                this.extractAPIState(sendResponse);
                break;

            case 'getNetworkActivity':
                this.getNetworkActivity(sendResponse);
                break;

            case 'generateCSSSelector':
                this.generateCSSSelector(sendResponse);
                break;

            case 'generateTypeScriptInterface':
                this.generateTSInterface(sendResponse);
                break;

            case 'exportMarkdownDoc':
                this.exportMarkdownDoc(sendResponse);
                break;

            case 'showNotification':
                this.showNotification(request.message, request.isError || false);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    // ============================================
    // ELEMENT SELECTION (Single Mode)
    // ============================================

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

        // Ignore our own UI elements
        if (e.target.id === 'devcontext-overlay' ||
            e.target.id === 'devcontext-bucket-indicator' ||
            e.target.closest('#devcontext-bucket-indicator')) {
            return;
        }

        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();

        this.overlay.style.left = rect.left + window.scrollX + 'px';
        this.overlay.style.top = rect.top + window.scrollY + 'px';
        this.overlay.style.width = rect.width + 'px';
        this.overlay.style.height = rect.height + 'px';
    }

    handleClick = async (e) => {
        if (!this.isSelecting) return;

        // Ignore clicks on our own UI elements
        if (e.target.id === 'devcontext-overlay' ||
            e.target.id === 'devcontext-bucket-indicator' ||
            e.target.closest('#devcontext-bucket-indicator')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.selectedElement = e.target;

        if (this.multiSelectMode) {
            // Multi-select: add to bucket
            this.addToBucket(e.target);
        } else {
            // Single mode: copy immediately
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
    }

    handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            this.stopElementSelection();
            if (this.multiSelectMode) {
                this.stopMultiSelectMode();
            }
            this.showNotification('Selection cancelled');
        }
    }

    // ============================================
    // MULTI-SELECT MODE (v1.3)
    // ============================================

    startMultiSelectMode() {
        this.multiSelectMode = true;
        this.contextBucket = [];
        this.createBucketIndicator();
        this.startElementSelection();
        this.showNotification('Multi-select mode: Click elements to add to bucket');
    }

    stopMultiSelectMode() {
        this.multiSelectMode = false;
        this.stopElementSelection();
        this.removeBucketIndicator();
    }

    createBucketIndicator() {
        this.bucketIndicator = document.createElement('div');
        this.bucketIndicator.id = 'devcontext-bucket-indicator';
        this.bucketIndicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: white;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
            z-index: 9999999;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        `;
        this.bucketIndicator.innerHTML = `
            <span id="bucket-count">0</span> items in bucket
            <button id="bucket-copy" style="
                background: white;
                color: #4f46e5;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                margin-left: 8px;
            ">Copy All</button>
            <button id="bucket-clear" style="
                background: rgba(255,255,255,0.2);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
            ">Clear</button>
        `;
        document.body.appendChild(this.bucketIndicator);

        // Event listeners
        document.getElementById('bucket-copy').addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyContextBucket();
        });
        document.getElementById('bucket-clear').addEventListener('click', (e) => {
            e.stopPropagation();
            this.contextBucket = [];
            this.updateBucketIndicator();
            this.stopMultiSelectMode();
        });
    }

    removeBucketIndicator() {
        if (this.bucketIndicator) {
            this.bucketIndicator.remove();
            this.bucketIndicator = null;
        }
    }

    updateBucketIndicator() {
        const countEl = document.getElementById('bucket-count');
        if (countEl) {
            countEl.textContent = this.contextBucket.length;
        }
    }

    addToBucket(element) {
        const selector = this.generateUniqueSelector(element);
        const html = this.extractCleanHTML(element);
        const componentInfo = this.inferComponentName(element);

        this.contextBucket.push({
            index: this.contextBucket.length + 1,
            selector: selector,
            html: html,
            tagName: element.tagName,
            componentInfo: componentInfo
        });

        this.updateBucketIndicator();
        this.showNotification(`Added to bucket (${this.contextBucket.length} items)`);
    }

    async copyContextBucket(sendResponse) {
        if (this.contextBucket.length === 0) {
            this.showNotification('Bucket is empty', true);
            if (sendResponse) sendResponse({ success: false, error: 'Bucket is empty' });
            return;
        }

        let output = '# Context Bucket Export\n\n';

        this.contextBucket.forEach((item, index) => {
            output += `## Element ${index + 1}: ${item.tagName}`;
            if (item.componentInfo) {
                output += ` (${item.componentInfo.framework})`;
            }
            output += `\n\n`;
            output += `**Selector:** \`${item.selector}\`\n\n`;
            output += '```html\n' + item.html + '\n```\n\n';
            output += '---\n\n';
        });

        try {
            await navigator.clipboard.writeText(output);
            this.showNotification(`✓ Copied ${this.contextBucket.length} items to clipboard`);

            // Auto-disable multi-select mode after copying
            this.stopMultiSelectMode();

            if (sendResponse) sendResponse({ success: true });
        } catch (error) {
            this.showNotification('✗ Failed to copy', true);
            if (sendResponse) sendResponse({ success: false, error: error.message });
        }
    }

    // ============================================
    // DIFF MODE (v1.3)
    // ============================================

    startDiffMode(sendResponse) {
        this.diffSnapshot = document.body.cloneNode(true);
        this.isDiffMode = true;
        this.showNotification('📸 Snapshot captured. Perform your action, then click "Copy Diff"');
        sendResponse({ success: true });
    }

    captureDiff(sendResponse) {
        if (!this.diffSnapshot) {
            sendResponse({ success: false, error: 'No snapshot captured. Start diff mode first.' });
            return;
        }

        const afterDOM = document.body.cloneNode(true);
        const diff = window.DevContextUtils ?
            window.DevContextUtils.computeDOMDiff(this.diffSnapshot, afterDOM) :
            this.computeSimpleDiff(this.diffSnapshot, afterDOM);

        let output = '# DOM Diff Report\n\n';

        if (diff.added.length > 0) {
            output += '## Added Elements\n\n';
            diff.added.forEach(el => {
                output += `- \`${el.tagName}\` ${el.className ? `(.${el.className.split(' ')[0]})` : ''}\n`;
            });
            output += '\n';
        }

        if (diff.removed.length > 0) {
            output += '## Removed Elements\n\n';
            diff.removed.forEach(el => {
                output += `- \`${el.tagName}\` ${el.className ? `(.${el.className.split(' ')[0]})` : ''}\n`;
            });
            output += '\n';
        }

        if (diff.classChanges.length > 0) {
            output += '## Class Changes\n\n';
            diff.classChanges.forEach(change => {
                output += `### ${change.key}\n`;
                output += `- Before: \`${change.before}\`\n`;
                output += `- After: \`${change.after}\`\n\n`;
            });
        }

        if (diff.attributeChanges.length > 0) {
            output += '## Attribute Changes\n\n';
            diff.attributeChanges.forEach(item => {
                output += `### ${item.key}\n`;
                item.changes.forEach(change => {
                    output += `- \`${change.attr}\`: ${change.before || '(none)'} → ${change.after || '(removed)'}\n`;
                });
                output += '\n';
            });
        }

        navigator.clipboard.writeText(output).then(() => {
            this.showNotification('✓ Diff copied to clipboard');
            sendResponse({ success: true, diff: output });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });

        this.diffSnapshot = null;
        this.isDiffMode = false;
    }

    computeSimpleDiff(before, after) {
        // Fallback simple diff if utils not loaded
        return {
            added: [],
            removed: [],
            classChanges: [],
            attributeChanges: []
        };
    }

    // ============================================
    // HTML EXTRACTION & CLEANING
    // ============================================

    extractCleanHTML(element) {
        const clone = element.cloneNode(true);

        // v1.3: Asset placeholders
        if (this.preferences.assetPlaceholders) {
            this.replaceAssetsWithPlaceholders(clone);
        }

        if (this.preferences.removeScripts) {
            clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());

            // Remove complex SVG paths (unless converted to placeholders)
            if (!this.preferences.assetPlaceholders) {
                try {
                    clone.querySelectorAll('svg path').forEach(path => {
                        const d = path.getAttribute('d');
                        if (d && d.length > 100) {
                            path.remove();
                        }
                    });
                } catch (e) {
                    console.log('SVG path processing skipped:', e.message);
                }
            }
        }

        if (this.preferences.excludeComments) {
            this.removeComments(clone);
        }

        // v1.3: Preserve aria/data attributes
        if (this.preferences.preserveAriaData) {
            this.preserveSemanticAttributes(clone);
        }

        if (this.preferences.smartTrimTailwind) {
            this.trimTailwindClasses(clone);
        }

        // v1.3: Component name inference
        let componentHeader = '';
        if (this.preferences.inferComponentNames) {
            const info = this.inferComponentName(element);
            if (info) {
                componentHeader = `<!-- Framework: ${info.framework}${info.name ? `, Component: ${info.name}` : ''} -->\n`;
            }
        }

        // v1.3: Tailwind config
        let tailwindConfig = '';
        if (this.preferences.includeTailwindConfig) {
            const config = this.extractTailwindConfig();
            if (Object.keys(config.colors).length > 0 || Object.keys(config.spacing).length > 0) {
                tailwindConfig = '\n<!-- Tailwind Config Tokens:\n' + JSON.stringify(config, null, 2) + '\n-->\n';
            }
        }

        let html = clone.outerHTML;

        if (this.preferences.autoFormat) {
            html = this.formatForGemini(html);
        }

        return componentHeader + html + tailwindConfig;
    }

    // v1.3: Replace images and complex SVGs with placeholders
    replaceAssetsWithPlaceholders(clone) {
        // Images
        clone.querySelectorAll('img').forEach(img => {
            const alt = img.alt || img.src?.split('/').pop()?.split('?')[0] || 'unnamed';
            const placeholder = document.createTextNode(`[Image: ${alt}]`);
            img.replaceWith(placeholder);
        });

        // Video
        clone.querySelectorAll('video').forEach(video => {
            const placeholder = document.createTextNode(`[Video: ${video.poster || 'video content'}]`);
            video.replaceWith(placeholder);
        });

        // Complex SVGs (more than 500 chars)
        clone.querySelectorAll('svg').forEach(svg => {
            if (svg.innerHTML.length > 500) {
                const label = svg.getAttribute('aria-label') ||
                    svg.querySelector('title')?.textContent ||
                    svg.className?.baseVal ||
                    'icon';
                const placeholder = document.createTextNode(`[SVG Icon: ${label}]`);
                svg.replaceWith(placeholder);
            }
        });

        // Iframes
        clone.querySelectorAll('iframe').forEach(iframe => {
            const src = iframe.src ? new URL(iframe.src).hostname : 'embedded content';
            const placeholder = document.createTextNode(`[Iframe: ${src}]`);
            iframe.replaceWith(placeholder);
        });
    }

    // v1.3: Preserve semantic attributes even when stripping others
    preserveSemanticAttributes(clone) {
        // This is called to ensure aria-* and data-* survive cleanup
        // The trimTailwindClasses function already preserves the element,
        // this ensures we don't accidentally remove these valuable attributes
        clone.querySelectorAll('*').forEach(el => {
            // Mark important attributes so they survive
            const preservedAttrs = [];
            for (const attr of el.attributes) {
                if (attr.name.startsWith('aria-') ||
                    attr.name.startsWith('data-') ||
                    attr.name === 'role' ||
                    attr.name === 'tabindex') {
                    preservedAttrs.push({ name: attr.name, value: attr.value });
                }
            }
            // Re-apply after any potential stripping
            el._preservedAttrs = preservedAttrs;
        });
    }

    // v1.3: Infer framework component name
    inferComponentName(element) {
        // React detection
        const reactFiber = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
        const reactProps = Object.keys(element).find(key => key.startsWith('__reactProps$'));
        if (reactFiber || reactProps || element._reactRootContainer) {
            return {
                framework: 'React',
                name: this.extractReactComponentName(element)
            };
        }

        // Vue detection
        const vueAttr = Array.from(element.attributes).find(a => a.name.startsWith('data-v-'));
        if (vueAttr || element.__vue__ || element.__vueParentComponent) {
            return {
                framework: 'Vue',
                componentId: vueAttr?.name
            };
        }

        // Angular detection
        const ngAttr = Array.from(element.attributes).find(a =>
            a.name.startsWith('_nghost-') || a.name.startsWith('_ngcontent-')
        );
        if (ngAttr || element.__ngContext__) {
            return {
                framework: 'Angular',
                hostId: ngAttr?.name
            };
        }

        // Svelte detection
        const svelteAttr = Array.from(element.attributes).find(a => a.name.startsWith('svelte-'));
        if (svelteAttr) {
            return {
                framework: 'Svelte'
            };
        }

        return null;
    }

    extractReactComponentName(element) {
        try {
            const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
            if (fiberKey) {
                let fiber = element[fiberKey];
                while (fiber) {
                    if (fiber.type && typeof fiber.type === 'function') {
                        return fiber.type.displayName || fiber.type.name || null;
                    }
                    fiber = fiber.return;
                }
            }
        } catch (e) {
            // Silently fail
        }
        return null;
    }

    // v1.3: Extract Tailwind CSS configuration from root
    extractTailwindConfig() {
        const root = document.documentElement;
        const computedStyles = getComputedStyle(root);

        const config = {
            colors: {},
            spacing: {},
            fontFamily: {}
        };

        for (let i = 0; i < computedStyles.length; i++) {
            const prop = computedStyles[i];
            if (prop.startsWith('--')) {
                const value = computedStyles.getPropertyValue(prop).trim();

                if (prop.includes('color') || value.startsWith('#') || value.startsWith('rgb')) {
                    config.colors[prop] = value;
                } else if (prop.includes('spacing')) {
                    config.spacing[prop] = value;
                } else if (prop.includes('font')) {
                    config.fontFamily[prop] = value;
                }
            }
        }

        return config;
    }

    trimTailwindClasses(node) {
        const visualPatterns = [
            /\b(m|p)(t|b|l|r|x|y)?-\d+\b/,
            /\b(rounded|shadow)(-\w+)?$/,
            /\bbg-([\w-]+)-\d{2,3}$/,
            /\btext-([\w-]+)-\d{2,3}$/,
            /\bborder-([\w-]+)-\d{2,3}$/,
            /\btext-(xs|sm|base|lg|xl|\dxl)$/,
            /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
            /\b(w|h)-\d+$/,
            /\bgap-\d+$/,
            /\bspace-(x|y)-\d+$/
        ];

        const structuralPattern = /^(flex|grid|container|relative|absolute|fixed|sticky|static|hidden|block|inline|inline-block|inline-flex|inline-grid|table|flow-root|contents|overflow|z-|order-|col-|row-|items-|justify-|self-|place-|basis-|grow|shrink)/;

        const elementsWithClasses = node.querySelectorAll('[class]');

        elementsWithClasses.forEach(el => {
            const originalClasses = el.getAttribute('class');
            if (!originalClasses) return;

            const classes = originalClasses.split(/\s+/);

            const kept = classes.filter(cls => {
                if (structuralPattern.test(cls)) return true;

                if (cls.includes(':')) {
                    const parts = cls.split(':');
                    const baseClass = parts[parts.length - 1];
                    if (structuralPattern.test(baseClass)) return true;
                    for (const pattern of visualPatterns) {
                        if (pattern.test(baseClass)) return false;
                    }
                    return true;
                }

                for (const pattern of visualPatterns) {
                    if (pattern.test(cls)) return false;
                }

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

    // ============================================
    // SELECTOR & INTERFACE GENERATION (v1.3)
    // ============================================

    generateUniqueSelector(element) {
        if (window.DevContextUtils) {
            return window.DevContextUtils.generateUniqueSelector(element);
        }

        // Fallback implementation
        if (element.id) {
            return `#${element.id}`;
        }

        const path = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
                path.unshift(`#${current.id}`);
                break;
            }

            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children)
                    .filter(el => el.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            path.unshift(selector);
            current = current.parentElement;
        }

        return path.join(' > ');
    }

    generateCSSSelector(sendResponse) {
        if (!this.selectedElement) {
            sendResponse({ success: false, error: 'No element selected' });
            return;
        }

        const cssSelector = this.generateUniqueSelector(this.selectedElement);
        const xpath = this.generateXPath(this.selectedElement);

        const output = `CSS Selector: ${cssSelector}\nXPath: ${xpath}`;

        navigator.clipboard.writeText(output).then(() => {
            this.showNotification('✓ Selectors copied to clipboard');
            sendResponse({ success: true, css: cssSelector, xpath: xpath });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    }

    generateXPath(element) {
        if (window.DevContextUtils) {
            return window.DevContextUtils.generateXPath(element);
        }

        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }

        const parts = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousElementSibling;

            while (sibling) {
                if (sibling.tagName === current.tagName) index++;
                sibling = sibling.previousElementSibling;
            }

            parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
            current = current.parentElement;
        }

        return '/' + parts.join('/');
    }

    generateTSInterface(sendResponse) {
        if (!this.selectedElement) {
            sendResponse({ success: false, error: 'No element selected' });
            return;
        }

        let tsInterface;
        if (window.DevContextUtils) {
            tsInterface = window.DevContextUtils.generateTypeScriptInterface(this.selectedElement);
        } else {
            tsInterface = this.generateBasicTSInterface(this.selectedElement);
        }

        navigator.clipboard.writeText(tsInterface).then(() => {
            this.showNotification('✓ TypeScript interface copied');
            sendResponse({ success: true, interface: tsInterface });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    }

    generateBasicTSInterface(element) {
        const name = element.className?.split(' ')[0] || element.tagName.toLowerCase();
        const pascalName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());

        let output = `interface ${pascalName}Props {\n`;

        if (element.hasAttribute('href')) output += '  href: string;\n';
        if (element.hasAttribute('src')) output += '  src: string;\n';
        if (element.hasAttribute('alt')) output += '  alt?: string;\n';
        if (element.hasAttribute('disabled')) output += '  disabled?: boolean;\n';
        if (element.textContent?.trim()) output += '  children?: React.ReactNode;\n';
        if (element.tagName === 'BUTTON' || element.tagName === 'A') output += '  onClick?: () => void;\n';

        output += '}\n';
        return output;
    }

    // ============================================
    // NETWORK ACTIVITY (v1.3)
    // ============================================

    getNetworkActivity(sendResponse) {
        const entries = performance.getEntriesByType('resource')
            .filter(e => e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest')
            .slice(-10)
            .map(e => ({
                url: new URL(e.name).pathname,
                duration: Math.round(e.duration),
                size: e.transferSize || 0,
                type: e.initiatorType
            }));

        let output = '# Network Activity Snapshot\n\n';
        output += '| URL | Type | Duration | Size |\n';
        output += '|-----|------|----------|------|\n';

        entries.forEach(entry => {
            output += `| ${entry.url} | ${entry.type} | ${entry.duration}ms | ${entry.size}b |\n`;
        });

        navigator.clipboard.writeText(output).then(() => {
            this.showNotification(`✓ ${entries.length} network requests copied`);
            sendResponse({ success: true, entries: entries });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    }

    // ============================================
    // MARKDOWN EXPORT (v1.3)
    // ============================================

    exportMarkdownDoc(sendResponse) {
        if (!this.selectedElement) {
            sendResponse({ success: false, error: 'No element selected' });
            return;
        }

        const context = {
            html: this.extractCleanHTML(this.selectedElement),
            selector: {
                css: this.generateUniqueSelector(this.selectedElement),
                xpath: this.generateXPath(this.selectedElement)
            },
            componentInfo: this.inferComponentName(this.selectedElement)
        };

        let markdown;
        if (window.DevContextUtils) {
            markdown = window.DevContextUtils.formatAsMarkdownDoc(context);
        } else {
            markdown = this.formatBasicMarkdown(context);
        }

        navigator.clipboard.writeText(markdown).then(() => {
            this.showNotification('✓ Markdown documentation copied');
            sendResponse({ success: true, markdown: markdown });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    }

    formatBasicMarkdown(context) {
        let md = '# Component Documentation\n\n';

        if (context.componentInfo) {
            md += `**Framework:** ${context.componentInfo.framework}\n\n`;
        }

        md += '## Selectors\n\n';
        md += `- CSS: \`${context.selector.css}\`\n`;
        md += `- XPath: \`${context.selector.xpath}\`\n\n`;

        md += '## Structure\n\n```html\n' + context.html + '\n```\n';

        return md;
    }

    // ============================================
    // EXISTING FUNCTIONALITY
    // ============================================

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
            animation: devcontext-slideIn 0.3s ease;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes devcontext-slideIn {
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
            notification.style.animation = 'devcontext-slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }
}

new DevContextPro();
