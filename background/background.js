/**
 * ScrollKey - Background Service Worker
 * Handles tab switching commands (Alt+U for left tab, Alt+I for right tab)
 * and coordinates extension actions across windows and tabs.
 */

(() => {
  'use strict';

  let lastSwitchTime = 0;
  const DEBOUNCE_MS = 60;

  /**
   * Switch the active tab in current window by offset (-1 for left, +1 for right)
   */
  function switchTab(offset) {
    const now = Date.now();
    if (now - lastSwitchTime < DEBOUNCE_MS) {
      return;
    }
    lastSwitchTime = now;

    // Cross-browser chrome/browser namespace
    const browserAPI = (typeof browser !== 'undefined' && browser.tabs) ? browser : chrome;

    browserAPI.tabs.query({ currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length <= 1) return;

      // Ensure tabs are ordered by index
      tabs.sort((a, b) => a.index - b.index);

      const activeIndex = tabs.findIndex(tab => tab.active);
      if (activeIndex === -1) return;

      // Wrap around seamlessly
      const targetIndex = (activeIndex + offset + tabs.length) % tabs.length;
      const targetTab = tabs[targetIndex];

      if (targetTab && targetTab.id !== undefined) {
        browserAPI.tabs.update(targetTab.id, { active: true });
      }
    });
  }

  // 1. Listen for browser commands (defined in manifest.json)
  const commandsAPI = (typeof browser !== 'undefined' && browser.commands) ? browser.commands : chrome.commands;
  if (commandsAPI && commandsAPI.onCommand) {
    commandsAPI.onCommand.addListener((command) => {
      if (command === 'switch_tab_left') {
        switchTab(-1);
      } else if (command === 'switch_tab_right') {
        switchTab(1);
      }
    });
  }

  // 2. Listen for runtime messages from content script or popup
  const runtimeAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
  if (runtimeAPI && runtimeAPI.onMessage) {
    runtimeAPI.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.action === 'switchTab') {
        if (message.direction === 'left') {
          switchTab(-1);
          sendResponse({ success: true, direction: 'left' });
        } else if (message.direction === 'right') {
          switchTab(1);
          sendResponse({ success: true, direction: 'right' });
        }
        return true;
      }
    });
  }
})();
