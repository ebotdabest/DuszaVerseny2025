class ToastManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }

    warning(message) {
        this.show(message, 'warning');
    }
}

function smoothScrollTo(element, targetScroll, duration = 300) {
    const start = element.scrollTop;
    const change = targetScroll - start;
    const startTime = performance.now();

    function animateScroll(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        element.scrollTop = start + change * easeProgress;

        if (progress < 1) {
            requestAnimationFrame(animateScroll);
        }
    }

    requestAnimationFrame(animateScroll);
}

function updateSelectionCounterWithAnimation() {
    const counter = document.getElementById('selectionCounter');
    if (counter) {
        counter.classList.add('updated');
        setTimeout(() => {
            counter.classList.remove('updated');
        }, 400);
    }
}

class LoadingStateManager {
    constructor() {
        this.activeLoaders = new Set();
    }

    show(id = 'default') {
        this.activeLoaders.add(id);
        this._updateUI();
    }

    hide(id = 'default') {
        this.activeLoaders.delete(id);
        this._updateUI();
    }

    _updateUI() {
        const screen = document.getElementById('loading-screen');
        if (this.activeLoaders.size > 0) {
            screen?.classList.add('active');
        } else {
            screen?.classList.remove('active');
        }
    }

    isLoading() {
        return this.activeLoaders.size > 0;
    }
}

window.loadingManager = new LoadingStateManager();

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

class KeyboardShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this._setupListener();
    }

    _setupListener() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;
            const alt = e.altKey;

            const shortcutKey = `${ctrl ? 'ctrl+' : ''}${shift ? 'shift+' : ''}${alt ? 'alt+' : ''}${key}`;

            const handler = this.shortcuts.get(shortcutKey);
            if (handler) {
                e.preventDefault();
                handler(e);
            }
        });
    }

    register(key, handler) {
        this.shortcuts.set(key.toLowerCase(), handler);
    }

    unregister(key) {
        this.shortcuts.delete(key.toLowerCase());
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
}

window.shortcuts = new KeyboardShortcutManager();

window.shortcuts.register('escape', () => {
    const modal = document.querySelector('.modal.show');
    if (modal) {
        closeAlert();
    } else if (document.querySelector('.fake-page.active')) {
        showMainMenu();
    }
});

let cardTooltip = null;

function createTooltip() {
    if (!cardTooltip) {
        cardTooltip = document.createElement('div');
        cardTooltip.className = 'card-tooltip';
        document.body.appendChild(cardTooltip);
    }
    return cardTooltip;
}

function showTooltip(text, x, y, isLocked = false) {
    const tooltip = createTooltip();
    tooltip.textContent = text;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';

    if (isLocked) {
        tooltip.classList.add('locked');
    } else {
        tooltip.classList.remove('locked');
    }

    tooltip.classList.add('show');
}

function hideTooltip() {
    if (cardTooltip) {
        cardTooltip.classList.remove('show');
    }
}

function createEnhancedCardElement(card, index, order = null) {
    const el = createCardElement(card, index, order);

    el.addEventListener('mouseenter', (e) => {
        const tooltipText = card.IsOwned ? card.Name : 'Zárolt';
        showTooltip(tooltipText, e.pageX, e.pageY, !card.IsOwned);
    });

    el.addEventListener('mousemove', (e) => {
        if (cardTooltip && cardTooltip.classList.contains('show')) {
            cardTooltip.style.left = e.pageX + 'px';
            cardTooltip.style.top = e.pageY + 'px';
        }
    });

    el.addEventListener('mouseleave', () => {
        hideTooltip();
    });

    return el;
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
    } else {
        if (gameState && document.getElementById('mainGameContent').style.display !== 'none') {
            requestGameState();
        }
    }
});

function showEnhancedAlert(message, options = {}) {
    const {
        type = 'info',
        duration = null,
        showInToast = false
    } = options;

    if (showInToast) {
        window.toast.show(message, type, duration || 3000);
    } else {
        showAlert(message);
    }
}

function showAutoSaveIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'autosave-indicator';
    indicator.innerHTML = '💾 Automatikus mentés...';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: var(--accent-green);
        padding: 10px 20px;
        border-radius: 4px;
        border: 1px solid var(--accent-green);
        z-index: 5000;
        animation: fade-in 0.3s ease;
    `;

    document.body.appendChild(indicator);

    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease';
        setTimeout(() => indicator.remove(), 300);
    }, 2000);
}

let lastGameStateUpdate = null;

window.updateGameState = function (state) {
    if (lastGameStateUpdate && JSON.stringify(lastGameStateUpdate) === JSON.stringify(state)) {
        return;
    }

    lastGameStateUpdate = JSON.parse(JSON.stringify(state));
    gameState = state;

    updateSelectionCounter();
    updateSelectionCounterWithAnimation();

    renderUI();
};

function renderCards() {
    const container = document.getElementById('cardCollection');
    if (!container) return;

    const fragment = document.createDocumentFragment();

    gameState.AvailableCards.forEach((card, index) => {
        if (card.IsSelected) return;
        const cardEl = createEnhancedCardElement(card, index);
        fragment.appendChild(cardEl);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderDeck() {
    const container = document.getElementById('selectedDeck');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const selected = gameState.AvailableCards
        .filter(c => c.IsSelected)
        .sort((a, b) => a.DeckOrder - b.DeckOrder);

    selected.forEach((card, i) => {
        const cardEl = createEnhancedCardElement(card, card.Index, i + 1);
        fragment.appendChild(cardEl);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTimes: [],
            apiCalls: 0
        };
    }

    startRender() {
        this.renderStart = performance.now();
    }

    endRender() {
        if (this.renderStart) {
            const duration = performance.now() - this.renderStart;
            this.metrics.renderTimes.push(duration);

            if (this.metrics.renderTimes.length > 10) {
                this.metrics.renderTimes.shift();
            }

            if (duration > 16) {
            }
        }
    }

    getAverageRenderTime() {
        if (this.metrics.renderTimes.length === 0) return 0;
        const sum = this.metrics.renderTimes.reduce((a, b) => a + b, 0);
        return sum / this.metrics.renderTimes.length;
    }
}

window.perfMonitor = new PerformanceMonitor();

window.addEventListener('DOMContentLoaded', () => {
    if (typeof renderUI === 'function') {
        const originalRenderUI = renderUI;
        renderUI = function () {
            window.perfMonitor.startRender();
            originalRenderUI();
            window.perfMonitor.endRender();
        };
    }

    window.toast = new ToastManager();
});

window.addEventListener('error', (event) => {
    showEnhancedAlert('Váratlan hiba történt. Kérlek, próbáld újra!', {
        type: 'error',
        showInToast: true
    });
});

window.addEventListener('unhandledrejection', (event) => {
});

function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    });
}

const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
            const modal = mutation.target;
            if (modal.classList.contains('show') || modal.classList.contains('active')) {
                trapFocus(modal);
            }
        }
    });
});

document.querySelectorAll('.modal, .fake-page').forEach(modal => {
    modalObserver.observe(modal, { attributes: true });
});