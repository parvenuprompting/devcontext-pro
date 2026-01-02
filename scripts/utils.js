/**
 * DevContext Pro - Utility Functions
 * Shared utilities for content script and popup
 */

/**
 * Generate a unique CSS selector for an element
 * @param {Element} element - The DOM element
 * @returns {string} - Unique CSS selector
 */
function generateUniqueSelector(element) {
    if (element.id) {
        return `#${CSS.escape(element.id)}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
            selector = `#${CSS.escape(current.id)}`;
            path.unshift(selector);
            break;
        }

        // Try unique class combination
        if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('hover:') && !c.includes(':'));
            if (classes.length > 0) {
                const classSelector = classes.slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');
                const matches = current.parentElement?.querySelectorAll(`${selector}${classSelector}`);
                if (matches && matches.length === 1) {
                    selector += classSelector;
                    path.unshift(selector);
                    current = current.parentElement;
                    continue;
                }
            }
        }

        // Use nth-child if needed
        if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children).filter(
                el => el.tagName === current.tagName
            );
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

/**
 * Generate XPath for an element
 * @param {Element} element - The DOM element
 * @returns {string} - XPath expression
 */
function generateXPath(element) {
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

        const tagName = current.tagName.toLowerCase();
        parts.unshift(`${tagName}[${index}]`);
        current = current.parentElement;
    }

    return '/' + parts.join('/');
}

/**
 * Generate TypeScript interface from HTML structure
 * @param {Element} element - The DOM element
 * @returns {string} - TypeScript interface definition
 */
function generateTypeScriptInterface(element) {
    const interfaceName = inferInterfaceName(element);
    const properties = extractProperties(element);

    let output = `interface ${interfaceName} {\n`;

    for (const [key, type] of Object.entries(properties)) {
        output += `  ${key}: ${type};\n`;
    }

    output += '}\n';

    // Add child interfaces if needed
    const childInterfaces = extractChildInterfaces(element, interfaceName);
    if (childInterfaces) {
        output += '\n' + childInterfaces;
    }

    return output;
}

/**
 * Infer interface name from element
 */
function inferInterfaceName(element) {
    // Try data attributes first
    const dataComponent = element.dataset?.component || element.dataset?.testid;
    if (dataComponent) {
        return toPascalCase(dataComponent) + 'Props';
    }

    // Try class names
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(/\s+/);
        const meaningful = classes.find(c =>
            !c.includes(':') &&
            !c.match(/^(m|p|w|h|flex|grid|bg|text|border)-/) &&
            c.length > 2
        );
        if (meaningful) {
            return toPascalCase(meaningful) + 'Props';
        }
    }

    // Fallback to tag name
    return toPascalCase(element.tagName.toLowerCase()) + 'ComponentProps';
}

/**
 * Extract properties from element attributes and content
 */
function extractProperties(element) {
    const props = {};

    // Common attributes that become props
    if (element.hasAttribute('href')) props['href'] = 'string';
    if (element.hasAttribute('src')) props['src'] = 'string';
    if (element.hasAttribute('alt')) props['alt'] = 'string';
    if (element.hasAttribute('title')) props['title'] = 'string';
    if (element.hasAttribute('disabled')) props['disabled'] = 'boolean';
    if (element.hasAttribute('checked')) props['checked'] = 'boolean';
    if (element.hasAttribute('value')) props['value'] = 'string';
    if (element.hasAttribute('placeholder')) props['placeholder'] = 'string';
    if (element.hasAttribute('name')) props['name'] = 'string';
    if (element.hasAttribute('type')) props['type'] = 'string';

    // Data attributes
    for (const attr of element.attributes) {
        if (attr.name.startsWith('data-') && !attr.name.includes('v-') && !attr.name.includes('react')) {
            const propName = attr.name.replace('data-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            props[propName] = inferTypeFromValue(attr.value);
        }
    }

    // Aria attributes that suggest functionality
    if (element.hasAttribute('aria-label')) props['ariaLabel'] = 'string';
    if (element.hasAttribute('aria-expanded')) props['isExpanded'] = 'boolean';
    if (element.hasAttribute('aria-selected')) props['isSelected'] = 'boolean';
    if (element.hasAttribute('aria-disabled')) props['isDisabled'] = 'boolean';

    // Text content suggests children prop
    if (element.childNodes.length > 0) {
        const hasTextContent = Array.from(element.childNodes).some(
            n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
        );
        if (hasTextContent) {
            props['children'] = 'React.ReactNode';
        }
    }

    // Event handlers based on element type
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        props['onClick'] = '() => void';
    }
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        props['onChange'] = '(value: string) => void';
    }

    return props;
}

/**
 * Extract child component interfaces
 */
function extractChildInterfaces(element, parentName) {
    const interfaces = [];
    const children = element.querySelectorAll('[data-component], [data-testid]');

    children.forEach(child => {
        if (child !== element) {
            const childInterface = generateTypeScriptInterface(child);
            interfaces.push(childInterface);
        }
    });

    return interfaces.join('\n');
}

/**
 * Infer TypeScript type from string value
 */
