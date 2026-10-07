/**
 * Scrollith - Content Script
 * High-precision kinetic physics engine for buttery smooth scrolling,
 * context awareness, smart container targeting, and Alt+U / Alt+I tab switching.
 */

(() => {
  'use strict';

  // Default configuration
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

  let settings = { ...DEFAULT_SETTINGS };
  let lastMousePosition = { x: -1, y: -1 };
  let hudTimeout = null;
  let hudElement = null;

  // Kinetic Physics State
  let animFrameId = null;
  let lastTimestamp = 0;
  let currentVelocity = 0; // Pixels per second
  let subpixelAccumulator = 0;
  let isHoldingKey = false;
  let holdDirection = 0; // +1 = down, -1 = up
  let isShiftActive = false;
  let currentScrollTarget = null;

  // Physics constants calibrated for fluid touchpad / Apple-like momentum
  const FRICTION = 0.89; // Per-frame velocity decay factor (calibrated for 60fps)
  const MIN_VELOCITY = 1.2; // Threshold to stop animation (px/sec)

  // Cross-browser runtime & storage reference
  const extensionStorage = (typeof browser !== 'undefined' && browser.storage) 
    ? browser.storage 
    : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);

  const extensionRuntime = (typeof browser !== 'undefined' && browser.runtime)
    ? browser.runtime
    : (typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : null);

  /**
   * Safe storage getter
   */
  function loadSettings() {
    if (!extensionStorage || !extensionStorage.sync) {
      if (extensionStorage && extensionStorage.local) {
        extensionStorage.local.get(DEFAULT_SETTINGS, applySettings);
      }
      return;
    }

    try {
      extensionStorage.sync.get(DEFAULT_SETTINGS, (items) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          if (extensionStorage.local) {
            extensionStorage.local.get(DEFAULT_SETTINGS, applySettings);
          }
        } else {
          applySettings(items);
        }
      });
    } catch {
      if (extensionStorage.local) {
        extensionStorage.local.get(DEFAULT_SETTINGS, applySettings);
      }
    }
  }

  function applySettings(items) {
    if (items) {
      settings = { ...DEFAULT_SETTINGS, ...items };
    }
  }

  // Real-time configuration changes from popup
  if (extensionStorage && extensionStorage.onChanged) {
    extensionStorage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        for (const [key, change] of Object.entries(changes)) {
          settings[key] = change.newValue;
        }
      }
    });
  }

  // Track mouse coordinates for hover targeting
  function updateMouseCoords(e) {
    if (e && typeof e.clientX === 'number') {
      lastMousePosition.x = e.clientX;
      lastMousePosition.y = e.clientY;
    }
  }
  window.addEventListener('mousemove', updateMouseCoords, { passive: true, capture: true });
  window.addEventListener('mousedown', updateMouseCoords, { passive: true, capture: true });
  window.addEventListener('pointerdown', updateMouseCoords, { passive: true, capture: true });

  // Reset physics if user interrupts with real mouse wheel / touch
  window.addEventListener('wheel', () => {
    if (!isHoldingKey && currentVelocity !== 0) {
      stopPhysics();
    }
  }, { passive: true });

  // Reset on window blur (e.g., user alt-tabs or switches windows)
  window.addEventListener('blur', () => {
    isHoldingKey = false;
    stopPhysics();
  });

  /**
   * Check if current site is in the exclusion list
   */
  function isCurrentSiteExcluded() {
    if (!settings.excludedSites || !Array.isArray(settings.excludedSites)) {
      return false;
    }
    const currentHost = window.location.hostname.toLowerCase();
    return settings.excludedSites.some(site => {
      const trimmed = site.trim().toLowerCase();
      if (!trimmed) return false;
      return currentHost === trimmed || currentHost.endsWith('.' + trimmed);
    });
  }

  /**
   * Deep check if an element is an editable input, textarea, code editor,
   * or rich text editor where bare 'U' and 'I' keystrokes MUST NOT scroll.
   */
  function isEditableElement(target, event) {
    const elementsToCheck = [];
    if (event && typeof event.composedPath === 'function') {
      const path = event.composedPath();
      for (const node of path) {
        if (node instanceof HTMLElement) {
          elementsToCheck.push(node);
        }
      }
    }
    if (target instanceof HTMLElement && !elementsToCheck.includes(target)) {
      elementsToCheck.push(target);
    }

    let active = document.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    if (active instanceof HTMLElement && !elementsToCheck.includes(active)) {
      elementsToCheck.push(active);
    }

    for (const el of elementsToCheck) {
      if (!el || !el.tagName) continue;

      const tagName = el.tagName.toUpperCase();

      if (tagName === 'INPUT') {
        const type = (el.type || 'text').toLowerCase();
        const nonTextInputs = ['checkbox', 'radio', 'range', 'color', 'file', 'image', 'reset', 'button', 'submit'];
        if (!nonTextInputs.includes(type)) {
          return true;
        }
      }

      if (tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
      }

      if (el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === '') {
        return true;
      }

      const role = el.getAttribute('role');
      if (role === 'textbox' || role === 'searchbox' || role === 'combobox') {
        return true;
      }

      if (el.closest) {
        const editorContainer = el.closest(
          '.monaco-editor, .cm-editor, .cm-content, .ace_editor, .public-DraftEditor-content, ' +
          '.ProseMirror, .ql-editor, [data-slate-editor="true"], .notion-page-content, ' +
          '.CodeMirror, .rich-text-editor, [role="textbox"], [contenteditable="true"]'
        );
        if (editorContainer) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a given element is a scrollable container with vertical overflow
   */
  function isScrollContainer(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (element === document.body || element === document.documentElement) return false;

    // Avoid tiny widgets, buttons, tooltips
    if (element.clientHeight < 40 || element.clientWidth < 80) return false;

    // Avoid small 1-line or 2-line input boxes
    if (isEditableElement(element) && element.clientHeight < 250) return false;

    try {
      const style = window.getComputedStyle(element);
      const overflowY = style.overflowY;
      const isScrollType = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
      if (!isScrollType) return false;

      return element.scrollHeight > (element.clientHeight + 4);
    } catch {
      return false;
    }
  }

  /**
   * Check if the document window itself has scrollable content
   */
  function canWindowScroll() {
    const doc = document.scrollingElement || document.documentElement || document.body;
    if (!doc) return false;
    return doc.scrollHeight > (window.innerHeight + 10);
  }

  /**
   * Find the most relevant scroll target with SPA (ChatGPT, Claude, Notion) awareness.
   */
  function getScrollTarget(direction) {
    // 1. Mouse hover targeting: if mouse is over an explicit scrollable container
    if (settings.hoverTargeting && lastMousePosition.x >= 0 && lastMousePosition.y >= 0) {
      let hovered = document.elementFromPoint(lastMousePosition.x, lastMousePosition.y);
      let curr = hovered;
      while (curr && curr !== document.documentElement && curr !== document.body) {
        if (isScrollContainer(curr)) {
          return curr;
        }
        curr = curr.parentElement;
      }
    }

    // 2. Focused Input / SPA targeting (ChatGPT, Claude, Notion, etc.):
    // When focused in an input box or when the main window does not scroll,
    // find the primary conversation/content container!
    const active = document.activeElement;
    if (active && (isEditableElement(active) || !canWindowScroll())) {
      // A. Check ancestors of active element
      let ancestor = active.parentElement;
      while (ancestor && ancestor !== document.documentElement && ancestor !== document.body) {
        if (isScrollContainer(ancestor) && ancestor.clientHeight > 200) {
          return ancestor;
        }
        ancestor = ancestor.parentElement;
      }

      // B. Search within the active section (closest main or body)
      const mainContext = active.closest('main, [role="main"], #__next, body') || document.body;
      const candidates = mainContext.querySelectorAll('div, section, article, main');
      let bestCandidate = null;
      let bestScore = -1;

      for (const el of candidates) {
        if (isScrollContainer(el)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 180 && rect.height > 150) {
            let score = rect.width * rect.height;

            // Prioritize main conversation area
            if (el.tagName === 'MAIN' || el.getAttribute('role') === 'main' || el.closest('main')) {
              score *= 3;
            }

            const className = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
            if (className.includes('conversation') || className.includes('scroll') || className.includes('overflow-y-auto')) {
              score *= 2;
            }

            // Slight preference for containers that have room to move in direction
            if (direction < 0 && el.scrollTop > 2) {
              score *= 1.3;
            } else if (direction > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 4) {
              score *= 1.3;
            }

            if (score > bestScore) {
              bestScore = score;
              bestCandidate = el;
            }
          }
        }
      }

      if (bestCandidate) {
        return bestCandidate;
      }
    }

    // 3. Document window if scrollable (standard multi-page websites)
    if (canWindowScroll()) {
      return document.scrollingElement || document.documentElement || document.body || window;
    }

    // 4. Global fallback for SPAs: find largest visible scroll container
    const globalCandidates = document.querySelectorAll('main, [role="main"], div, section, article');
    let bestGlobal = null;
    let bestGlobalScore = -1;

    for (const el of globalCandidates) {
      if (isScrollContainer(el)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 180 && rect.height > 150) {
          let score = rect.width * rect.height;
          if (el.tagName === 'MAIN' || el.getAttribute('role') === 'main' || el.closest('main')) {
            score *= 2;
          }
          if (direction < 0 && el.scrollTop > 2) {
            score *= 1.2;
          } else if (direction > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 4) {
            score *= 1.2;
          }

          if (score > bestGlobalScore) {
            bestGlobalScore = score;
            bestGlobal = el;
          }
        }
      }
    }

    if (bestGlobal) {
      return bestGlobal;
    }

    return document.scrollingElement || document.documentElement || document.body || window;
  }

  /**
   * Stop the animation loop and reset velocity
   */
  function stopPhysics() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    currentVelocity = 0;
    subpixelAccumulator = 0;
    lastTimestamp = 0;
    currentScrollTarget = null;
  }

  /**
   * Core Kinetic Physics Animation Loop
   * Runs continuously via requestAnimationFrame for silky 60/120/144Hz smoothness
   */
  function physicsStep(timestamp) {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
      animFrameId = requestAnimationFrame(physicsStep);
      return;
    }

    // Delta time in seconds, clamped to avoid huge jumps on lag spikes
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    const multiplier = (settings.shiftBoost && isShiftActive) ? (settings.shiftMultiplier || 2.5) : 1;

    // 1. If key is currently being held down, maintain a smooth cruising speed
    if (isHoldingKey) {
      // Cruising speed based on configured step size
      const targetCruisingSpeed = holdDirection * (settings.stepSize || 120) * 7.5 * multiplier;
      // Exponentially approach cruising speed for instant, butter-smooth acceleration
      const accelFactor = Math.min(1, dt * 14);
      currentVelocity += (targetCruisingSpeed - currentVelocity) * accelFactor;
    } else {
      // 2. Coasting / Inertia: Apply frame-rate independent exponential friction decay
      // FRICTION^(dt / (1/60)) ensures identical feel on 60Hz, 120Hz, or 144Hz screens
      const decay = Math.pow(FRICTION, dt * 60);
      currentVelocity *= decay;
    }

    // 3. Check for boundary stopping
    if (!isHoldingKey && Math.abs(currentVelocity) < MIN_VELOCITY) {
      stopPhysics();
      return;
    }

    // 4. Sub-pixel accumulator to prevent micro-stuttering from integer pixel truncation
    const rawDelta = currentVelocity * dt + subpixelAccumulator;
    const pixelDelta = Math.trunc(rawDelta);
    subpixelAccumulator = rawDelta - pixelDelta;

    if (pixelDelta !== 0 && currentScrollTarget) {
      const prevTop = getElementScrollTop(currentScrollTarget);

      // Perform actual scroll
      applyScrollDelta(currentScrollTarget, pixelDelta);

      const newTop = getElementScrollTop(currentScrollTarget);

      // If scroll position didn't change (hit the wall/top/bottom), dissipate remaining velocity
      if (Math.abs(newTop - prevTop) < 0.1 && Math.abs(pixelDelta) >= 1) {
        if (!isHoldingKey) {
          stopPhysics();
          return;
        }
      }
    }

    // Continue animation loop
    animFrameId = requestAnimationFrame(physicsStep);
  }

  function getElementScrollTop(target) {
    if (target === window) {
      return window.scrollY || window.pageYOffset || 0;
    }
    return target.scrollTop || 0;
  }

  function applyScrollDelta(target, delta) {
    if (target === window || target === document.documentElement || target === document.body || target === document.scrollingElement) {
      const root = document.scrollingElement || document.documentElement || document.body;
      if (typeof window.scrollBy === 'function') {
        window.scrollBy({
          top: delta,
          left: 0,
          behavior: 'instant' // Driven continuously by rAF
        });
      } else if (root) {
        root.scrollTop += delta;
      }
    } else if (target instanceof HTMLElement) {
      const initialTop = target.scrollTop;

      if (typeof target.scrollBy === 'function') {
        try {
          target.scrollBy({
            top: delta,
            left: 0,
            behavior: 'instant'
          });
        } catch {
          target.scrollTop += delta;
        }
      } else {
        target.scrollTop += delta;
      }

      // Enforce direct modification if CSS smooth-scroll or layout engine ignored scrollBy
      if (Math.abs(target.scrollTop - initialTop) < 0.1) {
        target.scrollTop = initialTop + delta;
      }
    }
  }

  /**
   * Trigger smooth kinetic scroll with natural impulse and continuous hold
   */
  function startScroll(direction, isShift, isRepeat) {
    currentScrollTarget = getScrollTarget(direction);
    isShiftActive = isShift;
    holdDirection = direction;
    isHoldingKey = true;

    const multiplier = (settings.shiftBoost && isShift) ? (settings.shiftMultiplier || 2.5) : 1;

    // Base impulse: calibrated so a single tap glides roughly the configured stepSize
    const impulse = direction * (settings.stepSize || 120) * 6.2 * multiplier;

    if (!animFrameId) {
      // Starting from a standstill
      currentVelocity = impulse;
      lastTimestamp = 0;
      subpixelAccumulator = 0;
      animFrameId = requestAnimationFrame(physicsStep);
    } else {
      // If already moving in the same direction, smoothly boost velocity
      if ((direction > 0 && currentVelocity > 0) || (direction < 0 && currentVelocity < 0)) {
        if (!isRepeat) {
          currentVelocity += impulse * 0.55;
        }
      } else {
        // If moving in the opposite direction, immediately brake and reverse direction
        currentVelocity = impulse * 0.85;
      }
    }

    if (settings.showHud) {
      showHUD(direction < 0 ? 'Up' : 'Down');
    }
  }

  /**
   * Optional HUD indicator for visual feedback
   */
  function showHUD(dirText) {
    if (!document.body) return;

    if (!hudElement) {
      hudElement = document.createElement('div');
      hudElement.id = 'scrollith-hud';
      document.body.appendChild(hudElement);
    }

    // Safely populate HUD without innerHTML
    hudElement.replaceChildren();

    const iconSpan = document.createElement('span');
    iconSpan.className = 'scrollith-icon';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', dirText === 'Up' ? 'M12 4l-8 8h6v8h4v-8h6z' : 'M12 20l8-8h-6v-8h-4v8h-6z');
    svg.appendChild(path);
    iconSpan.appendChild(svg);

    const textSpan = document.createElement('span');
    textSpan.textContent = `Scroll ${dirText}`;

    hudElement.appendChild(iconSpan);
    hudElement.appendChild(textSpan);
    hudElement.classList.add('scrollith-visible');

    if (hudTimeout) clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => {
      if (hudElement) hudElement.classList.remove('scrollith-visible');
    }, 500);
  }

  /**
   * Universal key matching (resilient against Linux Alt-layer symbols, dead keys, and layout overrides)
   */
  function matchesKey(event, targetChar) {
    if (!targetChar || !event) return false;
    const t = targetChar.toLowerCase();
    const k = (event.key || '').toLowerCase();
    if (k === t) return true;

    // Physical key code check (e.g. 'KeyG' for 'g')
    if (t.length === 1 && t >= 'a' && t <= 'z') {
      if (event.code === `Key${t.toUpperCase()}`) return true;
      const expectedCode = t.toUpperCase().charCodeAt(0);
      if (event.keyCode === expectedCode || event.which === expectedCode) return true;
    }

    // Common symbol mappings
    const codeMap = {
      '[': 'BracketLeft',
      ']': 'BracketRight',
      ',': 'Comma',
      '.': 'Period',
      ';': 'Semicolon',
      '/': 'Slash',
      '-': 'Minus',
      '=': 'Equal'
    };
    if (codeMap[t] && event.code === codeMap[t]) return true;

    return false;
  }

  /**
   * Main Keydown Listener
   */
  function handleKeyDown(event) {
    if (!settings.enabled) return;

    const keyUp = (settings.keyUp || 'g').toLowerCase();
    const keyDown = (settings.keyDown || 'h').toLowerCase();

    const isUp = matchesKey(event, keyUp) || matchesKey(event, 'g');
    const isDown = matchesKey(event, keyDown) || matchesKey(event, 'h');
    const isTabLeft = matchesKey(event, 'u');
    const isTabRight = matchesKey(event, 'i');

    // 1. FEATURE: Alt + U (Left Tab) and Alt + I (Right Tab)
    if (settings.tabSwitching && event.altKey && !event.ctrlKey && !event.metaKey) {
      if (isTabLeft || isTabRight) {
        event.preventDefault();
        event.stopPropagation();
        const direction = isTabLeft ? 'left' : 'right';
        try {
          if (extensionRuntime && extensionRuntime.sendMessage) {
            extensionRuntime.sendMessage({ action: 'switchTab', direction });
          }
        } catch {
          // ignore
        }
        return;
      }
    }

    // Excluded sites check
    if (isCurrentSiteExcluded()) {
      return;
    }

    // 2. FEATURE: Alt + G (Up) and Alt + H (Down) Scrolling
    // Solves the problem where single keys cannot be used when typing in input boxes or editors.
    // Alt + G / Alt + H scrolls smoothly even when inside an active input field, textarea, or contenteditable!
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      let altDirection = 0;
      if (isDown) {
        altDirection = 1; // Down
      } else if (isUp) {
        altDirection = -1; // Up
      }

      if (altDirection !== 0) {
        event.preventDefault();
        event.stopPropagation();

        if (!settings.smoothScroll) {
          const multiplier = (settings.shiftBoost && event.shiftKey) ? (settings.shiftMultiplier || 2.5) : 1;
          const target = getScrollTarget(altDirection);
          applyScrollDelta(target, altDirection * (settings.stepSize || 120) * multiplier);
          return;
        }

        // Trigger kinetic physics
        startScroll(altDirection, event.shiftKey, event.repeat);
        return;
      }

      // Other Alt combos are ignored so system hotkeys continue working
      return;
    }

    // Modifiers check: Ctrl, Alt, Meta/Cmd should NEVER be intercepted for regular page scrolling
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // 3. Single-Key Scrolling (G for Up, H for Down)
    let direction = 0;
    if (isDown) {
      direction = 1; // Down
    } else if (isUp) {
      direction = -1; // Up
    } else {
      return;
    }

    // Safe typing check: Never intercept single keys while typing in form inputs, textareas, or editors!
    // (In typing boxes, use Alt+G or Alt+H to scroll instead)
    if (isEditableElement(event.target, event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!settings.smoothScroll) {
      // Instant mode if smooth scrolling is disabled
      const multiplier = (settings.shiftBoost && event.shiftKey) ? (settings.shiftMultiplier || 2.5) : 1;
      const target = getScrollTarget(direction);
      applyScrollDelta(target, direction * (settings.stepSize || 120) * multiplier);
      return;
    }

    // Trigger kinetic physics
    startScroll(direction, event.shiftKey, event.repeat);
  }

  /**
   * Keyup Listener to begin smooth momentum coasting
   */
  function handleKeyUp(event) {
    const keyUp = (settings.keyUp || 'g').toLowerCase();
    const keyDown = (settings.keyDown || 'h').toLowerCase();

    const isUp = matchesKey(event, keyUp) || matchesKey(event, 'g');
    const isDown = matchesKey(event, keyDown) || matchesKey(event, 'h');

    if (isDown || isUp || event.key === 'Alt' || event.code === 'AltLeft' || event.code === 'AltRight') {
      // Release hold; physics loop will smoothly coast to a halt
      isHoldingKey = false;
    }
  }

  window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
  window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });

  loadSettings();
})();
