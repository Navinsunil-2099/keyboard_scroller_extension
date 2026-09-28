# ScrollKey - 'U' & 'I' Keyboard Scroller & Tab Switcher

A high-performance cross-browser extension for **Chromium-based** (Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi) and **Firefox-based** (Mozilla Firefox, Firefox Developer Edition, LibreWolf) browsers.

---

## ⚡ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`U`** | **Scroll Down** | Smoothly scrolls down the current page or hovered panel. |
| **`I`** | **Scroll Up** | Smoothly scrolls up the current page or hovered panel. |
| **`Alt + U`** | **Tab Left** | Switches immediately to the previous tab on the left (cycles around). |
| **`Alt + I`** | **Tab Right** | Switches immediately to the next tab on the right (cycles around). |
| **`Shift + U`** | **Fast Scroll Down** | 2.5x turbo-boosted downward scroll. |
| **`Shift + I`** | **Fast Scroll Up** | 2.5x turbo-boosted upward scroll. |

---

## 🛡️ Typing Safety & Smart Features

- **Safe Typing Protection**: Intelligently detects `<input>`, `<textarea>`, `<select>`, `[contenteditable]`, code editors (Monaco, CodeMirror, ACE), rich-text editors (Notion, Google Docs, ProseMirror), and ARIA search/textboxes so you never accidentally scroll when typing words containing 'u' or 'i'.
- **System Shortcut Preservation**: Standard browser shortcuts like `Ctrl + U` (View Page Source) and `Ctrl + I` (Page Info / Italic) are never hijacked.
- **Global Tab Switching**: `Alt + U` and `Alt + I` switch tabs globally — even when your cursor is inside a text box or editor.
- **Hold-to-Scroll Optimization**: Holding down `U` or `I` scrolls continuously and halts instantly upon key release with zero animation backlog.
- **Smart Hover Targeting**: If your mouse cursor is hovering over a scrollable sidebar, modal, or comment list, the extension scrolls that specific panel instead of the whole page.
- **Per-Site Exclusion List**: Easily exclude specific websites with one click from the popup.
- **Live Interactive Test Pad**: Test your scrolling directly inside the extension popup settings window.

---

## 🚀 How to Install & Load the Extension

### For Chromium-Based Browsers (Chrome, Edge, Brave, Opera, Vivaldi)

1. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Brave**: `brave://extensions/`
   - **Edge**: `edge://extensions/`
2. Turn ON the **Developer mode** toggle in the top-right corner.
3. Click the **"Load unpacked"** button.
4. Select the extension directory:
   ```text
   /home/navin/keyboardScrollExtension
   ```
5. Pin the **ScrollKey** icon to your toolbar for quick access to settings and site exclusions!

---

### For Firefox-Based Browsers (Firefox, LibreWolf, Developer Edition)

1. Open Firefox and go to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Under the **Temporary Extensions** section, click **"Load Temporary Add-on..."**.
3. Select the `manifest.json` file inside:
   ```text
   /home/navin/keyboardScrollExtension/manifest.json
   ```
4. The extension will load immediately with Manifest V3 support.

---

## ⚙️ Customization via Extension Popup

Click the **ScrollKey** extension icon in your browser toolbar to configure:
- **Master Switch**: Enable or disable the extension globally.
- **Tab Navigation**: Toggle `Alt + U` and `Alt + I` tab switching on or off.
- **Key Remapping**: Click the `[ I ]` or `[ U ]` keycaps to assign any custom key.
- **Scroll Step Slider**: Customize the scroll distance per keypress (40px &ndash; 300px).
- **Smooth Motion**: Toggle between smooth animated scroll and instant jumps.
- **Shift Boost**: Enable/disable turbo speed when holding `Shift`.
- **Hover Targeting**: Choose between cursor-hovered element scrolling vs whole page.
- **On-Screen HUD**: Optional subtle visual feedback arrow on scroll.
- **Excluded Sites**: Add/remove domains from your blacklist.

---

## 📁 Extension File Structure

```text
keyboardScrollExtension/
├── manifest.json              # Cross-browser Manifest V3 configuration
├── background/
│   └── background.js          # Service worker for Alt+U / Alt+I tab switching
├── content/
│   ├── content.js             # High-performance keydown listener & scroll engine
│   └── content.css            # Optional on-screen HUD styling
├── popup/
│   ├── popup.html             # Modern dark-mode settings popup
│   ├── popup.css              # Glassmorphic UI styling
│   └── popup.js               # Settings manager, key recorder & live test pad
├── icons/
│   ├── icon-16.png            # 16x16 icon
│   ├── icon-32.png            # 32x32 icon
│   ├── icon-48.png            # 48x48 icon
│   ├── icon-128.png           # 128x128 icon
│   ├── icon.svg               # Vector SVG logo
│   └── generate_icons.py      # Icon generation script
└── README.md                  # Documentation and user manual
```
