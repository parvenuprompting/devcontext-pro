# DevContext Pro - Installation Guide

## Quick Start

### Step 1: Prepare the Extension
Ensure all files are in the `devcontext-pro` directory with the following structure:
```
devcontext-pro/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── scripts/
    ├── content.js
    ├── content.css
    └── background.js
```

### Step 2: Load in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle **Developer mode** (top right corner)
4. Click **Load unpacked**
5. Select the `devcontext-pro` folder
6. The extension icon will appear in your toolbar

### Step 3: Pin the Extension (Optional)

1. Click the puzzle piece icon in your Chrome toolbar
2. Find "DevContext Pro"
3. Click the pin icon to keep it visible

## Using the Extension

### Scrape Component
1. Click the DevContext Pro icon
2. Click "Scrape Component"
3. Hover over elements on the page to highlight them
4. Click any element to copy its HTML
5. Press `ESC` to cancel selection

### Clean DOM
1. Click the DevContext Pro icon
2. Click "Clean DOM"
3. The entire page's cleaned HTML is copied to clipboard

### Copy API State
1. Click the DevContext Pro icon
2. Click "Copy API State"
3. A formatted markdown snapshot is copied to clipboard

## Troubleshooting

**Extension not loading?**
- Ensure all files are present in the directory
- Check the browser console for errors at `chrome://extensions/`

**Element selector not working?**
- Refresh the page and try again
- Some pages may block content scripts (e.g., chrome:// pages)

**Nothing copies to clipboard?**
- Grant clipboard permissions when prompted
- Check browser console for errors

## Updating

1. Make changes to your files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the DevContext Pro card
4. Changes will be applied immediately

---

Happy extracting! 🎯
