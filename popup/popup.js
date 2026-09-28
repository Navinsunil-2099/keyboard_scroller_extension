/**
 * Scrollith - Popup Logic
 * Handles user settings, storage synchronization, key recording,
 * tab switching toggle, site exclusions, and interactive test area.
 */

(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    keyDown: 'u',
    keyUp: 'i',
    stepSize: 120,
    smoothScroll: true,
    shiftBoost: true,
    shiftMultiplier: 2.5,
    hoverTargeting: true,
    showHud: false,
    tabSwitching: true,
    excludedSites: []
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let currentDomain = '';
  let activeRecordingAction = null; // 'up' or 'down'

  // Cross-browser storage
  const storage = (typeof browser !== 'undefined' && browser.storage)
    ? browser.storage
    : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);

  // Cross-browser tabs
  const tabs = (typeof browser !== 'undefined' && browser.tabs)
    ? browser.tabs
    : (typeof chrome !== 'undefined' && chrome.tabs ? chrome.tabs : null);

  // DOM Elements
  const masterToggle = document.getElementById('master-toggle');
  const currentDomainEl = document.getElementById('current-domain');
  const siteStatusDot = document.getElementById('site-status-dot');
  const siteToggleBtn = document.getElementById('site-toggle-btn');
  const keyUpBtn = document.getElementById('key-up-btn');
  const keyDownBtn = document.getElementById('key-down-btn');
  const resetKeysBtn = document.getElementById('reset-keys-btn');
  const tabSwitchingToggle = document.getElementById('tab-switching');
  const stepSizeSlider = document.getElementById('step-size');
  const stepSizeVal = document.getElementById('step-size-val');
  const smoothScrollToggle = document.getElementById('smooth-scroll');
  const shiftBoostToggle = document.getElementById('shift-boost');
  const hoverTargetingToggle = document.getElementById('hover-targeting');
  const showHudToggle = document.getElementById('show-hud');
  const testScrollbox = document.getElementById('test-scrollbox');
  const excludedToggle = document.getElementById('excluded-toggle');
  const excludedChevron = document.getElementById('excluded-chevron');
  const excludedBody = document.getElementById('excluded-body');
  const excludedCount = document.getElementById('excluded-count');
  const excludedTags = document.getElementById('excluded-tags');
  const addExcludedInput = document.getElementById('add-excluded-input');
  const addExcludedBtn = document.getElementById('add-excluded-btn');
  const keyModal = document.getElementById('key-modal');
  const modalActionName = document.getElementById('modal-action-name');
  const modalKeyDisplay = document.getElementById('modal-key-display');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  /**
   * Save settings to Chrome/Firefox storage
   */
  function saveSettings(updates) {
    currentSettings = { ...currentSettings, ...updates };

    if (!storage) return;

    const area = storage.sync || storage.local;
    if (area) {
      try {
        area.set(currentSettings, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            if (storage.local) storage.local.set(currentSettings);
          }
        });
      } catch {
        if (storage.local) storage.local.set(currentSettings);
      }
    }
  }

  /**
   * Load settings from storage
   */
  function loadSettings() {
    if (!storage) {
      renderUI();
      return;
    }

    const area = storage.sync || storage.local;
    if (area) {
      area.get(DEFAULT_SETTINGS, (items) => {
        if (items) {
          currentSettings = { ...DEFAULT_SETTINGS, ...items };
        }
        renderUI();
      });
    } else {
      renderUI();
    }
  }

  /**
   * Detect current active tab domain
   */
  function detectCurrentSite() {
    if (!tabs || !tabs.query) {
      currentDomainEl.textContent = 'Active everywhere';
      return;
    }

    tabs.query({ active: true, currentWindow: true }, (tabList) => {
      if (tabList && tabList.length > 0 && tabList[0].url) {
        try {
          const url = new URL(tabList[0].url);
          if (url.protocol.startsWith('http')) {
            currentDomain = url.hostname.toLowerCase();
            currentDomainEl.textContent = currentDomain;
            updateSiteBanner();
            return;
          }
        } catch {
          // ignore
        }
      }
      currentDomainEl.textContent = 'Browser System Tab';
      siteToggleBtn.style.display = 'none';
    });
  }

  /**
   * Check if current detected site is excluded
   */
  function isCurrentSiteExcluded() {
    if (!currentDomain || !Array.isArray(currentSettings.excludedSites)) return false;
    return currentSettings.excludedSites.some(site => {
      const trimmed = site.trim().toLowerCase();
      return currentDomain === trimmed || currentDomain.endsWith('.' + trimmed);
    });
  }

  /**
   * Update Site Banner Status
   */
  function updateSiteBanner() {
    if (!currentDomain) return;

    const excluded = isCurrentSiteExcluded();
    const enabled = currentSettings.enabled;

    if (!enabled) {
      siteStatusDot.className = 'status-indicator disabled';
      siteToggleBtn.disabled = true;
      siteToggleBtn.textContent = 'Extension Off';
    } else if (excluded) {
      siteStatusDot.className = 'status-indicator disabled';
      siteToggleBtn.disabled = false;
      siteToggleBtn.textContent = 'Include Site';
      siteToggleBtn.style.background = 'rgba(16, 185, 129, 0.2)';
      siteToggleBtn.style.color = '#34d399';
    } else {
      siteStatusDot.className = 'status-indicator active';
      siteToggleBtn.disabled = false;
      siteToggleBtn.textContent = 'Exclude Site';
      siteToggleBtn.style.background = 'rgba(255, 255, 255, 0.08)';
      siteToggleBtn.style.color = 'var(--text-secondary)';
    }
  }

  /**
   * Render all UI elements with current settings
   */
  function renderUI() {
    masterToggle.checked = Boolean(currentSettings.enabled);

    keyUpBtn.textContent = (currentSettings.keyUp || 'i').toUpperCase();
    keyDownBtn.textContent = (currentSettings.keyDown || 'u').toUpperCase();

    tabSwitchingToggle.checked = Boolean(currentSettings.tabSwitching !== false);

    stepSizeSlider.value = currentSettings.stepSize || 120;
    stepSizeVal.textContent = `${currentSettings.stepSize || 120} px`;

    smoothScrollToggle.checked = Boolean(currentSettings.smoothScroll);
    shiftBoostToggle.checked = Boolean(currentSettings.shiftBoost);
    hoverTargetingToggle.checked = Boolean(currentSettings.hoverTargeting);
    showHudToggle.checked = Boolean(currentSettings.showHud);

    renderExcludedSites();
    updateSiteBanner();
  }

  function renderExcludedSites() {
    const list = currentSettings.excludedSites || [];
    excludedCount.textContent = list.length;
    excludedTags.innerHTML = '';

    if (list.length === 0) {
      excludedTags.innerHTML = '<div class="empty-state">No excluded sites</div>';
      return;
    }

    list.forEach(site => {
      const tag = document.createElement('div');
      tag.className = 'site-tag';
      tag.innerHTML = `
        <span>${escapeHtml(site)}</span>
        <span class="tag-remove" data-site="${escapeHtml(site)}" title="Remove">&times;</span>
      `;
      excludedTags.appendChild(tag);
    });

    excludedTags.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siteToRemove = e.target.getAttribute('data-site');
        removeExcludedSite(siteToRemove);
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function addExcludedSite(domain) {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean) return;

    const list = currentSettings.excludedSites ? [...currentSettings.excludedSites] : [];
    if (!list.includes(clean)) {
      list.push(clean);
      saveSettings({ excludedSites: list });
      renderExcludedSites();
      updateSiteBanner();
    }
  }

  function removeExcludedSite(domain) {
    let list = currentSettings.excludedSites ? [...currentSettings.excludedSites] : [];
    list = list.filter(s => s.toLowerCase() !== domain.toLowerCase());
    saveSettings({ excludedSites: list });
    renderExcludedSites();
    updateSiteBanner();
  }

  function initListeners() {
    masterToggle.addEventListener('change', () => {
      saveSettings({ enabled: masterToggle.checked });
      updateSiteBanner();
    });

    tabSwitchingToggle.addEventListener('change', () => {
      saveSettings({ tabSwitching: tabSwitchingToggle.checked });
    });

    stepSizeSlider.addEventListener('input', () => {
      const val = parseInt(stepSizeSlider.value, 10);
      stepSizeVal.textContent = `${val} px`;
      saveSettings({ stepSize: val });
    });

    smoothScrollToggle.addEventListener('change', () => {
      saveSettings({ smoothScroll: smoothScrollToggle.checked });
    });

    shiftBoostToggle.addEventListener('change', () => {
      saveSettings({ shiftBoost: shiftBoostToggle.checked });
    });

    hoverTargetingToggle.addEventListener('change', () => {
      saveSettings({ hoverTargeting: hoverTargetingToggle.checked });
    });

    showHudToggle.addEventListener('change', () => {
      saveSettings({ showHud: showHudToggle.checked });
    });

    resetKeysBtn.addEventListener('click', () => {
      saveSettings({ keyUp: 'i', keyDown: 'u' });
      renderUI();
    });

    siteToggleBtn.addEventListener('click', () => {
      if (!currentDomain) return;
      if (isCurrentSiteExcluded()) {
        removeExcludedSite(currentDomain);
      } else {
        addExcludedSite(currentDomain);
      }
    });

    excludedToggle.addEventListener('click', () => {
      const isCollapsed = excludedBody.classList.contains('collapsed');
      if (isCollapsed) {
        excludedBody.classList.remove('collapsed');
        excludedChevron.classList.add('open');
      } else {
        excludedBody.classList.add('collapsed');
        excludedChevron.classList.remove('open');
      }
    });

    addExcludedBtn.addEventListener('click', () => {
      if (addExcludedInput.value) {
        addExcludedSite(addExcludedInput.value);
        addExcludedInput.value = '';
      }
    });

    addExcludedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && addExcludedInput.value) {
        addExcludedSite(addExcludedInput.value);
        addExcludedInput.value = '';
      }
    });

    keyUpBtn.addEventListener('click', () => openKeyModal('up'));
    keyDownBtn.addEventListener('click', () => openKeyModal('down'));

    modalCancelBtn.addEventListener('click', closeKeyModal);

    window.addEventListener('keydown', (e) => {
      if (!activeRecordingAction) return;

      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
        modalKeyDisplay.textContent = 'Choose character key';
        return;
      }

      const assignedKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      modalKeyDisplay.textContent = assignedKey.toUpperCase();

      setTimeout(() => {
        if (activeRecordingAction === 'up') {
          saveSettings({ keyUp: assignedKey });
        } else if (activeRecordingAction === 'down') {
          saveSettings({ keyDown: assignedKey });
        }
        closeKeyModal();
        renderUI();
      }, 250);
    }, { capture: true });

    // Kinetic Physics for Interactive Test Box in Popup
    let popupAnimId = null;
    let popupVelocity = 0;
    let popupLastTime = 0;
    let popupIsHolding = false;
    let popupHoldDir = 0;
    let popupSubpixel = 0;

    function popupPhysicsStep(timestamp) {
      if (!popupLastTime) {
        popupLastTime = timestamp;
        popupAnimId = requestAnimationFrame(popupPhysicsStep);
        return;
      }
      const dt = Math.min((timestamp - popupLastTime) / 1000, 0.05);
      popupLastTime = timestamp;

      if (popupIsHolding) {
        const targetSpeed = popupHoldDir * (currentSettings.stepSize || 120) * 6.5;
        popupVelocity += (targetSpeed - popupVelocity) * Math.min(1, dt * 14);
      } else {
        popupVelocity *= Math.pow(0.89, dt * 60);
      }

      if (!popupIsHolding && Math.abs(popupVelocity) < 1.2) {
        popupVelocity = 0;
        popupAnimId = null;
        popupLastTime = 0;
        return;
      }

      const raw = popupVelocity * dt + popupSubpixel;
      const pix = Math.trunc(raw);
      popupSubpixel = raw - pix;

      if (pix !== 0) {
        testScrollbox.scrollTop += pix;
      }

      popupAnimId = requestAnimationFrame(popupPhysicsStep);
    }

    function startPopupScroll(dir, isRepeat) {
      popupHoldDir = dir;
      popupIsHolding = true;
      const impulse = dir * (currentSettings.stepSize || 120) * 5.8;

      if (!popupAnimId) {
        popupVelocity = impulse;
        popupLastTime = 0;
        popupSubpixel = 0;
        popupAnimId = requestAnimationFrame(popupPhysicsStep);
      } else if (!isRepeat) {
        popupVelocity += impulse * 0.55;
      }
    }

    window.addEventListener('keydown', (e) => {
      if (activeRecordingAction) return;
      if (e.target === addExcludedInput) return;

      // Handle Alt+U and Alt+I test from within popup
      if (e.altKey && (e.key.toLowerCase() === 'u' || e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        const dir = e.key.toLowerCase() === 'u' ? 'left' : 'right';
        const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
        if (runtime && runtime.sendMessage) {
          runtime.sendMessage({ action: 'switchTab', direction: dir });
        }
        return;
      }

      const pressed = e.key.toLowerCase();
      const upKey = (currentSettings.keyUp || 'i').toLowerCase();
      const downKey = (currentSettings.keyDown || 'u').toLowerCase();

      if (pressed === downKey || pressed === upKey) {
        e.preventDefault();
        const dir = pressed === downKey ? 1 : -1;
        startPopupScroll(dir, e.repeat);
      }
    });

    window.addEventListener('keyup', (e) => {
      const pressed = e.key.toLowerCase();
      const upKey = (currentSettings.keyUp || 'i').toLowerCase();
      const downKey = (currentSettings.keyDown || 'u').toLowerCase();
      if (pressed === downKey || pressed === upKey) {
        popupIsHolding = false;
      }
    });
  }

  function openKeyModal(action) {
    activeRecordingAction = action;
    modalActionName.textContent = action === 'up' ? 'Scroll Up' : 'Scroll Down';
    modalKeyDisplay.textContent = 'Press Key...';
    keyModal.style.display = 'flex';
  }

  function closeKeyModal() {
    activeRecordingAction = null;
    keyModal.style.display = 'none';
  }

  initListeners();
  loadSettings();
  detectCurrentSite();
})();