function inferTypeFromValue(value) {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value)) && value !== '') return 'number';
    if (value.startsWith('[') || value.startsWith('{')) return 'object';
    return 'string';
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
    return str
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (_, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Compute DOM diff between two states
 * @param {Element} before - DOM state before action
 * @param {Element} after - DOM state after action
 * @returns {object} - Diff result
 */
function computeDOMDiff(before, after) {
    const changes = {
        added: [],
        removed: [],
        modified: [],
        classChanges: [],
        attributeChanges: []
    };

    // Compare children count
    const beforeChildren = before.querySelectorAll('*');
    const afterChildren = after.querySelectorAll('*');

    // Build maps by unique identifier
    const beforeMap = new Map();
    const afterMap = new Map();

    beforeChildren.forEach((el, i) => {
        const key = el.id || `${el.tagName}-${i}`;
        beforeMap.set(key, {
            tagName: el.tagName,
            className: el.className,
            attributes: getAttributeMap(el),
            textContent: el.textContent?.slice(0, 100)
        });
    });

    afterChildren.forEach((el, i) => {
        const key = el.id || `${el.tagName}-${i}`;
        afterMap.set(key, {
            tagName: el.tagName,
            className: el.className,
            attributes: getAttributeMap(el),
            textContent: el.textContent?.slice(0, 100),
            element: el
        });
    });

    // Find additions
    for (const [key, value] of afterMap) {
        if (!beforeMap.has(key)) {
            changes.added.push({
                key,
                tagName: value.tagName,
                className: value.className
            });
        } else {
            const beforeVal = beforeMap.get(key);
            // Check for class changes
            if (beforeVal.className !== value.className) {
                changes.classChanges.push({
                    key,
                    before: beforeVal.className,
                    after: value.className
                });
            }
            // Check for attribute changes
            const attrDiff = compareAttributes(beforeVal.attributes, value.attributes);
            if (attrDiff.length > 0) {
                changes.attributeChanges.push({
                    key,
                    changes: attrDiff
                });
            }
        }
    }

    // Find removals
    for (const [key, value] of beforeMap) {
        if (!afterMap.has(key)) {
            changes.removed.push({
                key,
                tagName: value.tagName,
                className: value.className
            });
        }
    }

    return changes;
}

/**
 * Get attribute map for element
 */
function getAttributeMap(element) {
    const map = {};
    for (const attr of element.attributes) {
        if (!attr.name.startsWith('data-v-') && attr.name !== 'class') {
            map[attr.name] = attr.value;
        }
    }
    return map;
}

/**
 * Compare two attribute maps
 */
function compareAttributes(before, after) {
    const changes = [];

    for (const [key, value] of Object.entries(after)) {
        if (before[key] !== value) {
            changes.push({
                attr: key,
                before: before[key] || null,
                after: value
            });
        }
    }

    for (const key of Object.keys(before)) {
        if (!(key in after)) {
            changes.push({
                attr: key,
                before: before[key],
                after: null
            });
        }
    }

    return changes;
}

/**
 * Format context as Markdown documentation
 * @param {object} context - Extracted context object
 * @returns {string} - Markdown formatted documentation
 */
function formatAsMarkdownDoc(context) {
    let md = '# Component Documentation\n\n';

    if (context.componentInfo) {
        md += '## Component Info\n';
        md += `- **Framework**: ${context.componentInfo.framework || 'Unknown'}\n`;
        if (context.componentInfo.name) {
            md += `- **Name**: ${context.componentInfo.name}\n`;
        }
        md += '\n';
    }

    if (context.selector) {
        md += '## Selectors\n';
        md += `- **CSS**: \`${context.selector.css}\`\n`;
        md += `- **XPath**: \`${context.selector.xpath}\`\n\n`;
    }

    md += '## Structure\n\n```html\n' + context.html + '\n```\n\n';

    if (context.styles) {
        md += '## Computed Styles\n\n```json\n' + JSON.stringify(context.styles, null, 2) + '\n```\n\n';
    }

    if (context.networkActivity && context.networkActivity.length > 0) {
        md += '## Network Activity\n\n';
        md += '| URL | Duration | Size |\n';
        md += '|-----|----------|------|\n';
        context.networkActivity.forEach(req => {
            md += `| ${req.url} | ${req.duration}ms | ${req.size}b |\n`;
        });
        md += '\n';
    }

    if (context.typeScriptInterface) {
        md += '## TypeScript Interface\n\n```typescript\n' + context.typeScriptInterface + '\n```\n';
    }

    return md;
}

/**
 * Extract Tailwind config from computed styles
 * @returns {object} - Inferred Tailwind configuration
 */
function extractTailwindConfig() {
    const root = document.documentElement;
    const computedStyles = getComputedStyle(root);

    const config = {
        colors: {},
        spacing: {},
        fontFamily: {},
        fontSize: {}
    };

    // Extract CSS custom properties (Tailwind often uses these)
    for (let i = 0; i < computedStyles.length; i++) {
        const prop = computedStyles[i];
        if (prop.startsWith('--')) {
            const value = computedStyles.getPropertyValue(prop).trim();

            // Categorize by property name patterns
            if (prop.includes('color') || prop.includes('bg') || value.startsWith('#') || value.startsWith('rgb')) {
                config.colors[prop] = value;
            } else if (prop.includes('spacing') || prop.includes('margin') || prop.includes('padding')) {
                config.spacing[prop] = value;
            } else if (prop.includes('font-family')) {
                config.fontFamily[prop] = value;
            } else if (prop.includes('font-size') || prop.includes('text')) {
                config.fontSize[prop] = value;
            }
        }
    }

    // Extract common element styles to infer tokens
    const testElements = ['h1', 'h2', 'p', 'button', 'a'];
    testElements.forEach(tag => {
        const el = document.querySelector(tag);
        if (el) {
            const styles = getComputedStyle(el);
            config.fontFamily[tag] = styles.fontFamily;
            config.fontSize[tag] = styles.fontSize;
        }
    });

    return config;
}

// Export for use in content script
if (typeof window !== 'undefined') {
    window.DevContextUtils = {
        generateUniqueSelector,
        generateXPath,
        generateTypeScriptInterface,
        computeDOMDiff,
        formatAsMarkdownDoc,
        extractTailwindConfig
    };
}
