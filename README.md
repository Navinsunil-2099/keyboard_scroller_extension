# ScrollKey 🚀

> **Effortless keyboard scrolling and instant tab switching for Chromium and Firefox browsers.**

ScrollKey lets you glide through web pages using **`U`** (scroll down) and **`I`** (scroll up) with a custom kinetic physics engine that feels just like a precision touchpad or physical mouse wheel. It also includes fast tab navigation with **`Alt + U`** and **`Alt + I`**, all while keeping your typing 100% protected in text fields and code editors.

---

## ⚡ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`U`** | **Scroll Down** | Glides down the current page or hovered panel with kinetic momentum. |
| **`I`** | **Scroll Up** | Glides up the current page or hovered panel with kinetic momentum. |
| **`Alt + U`** | **Previous Tab (Left)** | Instantly cycles to the tab on the left. |
| **`Alt + I`** | **Next Tab (Right)** | Instantly cycles to the tab on the right. |
| **`Shift + U`** | **Turbo Scroll Down** | 2.5× accelerated downward scroll. |
| **`Shift + I`** | **Turbo Scroll Up** | 2.5× accelerated upward scroll. |

---

## ✨ Features

- **🌊 Kinetic Physics Engine**: Built on `requestAnimationFrame` with sub-pixel precision accumulator and exponential friction decay. Eliminates choppy OS repeat stutter and matches your monitor's native refresh rate (60Hz, 120Hz, 144Hz+).
- **🛡️ Smart Typing Safety**: Intelligently disables single-key scrolling when you are typing in:
  - `<input>`, `<textarea>`, `<select>`
  - `[contenteditable]` elements (Notion, Google Docs, Medium, etc.)
  - Code editors (Monaco / VS Code web, CodeMirror, ACE)
  - ARIA textboxes and search fields
- **🌐 Global Tab Navigation**: `Alt + U` and `Alt + I` switch tabs anywhere across your browser—even if focus is inside a form or code editor.
- **🎯 Smart Hover Targeting**: Hovering your mouse over an overflow container (such as a sidebar, code block, or comments feed) scrolls that specific element instead of the main page.
- **⚙️ Full Customization Popup**:
  - Adjust scroll step distance (40px – 300px).
  - Remap keys to any character of your choice.
  - Toggle smooth motion vs instant jumps.
  - One-click site exclusion list (blacklist).
  - Built-in interactive test pad to preview settings in real time.
- **🔒 100% Private**: No analytics, no tracking, no external network requests. All preferences are stored locally in your browser.

---

## 📦 Installation Guide

### Option 1: Load in Chromium Browsers (Google Chrome, Brave, Edge, Opera, Vivaldi)

1. Download or clone this repository to your computer:
   ```bash
   git clone https://github.com/Navinsunil-2099/keyboard_scroller_extension.git
   ```
   *(Or download and extract the repository ZIP file).*
2. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
3. Toggle **Developer mode** on (usually located in the top-right corner).
4. Click **"Load unpacked"**.
5. Select the extension folder (the directory containing `manifest.json`).
6. Pin **ScrollKey** to your browser toolbar for easy access to settings!

---

### Option 2: Load in Firefox Browsers (Mozilla Firefox, LibreWolf, Floorp)

1. Download or clone this repository to your computer.
2. Open Firefox and enter in the address bar:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Under the **Temporary Extensions** section, click **"Load Temporary Add-on..."**.
4. Select the `manifest.json` file inside the extension folder.
5. The extension will activate immediately with full Manifest V3 compatibility.

---

## 🎛️ Extension Settings

Click the **ScrollKey** icon in your browser toolbar to open the settings panel:

- **Master Switch**: Toggle the extension on or off globally.
- **Scroll Step Slider**: Customize how far the page moves per keypress.
- **Smooth Motion**: Switch between fluid kinetic scrolling and instant stepping.
- **Shift Boost**: Enable or disable 2.5× fast scroll when holding `Shift`.
- **Hover Targeting**: Choose whether to scroll panels under the mouse or stick to the main document.
- **Key Remapping**: Click on the `[ I ]` or `[ U ]` keycaps in the popup to record your own custom keys.
- **Site Exclusions**: Click **"Exclude Site"** to disable keyboard scrolling on the current domain.
- **Interactive Test Pad**: Test your keybindings and scroll physics right inside the popup!

---

## 📁 Repository Structure

```text
keyboard_scroller_extension/
├── manifest.json              # Dual Manifest V3 config (Chromium & Firefox)
├── background/
│   └── background.js          # Service worker & background script for tab switching
├── content/
│   ├── content.js             # Kinetic physics scroll engine & typing filter
│   └── content.css            # Optional on-screen HUD styling
├── popup/
│   ├── popup.html             # Glassmorphic settings popup interface
│   ├── popup.css              # Dark-mode design system
│   └── popup.js               # Settings controller & live test pad
├── icons/
│   ├── icon-16.png            # 16x16 toolbar icon
│   ├── icon-32.png            # 32x32 icon
│   ├── icon-48.png            # 48x48 icon
│   ├── icon-128.png           # 128x128 store/management icon
│   └── icon.svg               # Scalable vector logo
├── .gitignore                 # Standard repository ignores
└── README.md                  # Project documentation
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
