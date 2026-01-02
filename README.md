# DevContext Pro

> Premium Chrome Extension for extracting clean DOM context and component structures

## 🎯 Overview

DevContext Pro is a professional developer tool designed to streamline the process of extracting HTML components, cleaning DOM structures, and capturing API state from web pages. Built with Manifest V3, it provides a premium, glassmorphic interface with powerful extraction capabilities.

## ✨ Features

### 🔍 Scrape Component
- Interactive element selector with visual overlay
- Click any element to extract its HTML structure
- Smart formatting with proper indentation
- One-click copy to clipboard

### 🧹 Clean DOM
- Removes unnecessary scripts, styles, and SVG paths
- Strips HTML comments
- Optimizes for AI context (Gemini-ready)
- Configurable cleaning preferences

### 📊 Copy API State
- Extract localStorage and sessionStorage
- Capture cookies and window variables
- Formatted as markdown for easy sharing
- Perfect for debugging and documentation

## 🚀 Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `devcontext-pro` directory

## 💎 Usage

1. Click the DevContext Pro icon in your Chrome toolbar
2. Choose your desired action:
   - **Scrape Component**: Click to activate, then click any element on the page
   - **Clean DOM**: Instantly copy the entire cleaned page structure
   - **Copy API State**: Extract all API-related state information

### Preferences

Configure extraction behavior:
- **Exclude Comments**: Remove HTML comments from output
- **Auto-format for Gemini**: Format output optimally for AI consumption
- **Remove Scripts & Styles**: Strip `<script>`, `<style>`, and inline styles

## 🏗️ Architecture

```
devcontext-pro/
├── manifest.json          # Manifest V3 configuration
├── icons/                 # Extension icons (16, 32, 48, 128)
├── popup/                 # Extension popup UI
│   ├── popup.html         # Premium Material Design 3 interface
│   ├── popup.css          # Glassmorphism styling
│   └── popup.js           # UI controller and event handling
└── scripts/
    ├── content.js         # Element selection and DOM extraction
    ├── content.css        # Overlay and notification styles
    └── background.js      # Service worker for processing
```

## 🎨 Design Philosophy

DevContext Pro features a premium user experience with:
- **Dark Mode First**: Deep indigo (#1e1b4b) and slate grey (#0f172a) palette
- **Glassmorphism**: Frosted glass effects with subtle transparency
- **Smooth Animations**: Micro-interactions for enhanced UX
- **Material Design 3**: Modern, professional interface components

## 🔐 Permissions

- `activeTab`: Access the currently active tab for element selection
- `storage`: Save user preferences
- `scripting`: Inject content scripts for DOM manipulation

## 🛠️ Development

### Tech Stack
- Vanilla JavaScript (no external dependencies)
- Manifest V3 compliance
- Local-only scripts (no CDNs for security)

### Key Components

**PopupController** (`popup/popup.js`)
- Manages UI interactions
- Handles preference persistence
- Communicates with content scripts

**DevContextPro** (`scripts/content.js`)
- Element selection with visual overlay
- DOM cleaning and HTML extraction
- Copy-to-clipboard functionality

**BackgroundService** (`scripts/background.js`)
- HTML to Markdown conversion
- Temporary data storage
- Complex transformation handling

## 📋 Roadmap

- [ ] Export to multiple formats (Markdown, JSON, XML)
- [ ] Custom CSS selector builder
- [ ] History of extracted components
- [ ] Cloud sync for preferences
- [ ] Team collaboration features

## 📄 License

This project is provided as-is for development purposes.

## 🤝 Contributing

This is a project for personal and professional use. Feel free to fork and customize for your needs.

---

**Built with ❤️ for developers who value clean code and premium UX**
