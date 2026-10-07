/**
 * Scrollith - Options Page Controller
 * Manages full settings matrix, storage sync, developer key manager with conflict analysis,
 * kinetic scroll tuning, interactive test sandbox, and domain exclusions.
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

  const CURATED_KEYS = [
    { key: 'h', name: 'H', category: 'safe', label: 'H — Safe (Default Down - Home Row)', desc: 'Optimal home-row key. Zero browser or web app conflicts.' },
    { key: 'g', name: 'G', category: 'safe', label: 'G — Safe (Default Up - Home Row)', desc: 'Optimal home-row key. Zero browser or web app conflicts.' },
    { key: 'u', name: 'U', category: 'safe', label: 'U — Safe (Classic Down - Upper Row)', desc: 'Upper row right index key. Safe and natural reach.' },
    { key: 'i', name: 'I', category: 'safe', label: 'I — Safe (Classic Up - Upper Row)', desc: 'Upper row right middle key. Safe and natural reach.' },
    { key: 'n', name: 'N', category: 'safe', label: 'N — Safe (Bottom Row Right)', desc: 'Ergonomic bottom row reach. Completely conflict-free.' },
    { key: 'm', name: 'M', category: 'safe', label: 'M — Safe (Bottom Row Right)', desc: 'Ergonomic bottom row reach. Completely conflict-free.' },
    { key: 'y', name: 'Y', category: 'safe', label: 'Y — Safe (Upper Row Center)', desc: 'Upper row index finger key. Zero web conflicts.' },
    { key: 'o', name: 'O', category: 'safe', label: 'O — Safe (Upper Row Right)', desc: 'Upper row ring finger key. Zero web conflicts.' },
    { key: 'p', name: 'P', category: 'safe', label: 'P — Safe (Upper Row Right)', desc: 'Upper row pinky key. Safe single-key navigation.' },
    { key: 'l', name: 'L', category: 'safe', label: 'L — Safe (Home Row Right)', desc: 'Home row ring finger key. Safe single key.' },
    { key: '[', name: '[', category: 'safe', label: '[ — Safe (Bracket Left)', desc: 'Square bracket key. Conflict-free single key.' },
    { key: ']', name: ']', category: 'safe', label: '] — Safe (Bracket Right)', desc: 'Square bracket key. Conflict-free single key.' },
    { key: ',', name: ',', category: 'safe', label: ', — Safe (Comma)', desc: 'Punctuation mark. Conflict-free single key.' },
    { key: '.', name: '.', category: 'safe', label: '. — Safe (Period)', desc: 'Punctuation mark. Conflict-free single key.' },
    { key: ';', name: ';', category: 'safe', label: '; — Safe (Semicolon)', desc: 'Home row punctuation. Safe single key.' },
    { key: 'j', name: 'J', category: 'caution', label: 'J — Caution (Vim Down / Site Nav)', desc: 'Conflicts with Vimium, Reddit, YouTube comments, and GitHub.' },
    { key: 'k', name: 'K', category: 'caution', label: 'K — Caution (Vim Up / Site Nav)', desc: 'Conflicts with Vimium, Reddit, YouTube pause, and GitHub.' },
    { key: 'd', name: 'D', category: 'caution', label: 'D — Caution (Reader Page-Down)', desc: 'Used for page down in PDF viewers and news readers.' },
    { key: 's', name: 'S', category: 'caution', label: 'S — Caution (Search/Star Hotkey)', desc: 'Used by Gmail to star items and Twitter to search.' },
    { key: 'b', name: 'B', category: 'caution', label: 'B — Caution (Back/Bookmark Hotkey)', desc: 'Used in PDF readers and YouTube comment navigation.' },
    { key: 'x', name: 'X', category: 'caution', label: 'X — Caution (Select/Close Item)', desc: 'Used in Gmail to select threads.' },
    { key: 'c', name: 'C', category: 'caution', label: 'C — Caution (Compose Shortcut)', desc: 'Used in Gmail and Twitter to compose new messages.' },
    { key: 'v', name: 'V', category: 'caution', label: 'V — Caution (Visual Mode / Video)', desc: 'Used in Vimium and web video players.' },
    { key: '/', name: '/', category: 'warning', label: '/ — Warning (Quick Search Trigger)', desc: 'Triggers quick search on GitHub, Reddit, YouTube, and X.' },
    { key: '?', name: '?', category: 'warning', label: '? — Warning (Shortcuts Cheatsheet)', desc: 'Opens shortcut help overlays on GitHub, Gmail, and X.' },
    { key: 'f', name: 'F', category: 'warning', label: 'F — Warning (Link Hints / Fullscreen)', desc: 'Conflicts with Vimium link hints and YouTube full-screen mode.' },
    { key: 't', name: 'T', category: 'warning', label: 'T — Warning (Twitter / Terminal)', desc: 'Used for quick tweet and terminal web navigation.' },
    { key: 'w', name: 'W', category: 'warning', label: 'W — Warning (Close Tab / Gaming)', desc: 'Conflicts with web app tab management or WASD controls.' }
  ];

  let currentSettings = { ...DEFAULT_SETTINGS };
  let activeRecordingAction = null; // 'up' or 'down'

  // Cross-browser storage
  const storage = (typeof browser !== 'undefined' && browser.storage)
    ? browser.storage
    : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);

  // DOM Elements
  const masterToggle = document.getElementById('master-toggle');
  const statusTag = document.getElementById('status-tag');
  const saveToast = document.getElementById('save-toast');
  const resetScrollKeysBtn = document.getElementById('reset-scroll-keys');
  const btnKeyUp = document.getElementById('btn-key-up');
  const btnKeyDown = document.getElementById('btn-key-down');
  const badgeKeyUpInput = document.getElementById('badge-key-up-input');
  const badgeKeyDownInput = document.getElementById('badge-key-down-input');
  const tabSwitchingToggle = document.getElementById('tab-switching-toggle');
  
  // Developer options elements
  const devToggle = document.getElementById('dev-toggle');
  const devWindow = document.getElementById('dev-window');
  const selectKeyUp = document.getElementById('select-key-up');
  const selectKeyDown = document.getElementById('select-key-down');
  const previewKeyUp = document.getElementById('preview-key-up');
  const previewKeyDown = document.getElementById('preview-key-down');
  const hintUp = document.getElementById('hint-up');
  const hintDown = document.getElementById('hint-down');
  const conflictStatusPill = document.getElementById('conflict-status-pill');
  const conflictCardIcon = document.getElementById('conflict-card-icon');
  const conflictCardTitle = document.getElementById('conflict-card-title');
  const conflictCardBody = document.getElementById('conflict-card-body');
  const devKeyPalette = document.getElementById('dev-key-palette');
  const presetPills = document.querySelectorAll('.preset-pill');

  // Tuning elements
  const scrollStepSlider = document.getElementById('scroll-step-slider');
  const scrollStepVal = document.getElementById('scroll-step-val');
  const smoothScrollToggle = document.getElementById('smooth-scroll-toggle');
  const shiftBoostToggle = document.getElementById('shift-boost-toggle');
  const hoverTargetingToggle = document.getElementById('hover-targeting-toggle');
  const showHudToggle = document.getElementById('show-hud-toggle');

  // Test pad elements
  const interactiveTestInput = document.getElementById('interactive-test-input');
  const testFeedbackPill = document.getElementById('test-feedback-pill');
  const hintDownKey = document.getElementById('hint-down-key');
  const hintUpKey = document.getElementById('hint-up-key');
  const hintTurboKey = document.getElementById('hint-turbo-key');

  // Excluded domains elements
  const excludedDomainInput = document.getElementById('excluded-domain-input');
  const btnAddDomain = document.getElementById('btn-add-domain');
  const excludedDomainsList = document.getElementById('excluded-domains-list');
  const excludedCount = document.getElementById('excluded-count');

  // Modal elements
  const keyModal = document.getElementById('key-modal');
  const modalActionName = document.getElementById('modal-action-name');
  const modalKeyDisplay = document.getElementById('modal-key-display');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  let toastTimer = null;
  function triggerSaveToast() {
    if (saveToast) {
      saveToast.classList.add('visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        saveToast.classList.remove('visible');
      }, 1600);
    }
  }

  function saveSettings(keysToUpdate) {
    Object.assign(currentSettings, keysToUpdate);
    if (storage && storage.sync) {
      storage.sync.set(keysToUpdate, triggerSaveToast);
    } else if (storage && storage.local) {
      storage.local.set(keysToUpdate, triggerSaveToast);
    }
  }

  function renderUI() {
    // 1. Master toggle & status tag
    if (masterToggle) masterToggle.checked = !!currentSettings.enabled;
    if (statusTag) {
      if (currentSettings.enabled) {
        statusTag.textContent = 'ACTIVE & READY';
        statusTag.style.color = 'var(--gb-green)';
        statusTag.style.borderColor = 'rgba(184, 187, 38, 0.4)';
      } else {
        statusTag.textContent = 'PAUSED / OFF';
        statusTag.style.color = 'var(--gb-red)';
        statusTag.style.borderColor = 'rgba(251, 73, 52, 0.4)';
      }
    }

    // 2. Keycaps
    const upStr = (currentSettings.keyUp || 'g').toUpperCase();
    const downStr = (currentSettings.keyDown || 'h').toUpperCase();

    if (btnKeyUp) btnKeyUp.textContent = upStr;
    if (btnKeyDown) btnKeyDown.textContent = downStr;
    if (badgeKeyUpInput) badgeKeyUpInput.textContent = `Alt+${upStr}`;
    if (badgeKeyDownInput) badgeKeyDownInput.textContent = `Alt+${downStr}`;

    // 3. Tab switching
    if (tabSwitchingToggle) tabSwitchingToggle.checked = !!currentSettings.tabSwitching;

    // 4. Dev mode
    if (devToggle) devToggle.checked = !!currentSettings.devMode;
    if (devWindow) devWindow.style.display = currentSettings.devMode ? 'flex' : 'none';

    // 5. Select dropdowns
    if (selectKeyUp) selectKeyUp.value = currentSettings.keyUp.toLowerCase();
    if (selectKeyDown) selectKeyDown.value = currentSettings.keyDown.toLowerCase();
    if (previewKeyUp) previewKeyUp.textContent = upStr;
    if (previewKeyDown) previewKeyDown.textContent = downStr;
    if (hintUp) hintUp.innerHTML = `In typing boxes: <b>Alt + ${upStr}</b>`;
    if (hintDown) hintDown.innerHTML = `In typing boxes: <b>Alt + ${downStr}</b>`;

    // 6. Tuning
    if (scrollStepSlider) scrollStepSlider.value = currentSettings.stepSize || 120;
    if (scrollStepVal) scrollStepVal.textContent = `${currentSettings.stepSize || 120} px`;
    if (smoothScrollToggle) smoothScrollToggle.checked = !!currentSettings.smoothScroll;
    if (shiftBoostToggle) shiftBoostToggle.checked = !!currentSettings.shiftBoost;
    if (hoverTargetingToggle) hoverTargetingToggle.checked = !!currentSettings.hoverTargeting;
    if (showHudToggle) showHudToggle.checked = !!currentSettings.showHud;

    // 7. Interactive test pad labels
    if (hintDownKey) hintDownKey.textContent = downStr;
    if (hintUpKey) hintUpKey.textContent = upStr;
    if (hintTurboKey) hintTurboKey.textContent = `Shift + ${downStr}`;

    // 8. Conflict analysis & palette
    updateConflictAnalysis();
    updateKeyPaletteSelection();
    updatePresetPillSelection();

    // 9. Excluded domains
    renderExcludedDomains();
  }

  function populateDropdowns() {
    if (!selectKeyUp || !selectKeyDown) return;
    selectKeyUp.innerHTML = '';
    selectKeyDown.innerHTML = '';

    CURATED_KEYS.forEach(item => {
      const optUp = document.createElement('option');
      optUp.value = item.key;
      optUp.textContent = item.label;
      selectKeyUp.appendChild(optUp);

      const optDown = document.createElement('option');
      optDown.value = item.key;
      optDown.textContent = item.label;
      selectKeyDown.appendChild(optDown);
    });
  }

  function populateKeyPalette() {
    if (!devKeyPalette) return;
    devKeyPalette.innerHTML = '';

    CURATED_KEYS.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'palette-chip';
      chip.textContent = item.name;
      chip.title = `${item.label}: ${item.desc}`;
      chip.dataset.key = item.key;

      chip.addEventListener('click', () => {
        // Left click toggles down key, or assign up key
        if (currentSettings.keyDown !== item.key) {
          saveSettings({ keyDown: item.key });
        } else {
          saveSettings({ keyUp: item.key });
        }
        renderUI();
      });

      devKeyPalette.appendChild(chip);
    });
  }

  function updateKeyPaletteSelection() {
    if (!devKeyPalette) return;
    const chips = devKeyPalette.querySelectorAll('.palette-chip');
    chips.forEach(chip => {
      chip.classList.remove('active-up', 'active-down');
      if (chip.dataset.key === currentSettings.keyUp.toLowerCase()) {
        chip.classList.add('active-up');
      }
      if (chip.dataset.key === currentSettings.keyDown.toLowerCase()) {
        chip.classList.add('active-down');
      }
    });
  }

  function updatePresetPillSelection() {
    presetPills.forEach(pill => {
      const pUp = pill.dataset.up;
      const pDown = pill.dataset.down;
      if (currentSettings.keyUp === pUp && currentSettings.keyDown === pDown) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function updateConflictAnalysis() {
    const upItem = CURATED_KEYS.find(k => k.key === currentSettings.keyUp.toLowerCase());
    const downItem = CURATED_KEYS.find(k => k.key === currentSettings.keyDown.toLowerCase());

    const hasWarning = (upItem && upItem.category === 'warning') || (downItem && downItem.category === 'warning');
    const hasCaution = (upItem && upItem.category === 'caution') || (downItem && downItem.category === 'caution');

    if (hasWarning) {
      if (conflictStatusPill) {
        conflictStatusPill.className = 'conflict-pill warning';
        conflictStatusPill.textContent = 'Potential Conflicts';
      }
      if (conflictCardIcon) conflictCardIcon.textContent = '⚠️';
      if (conflictCardTitle) conflictCardTitle.textContent = 'Search / Shortcut Conflict Warning';
      if (conflictCardBody) {
        conflictCardBody.textContent = `${(upItem?.category === 'warning' ? upItem.label : '')} ${(downItem?.category === 'warning' ? downItem.label : '')} may trigger browser or website hotkeys. In typing boxes, safe Alt modifier protects you.`;
      }
    } else if (hasCaution) {
      if (conflictStatusPill) {
        conflictStatusPill.className = 'conflict-pill caution';
        conflictStatusPill.textContent = 'Minor Site Nav Conflicts';
      }
      if (conflictCardIcon) conflictCardIcon.textContent = '⚡';
      if (conflictCardTitle) conflictCardTitle.textContent = 'Vim / Site Hotkey Overlap';
      if (conflictCardBody) {
        conflictCardBody.textContent = 'Keys like J or K are popular in Vimium, Reddit, and YouTube. Scrollith safe input guard ensures normal typing remains intact.';
      }
    } else {
      if (conflictStatusPill) {
        conflictStatusPill.className = 'conflict-pill safe';
        conflictStatusPill.textContent = 'Safe Keys';
      }
      if (conflictCardIcon) conflictCardIcon.textContent = '✅';
      if (conflictCardTitle) conflictCardTitle.textContent = 'Optimal & Conflict-Free';
      if (conflictCardBody) {
        conflictCardBody.textContent = `${currentSettings.keyUp.toUpperCase()} and ${currentSettings.keyDown.toUpperCase()} are safe single keys with zero browser or web application conflicts.`;
      }
    }
  }

  function renderExcludedDomains() {
    if (!excludedDomainsList) return;
    excludedDomainsList.innerHTML = '';
    const list = currentSettings.excludedSites || [];

    if (excludedCount) excludedCount.textContent = list.length;

    if (list.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'empty-state-text';
      empty.textContent = 'No excluded domains configured.';
      excludedDomainsList.appendChild(empty);
      return;
    }

    list.forEach(domain => {
      const pill = document.createElement('div');
      pill.className = 'domain-pill';
      pill.innerHTML = `<span>${domain}</span><button type="button" data-domain="${domain}" title="Remove domain">✕</button>`;
      
      pill.querySelector('button').addEventListener('click', (e) => {
        const dom = e.currentTarget.dataset.domain;
        const updated = (currentSettings.excludedSites || []).filter(d => d !== dom);
        saveSettings({ excludedSites: updated });
        renderExcludedDomains();
      });

      excludedDomainsList.appendChild(pill);
    });
  }

  // Event Listeners setup
  function initEventListeners() {
    // Master Power toggle
    if (masterToggle) {
      masterToggle.addEventListener('change', () => {
        saveSettings({ enabled: masterToggle.checked });
        renderUI();
      });
    }

    // Reset keys button
    if (resetScrollKeysBtn) {
      resetScrollKeysBtn.addEventListener('click', () => {
        saveSettings({ keyUp: 'g', keyDown: 'h' });
        renderUI();
      });
    }

    // Tab switching toggle
    if (tabSwitchingToggle) {
      tabSwitchingToggle.addEventListener('change', () => {
        saveSettings({ tabSwitching: tabSwitchingToggle.checked });
      });
    }

    // Dev mode toggle
    if (devToggle) {
      devToggle.addEventListener('change', () => {
        saveSettings({ devMode: devToggle.checked });
        renderUI();
      });
    }

    // Select dropdowns
    if (selectKeyUp) {
      selectKeyUp.addEventListener('change', (e) => {
        saveSettings({ keyUp: e.target.value });
        renderUI();
      });
    }

    if (selectKeyDown) {
      selectKeyDown.addEventListener('change', (e) => {
        saveSettings({ keyDown: e.target.value });
        renderUI();
      });
    }

    // Preset pills
    presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const pUp = pill.dataset.up;
        const pDown = pill.dataset.down;
        saveSettings({ keyUp: pUp, keyDown: pDown });
        renderUI();
      });
    });

    // Range slider
    if (scrollStepSlider) {
      scrollStepSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (scrollStepVal) scrollStepVal.textContent = `${val} px`;
      });
      scrollStepSlider.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        saveSettings({ stepSize: val });
      });
    }

    // Tuning switches
    if (smoothScrollToggle) {
      smoothScrollToggle.addEventListener('change', () => {
        saveSettings({ smoothScroll: smoothScrollToggle.checked });
      });
    }

    if (shiftBoostToggle) {
      shiftBoostToggle.addEventListener('change', () => {
        saveSettings({ shiftBoost: shiftBoostToggle.checked });
      });
    }

    if (hoverTargetingToggle) {
      hoverTargetingToggle.addEventListener('change', () => {
        saveSettings({ hoverTargeting: hoverTargetingToggle.checked });
      });
    }

    if (showHudToggle) {
      showHudToggle.addEventListener('change', () => {
        saveSettings({ showHud: showHudToggle.checked });
      });
    }

    // Modal recording
    if (btnKeyUp) {
      btnKeyUp.addEventListener('click', () => openKeyModal('up'));
    }
    if (btnKeyDown) {
      btnKeyDown.addEventListener('click', () => openKeyModal('down'));
    }
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', closeKeyModal);
    }

    // Excluded domain add
    if (btnAddDomain && excludedDomainInput) {
      const addAction = () => {
        let domain = excludedDomainInput.value.trim().toLowerCase();
        if (!domain) return;
        domain = domain.replace(/^https?:\/\//, '').split('/')[0];
        const list = currentSettings.excludedSites || [];
        if (!list.includes(domain)) {
          list.push(domain);
          saveSettings({ excludedSites: list });
          excludedDomainInput.value = '';
          renderExcludedDomains();
        }
      };

      btnAddDomain.addEventListener('click', addAction);
      excludedDomainInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addAction();
        }
      });
    }

    // Interactive test input typing & Alt modifier detection
    if (interactiveTestInput && testFeedbackPill) {
      interactiveTestInput.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        const upKey = (currentSettings.keyUp || 'g').toLowerCase();
        const downKey = (currentSettings.keyDown || 'h').toLowerCase();

        if (e.altKey && (key === upKey || key === downKey)) {
          e.preventDefault();
          const isDownAction = (key === downKey);
          testFeedbackPill.textContent = `Alt+${key.toUpperCase()} (${isDownAction ? 'SCROLL DOWN' : 'SCROLL UP'})`;
          testFeedbackPill.style.display = 'block';
          testFeedbackPill.style.color = 'var(--gb-orange)';

          const activeBtn = isDownAction ? btnKeyDown : btnKeyUp;
          if (activeBtn) {
            activeBtn.classList.add('active-pressed');
            setTimeout(() => activeBtn.classList.remove('active-pressed'), 200);
          }

          setTimeout(() => {
            testFeedbackPill.style.display = 'none';
          }, 1100);
        } else if (e.shiftKey && key === downKey) {
          testFeedbackPill.textContent = `Shift+${key.toUpperCase()} (TURBO BOOST)`;
          testFeedbackPill.style.display = 'block';
          testFeedbackPill.style.color = 'var(--gb-yellow)';

          if (btnKeyDown) {
            btnKeyDown.classList.add('active-pressed');
            setTimeout(() => btnKeyDown.classList.remove('active-pressed'), 200);
          }

          setTimeout(() => {
            testFeedbackPill.style.display = 'none';
          }, 1100);
        }
      });
    }

    // Global keydown on options page to animate tactile keycaps
    window.addEventListener('keydown', (e) => {
      if (activeRecordingAction) {
        handleRecordedKey(e);
        return;
      }

      // Check if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const upKey = (currentSettings.keyUp || 'g').toLowerCase();
      const downKey = (currentSettings.keyDown || 'h').toLowerCase();

      if (key === upKey && btnKeyUp) {
        btnKeyUp.classList.add('active-pressed');
      } else if (key === downKey && btnKeyDown) {
        btnKeyDown.classList.add('active-pressed');
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      const upKey = (currentSettings.keyUp || 'g').toLowerCase();
      const downKey = (currentSettings.keyDown || 'h').toLowerCase();

      if (key === upKey && btnKeyUp) {
        btnKeyUp.classList.remove('active-pressed');
      } else if (key === downKey && btnKeyDown) {
        btnKeyDown.classList.remove('active-pressed');
      }
    });
  }

  function openKeyModal(action) {
    activeRecordingAction = action;
    if (modalActionName) {
      modalActionName.textContent = action === 'up' ? 'Scroll Up' : 'Scroll Down';
    }
    if (modalKeyDisplay) {
      modalKeyDisplay.textContent = 'Waiting for keypress...';
    }
    if (keyModal) {
      keyModal.style.display = 'flex';
    }
  }

  function closeKeyModal() {
    activeRecordingAction = null;
    if (keyModal) {
      keyModal.style.display = 'none';
    }
  }

  function handleRecordedKey(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      closeKeyModal();
      return;
    }

    const key = e.key.toLowerCase();
    // Disallow modifiers alone
    if (['shift', 'control', 'alt', 'meta', 'tab'].includes(key)) {
      return;
    }

    if (activeRecordingAction === 'up') {
      saveSettings({ keyUp: key });
    } else if (activeRecordingAction === 'down') {
      saveSettings({ keyDown: key });
    }

    closeKeyModal();
    renderUI();
  }

  function init() {
    populateDropdowns();
    populateKeyPalette();
    initEventListeners();

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
