/**
 * Scrollith - Minimal Popup Script
 * Quick controls: master toggle, site exclude/include, scroll distance slider,
 * and direct one-click launcher for the detailed full-page options dashboard.
 */

(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    keyDown: 'h',
    keyUp: 'g',
    stepSize: 120,
    smoothScroll: true,
    shiftBoost: true,
    shiftMultiplier: 2.5,
    hoverTargeting: true,
    showHud: false,
    tabSwitching: true,
    devMode: false,
    excludedSites: []
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let currentDomain = '';

  const storage = (typeof browser !== 'undefined' && browser.storage)
    ? browser.storage
    : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);

  const tabs = (typeof browser !== 'undefined' && browser.tabs)
    ? browser.tabs
    : (typeof chrome !== 'undefined' && chrome.tabs ? chrome.tabs : null);

  // DOM Elements
  const masterToggle = document.getElementById('master-toggle');
  const openSettingsIconBtn = document.getElementById('open-settings-icon-btn');
  const openOptionsCardBtn = document.getElementById('open-options-card-btn');
  const siteDomainText = document.getElementById('current-domain');
  const siteStatusDot = document.getElementById('site-status-dot');
  const siteToggleBtn = document.getElementById('site-toggle-btn');
  const miniKeyUp = document.getElementById('mini-key-up');
  const miniKeyDown = document.getElementById('mini-down');
  const stepSizeSlider = document.getElementById('step-size');
  const stepSizeVal = document.getElementById('step-size-val');

  function openOptionsPage() {
    const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
    if (runtime && runtime.openOptionsPage) {
      runtime.openOptionsPage();
    } else if (tabs) {
      tabs.create({ url: (runtime ? runtime.getURL('options/options.html') : 'options/options.html') });
    }
    window.close();
  }

  function saveSettings(updates) {
    currentSettings = { ...currentSettings, ...updates };
    if (!storage) return;

    const area = storage.sync || storage.local;
    if (area) {
      area.set(updates);
    }
  }

  function isCurrentSiteExcluded() {
    if (!currentDomain || !Array.isArray(currentSettings.excludedSites)) return false;
    return currentSettings.excludedSites.some(site => {
      const trimmed = site.trim().toLowerCase();
      return currentDomain === trimmed || currentDomain.endsWith('.' + trimmed);
    });
  }

  function updateSiteBanner() {
    if (!currentDomain) return;

    const isExcluded = isCurrentSiteExcluded();
    const isEnabled = currentSettings.enabled;

    if (!isEnabled) {
      if (siteStatusDot) siteStatusDot.className = 'status-dot disabled';
      if (siteToggleBtn) {
        siteToggleBtn.disabled = true;
        siteToggleBtn.textContent = 'Extension Off';
        siteToggleBtn.style.color = 'var(--gb-gray)';
      }
    } else if (isExcluded) {
      if (siteStatusDot) siteStatusDot.className = 'status-dot disabled';
      if (siteToggleBtn) {
        siteToggleBtn.disabled = false;
        siteToggleBtn.textContent = 'Include Site';
        siteToggleBtn.style.color = 'var(--gb-aqua)';
      }
    } else {
      if (siteStatusDot) siteStatusDot.className = 'status-dot';
      if (siteToggleBtn) {
        siteToggleBtn.disabled = false;
        siteToggleBtn.textContent = 'Exclude Site';
        siteToggleBtn.style.color = 'var(--gb-fg2)';
      }
    }
  }

  function renderUI() {
    if (masterToggle) masterToggle.checked = !!currentSettings.enabled;

    const upKey = (currentSettings.keyUp || 'g').toUpperCase();
    const downKey = (currentSettings.keyDown || 'h').toUpperCase();

    if (miniKeyUp) miniKeyUp.textContent = upKey;
    const miniDownEl = document.getElementById('mini-key-down');
    if (miniDownEl) miniDownEl.textContent = downKey;

    if (stepSizeSlider) stepSizeSlider.value = currentSettings.stepSize || 120;
    if (stepSizeVal) stepSizeVal.textContent = `${currentSettings.stepSize || 120} px`;

    updateSiteBanner();
  }

  function detectActiveTab() {
    if (!tabs || !tabs.query) {
      if (siteDomainText) siteDomainText.textContent = 'Extension Ready';
      return;
    }

    tabs.query({ active: true, currentWindow: true }, (tabList) => {
      if (tabList && tabList[0] && tabList[0].url) {
        try {
          const urlObj = new URL(tabList[0].url);
          if (['http:', 'https:'].includes(urlObj.protocol)) {
            currentDomain = urlObj.hostname.toLowerCase();
            if (siteDomainText) siteDomainText.textContent = currentDomain;
            if (siteToggleBtn) siteToggleBtn.style.display = 'inline-block';
            updateSiteBanner();
            return;
          }
        } catch {
          // ignore invalid URLs
        }
      }
      if (siteDomainText) siteDomainText.textContent = 'Browser System Tab';
      if (siteToggleBtn) siteToggleBtn.style.display = 'none';
    });
  }

  function initListeners() {
    // Open Options Page via Settings Gear Icon or Card Button
    if (openSettingsIconBtn) {
      openSettingsIconBtn.addEventListener('click', openOptionsPage);
    }
    if (openOptionsCardBtn) {
      openOptionsCardBtn.addEventListener('click', openOptionsPage);
    }

    // Master Toggle
    if (masterToggle) {
      masterToggle.addEventListener('change', () => {
        saveSettings({ enabled: masterToggle.checked });
        updateSiteBanner();
      });
    }

    // Site Exclude / Include button
    if (siteToggleBtn) {
      siteToggleBtn.addEventListener('click', () => {
        if (!currentDomain) return;
        let list = currentSettings.excludedSites ? [...currentSettings.excludedSites] : [];
        if (isCurrentSiteExcluded()) {
          list = list.filter(s => s.toLowerCase() !== currentDomain && !currentDomain.endsWith('.' + s.toLowerCase()));
        } else {
          list.push(currentDomain);
        }
        saveSettings({ excludedSites: list });
        updateSiteBanner();
      });
    }

    // Quick distance slider
    if (stepSizeSlider) {
      stepSizeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (stepSizeVal) stepSizeVal.textContent = `${val} px`;
      });
      stepSizeSlider.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        saveSettings({ stepSize: val });
      });
    }

    // Listen for storage changes from options page
    if (storage && storage.onChanged) {
      storage.onChanged.addListener((changes) => {
        for (const [key, change] of Object.entries(changes)) {
          currentSettings[key] = change.newValue;
        }
        renderUI();
      });
    }
  }

  function init() {
    initListeners();
    detectActiveTab();

    if (storage && storage.sync) {
      storage.sync.get(DEFAULT_SETTINGS, (items) => {
        currentSettings = { ...DEFAULT_SETTINGS, ...items };
        renderUI();
      });
    } else if (storage && storage.local) {
      storage.local.get(DEFAULT_SETTINGS, (items) => {
        currentSettings = { ...DEFAULT_SETTINGS, ...items };
        renderUI();
      });
    } else {
      renderUI();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
