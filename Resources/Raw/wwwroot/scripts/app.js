let gameState = null;

const player = new AudioPlayer({
    musicPath: './sound/music',
    sfxPath: './sound/effects',
    corner: 'top-right',
    theme: 'dark',
    accentColor: '#ff2a6d'
});
player.playPlaylist(['NewKindofHero-Type42.mp3', 'Evolution-Type42.mp3', 'FiniteInfinity-Type42.mp3', 'TheHunter-Type42.mp3', 'UpInFlames-RenéG.Boscio.mp3'], { random: false });
player.setAutoPlay(true);

document.addEventListener("click", function (e) {
    if (e.target && (e.target.closest('button') || e.target.closest('.save-item-btn')))
        player.playSfx('Select-2.mp3', 0.6);

    if (e.target && e.target.closest('.card'))
        player.playSfx('Select-1.mp3', 0.6);

    if (e.target && e.target.closest('.dungeon-btn'))
        player.playSfx('Swipe-1.mp3', 0.6);

    if (e.target && e.target.closest('.dungeon-path-btn'))
        player.playSfx('Swipe-2.mp3', 0.6);

    if (e.target && e.target.tagName === 'INPUT')
        player.playSfx('Cursor-1.mp3', 0.4);
});
let lastHoveredCard = null;
document.addEventListener("mouseover", function (e) {
    if (e.target && (e.target.closest('button') || e.target.closest('.save-item-btn')))
        player.playSfx('Cursor-4.mp3', 0.6);

    const card = e.target.closest('.card');
    if (card && card !== lastHoveredCard) {
        player.playSfx('Cursor-3.mp3', 0.6);
        lastHoveredCard = card;
    } else if (!card) {
        lastHoveredCard = null;
    }

    if (e.target && (e.target.closest('.dungeon-btn') || e.target.closest('.dungeon-path-btn')))
        player.playSfx('Cursor-5.mp3', 0.6);

    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        player.playSfx('Cursor-2.mp3', 0.4);
    }
});
document.addEventListener("focus", function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        player.playSfx('Cursor-1.mp3', 0.4);
    }
}, true);
const toastObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('toast')) {
                    if (node.classList.contains('error')) player.playSfx('Error-1.mp3', 0.8);
                    else if (node.classList.contains('warning')) player.playSfx('Cancel-1.mp3', 0.8);
                    else player.playSfx('PopupOpen-1.mp3', 0.6);
                }
            });
        }
    });
});
toastObserver.observe(document.body, { childList: true, subtree: true });

function hideGameViewElements() {
    const headerBtn = document.getElementById('headerBackButton');
    const content = document.getElementById('mainGameContent');
    if (headerBtn) headerBtn.style.display = 'none';
    if (content) content.style.display = 'none';
}

function showGameViewElements() {
    const headerBtn = document.getElementById('headerBackButton');
    const content = document.getElementById('mainGameContent');
    if (headerBtn) headerBtn.style.display = 'flex';
    if (content) content.style.display = 'flex';
}

window.requestGameState = function () {
    if (window.HybridWebView) {
        window.HybridWebView.SendRawMessage('RequestGameState');
    }
    if (player) {
        player.resume();
    }
};

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && player) {
        player.resume();
    }
});

window.updateGameState = function (state) {
    gameState = state;
    renderUI();
};

function renderUI() {
    if (!gameState) return;

    try {
        renderCards();
        renderDeck();
        renderDungeons();
        updateSelectionCounter();
    } catch (err) {
        console.error(err);
    }
}

function renderCards() {
    const container = document.getElementById('cardCollection');
    if (!container) return;

    const fragment = document.createDocumentFragment();

    gameState.AvailableCards.forEach((card, index) => {
        if (card.IsSelected) return;
        const cardEl = createCardElement(card, index);
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
        const cardEl = createCardElement(card, card.Index, i + 1);
        fragment.appendChild(cardEl);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function createCardElement(card, index, order = null) {
    const el = document.createElement('div');
    el.className = 'card';
    if (!card.IsOwned) el.classList.add('locked');
    if (card.IsSelected) el.classList.add('selected');
    el.style.borderColor = card.IsSelected ? '#ffc107' : card.ElementColor;

    const bg = document.createElement('div');
    bg.className = 'card-background';
    bg.style.backgroundColor = card.ElementColor || '#333';
    el.appendChild(bg);

    if (order !== null) {
        const orderBadge = document.createElement('div');
        orderBadge.className = 'card-order';
        orderBadge.textContent = order;
        el.appendChild(orderBadge);
    }

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = card.Name;
    el.appendChild(name);

    const stats = document.createElement('div');
    stats.className = 'card-stats';
    stats.innerHTML = `
        <span style="color:#ff5252">⚔️ ${card.Attack}</span>
        <span style="color:#05d5fa">❤️ ${card.Health}</span>
    `;
    el.appendChild(stats);

    if (card.IsOwned) {
        el.onclick = () => onCardClick(index);
    }

    return el;
}

async function onCardClick(index) {
    if (!window.HybridWebView) {
        const card = gameState.AvailableCards[index];
        if (card) {
            card.IsSelected = !card.IsSelected;
            if (card.IsSelected) gameState.CurrentDeckSize++;
            else gameState.CurrentDeckSize--;
            renderUI();
        }
        return;
    }

    try {
        const result = await window.HybridWebView.InvokeDotNet('OnCardTapped', [index]);
        const res = JSON.parse(result);
        if (!res.success) window.toast.error(res.message || 'Hiba történt');
    } catch (err) {
        window.toast.error('Hiba történt a kártya kiválasztásakor!');
    }
}

function renderDungeons() {
    const container = document.getElementById('dungeonList');
    if (!container) return;
    container.innerHTML = '';

    if (gameState.Dungeons && gameState.Dungeons.length > 0) {
        gameState.Dungeons.forEach(d => {
            const row = document.createElement('div');
            row.className = 'dungeon-row';

            const btn = document.createElement('div');
            btn.className = 'dungeon-btn';
            btn.onclick = () => onDungeonClick(d.Name);
            btn.innerHTML = `
                <div class="dungeon-name">${d.Name}</div>
                <div class="dungeon-lbl">KATTINTS A BELÉPÉSHEZ</div>
            `;

            // Add tooltip on hover (async)
            btn.onmouseenter = async (e) => await showDungeonTooltip(d, e);
            btn.onmousemove = (e) => updateTooltipPosition(e);
            btn.onmouseleave = () => hideDungeonTooltip();

            const bossCard = document.createElement('div');
            bossCard.className = 'boss-card-preview';

            if (d.HasBoss) {
                bossCard.innerHTML = `
                    <div style="color:red; font-size:10px; position:absolute; top:2px;">BOSS</div>
                    <div class="boss-skull">💀</div>
                    <div style="font-size:9px; margin-top:5px; text-align:center; color:#888;">${d.BossName}</div>
                    <div class="boss-stats-mini">
                        <span style="color:#ff5252">⚔${d.BossDamage}</span>
                        <span style="color:#05d5fa">♥${d.BossHealth}</span>
                    </div>
                `;
                bossCard.style.borderColor = "#ff2a6d";
            } else {
                bossCard.innerHTML = `<div style="color:#333; font-size:20px;">?</div>`;
                bossCard.style.borderColor = "#333";
            }

            row.appendChild(btn);
            row.appendChild(bossCard);
            container.appendChild(row);
        });
    } else {
        container.innerHTML = '<div style="color:#666;text-align:center;padding:20px">Nincsenek elérhető kazamaták.</div>';
    }
}

function createPath() {
    const pathName = document.getElementById('pathName');
    const pathReward = document.getElementById('rewardSetSelector');

    window.HybridWebView.InvokeDotNet("CreateDungeonPath", {
        "name": pathName.value,
        "rewardSet": pathReward.value,
        "pathSequence": window.editorContext.pathSequence
    }).then(result => {
        if (result)
            window.toast.success(`${pathName.value} Katakomba létrehozva!`);
        else
            window.toast.error(`Valami hiba történt, lehet ilyen katakomba már létezik!`);
    })


    // window.editorContext

    // Query every single field in the editor-paths field
}

// Dungeon Tooltip System
let dungeonTooltip = null;

function createDungeonTooltip() {
    if (!dungeonTooltip) {
        dungeonTooltip = document.createElement('div');
        dungeonTooltip.className = 'dungeon-tooltip';
        document.body.appendChild(dungeonTooltip);
    }
    return dungeonTooltip;
}

async function showDungeonTooltip(dungeon, event) {
    const tooltip = createDungeonTooltip();

    // Get full dungeon data with cards from backend
    let dungeonCards = [];
    try {
        const dungeonData = await window.HybridWebView.InvokeDotNet('GetDungeonCards', [dungeon.Name]);
        dungeonCards = dungeonData.Cards;


        let content = `
            <div class="dungeon-tooltip-header">${dungeon.Name}</div>
            <div class="dungeon-tooltip-section">
                <div class="dungeon-tooltip-label">Méret:</div>
                <div class="dungeon-tooltip-value">${getDungeonSizeLabel(dungeonData.Size)}</div>
            </div>
            <div class="dungeon-tooltip-section">
                <div class="dungeon-tooltip-label">Jutalom:</div>
                <div class="dungeon-tooltip-value">${getRewardLabel(dungeonData.Reward)}</div>
            </div>
        `;

        // Add cards if available
        if (dungeonCards && dungeonCards.length > 0) {
            content += `
                <div class="dungeon-tooltip-divider"></div>
                <div class="dungeon-tooltip-label">Ellenségek (${dungeonCards.length}):</div>
                <div class="dungeon-tooltip-cards">
            `;

            dungeonCards.slice(0, 6).forEach(card => {
                content += `
                    <div class="dungeon-tooltip-card">
                        <div class="dungeon-tooltip-card-name">${card.Name}</div>
                        <div class="dungeon-tooltip-card-stats">
                            <span style="color:#ff5252">⚔${card.Attack}</span>
                            <span style="color:#05d5fa">♥${card.Health}</span>
                        </div>
                    </div>
                `;
            });

            if (dungeonCards.length > 6) {
                content += `<div class="dungeon-tooltip-more">+${dungeonCards.length - 6} további...</div>`;
            }

            content += `</div>`;
        }

        tooltip.innerHTML = content;
        tooltip.style.left = event.pageX + 15 + 'px';
        tooltip.style.top = event.pageY + 'px';
        tooltip.classList.add('show');
    } catch (err) {
        console.error('Failed to fetch dungeon cards:', err);
    }
}

function updateTooltipPosition(event) {
    if (dungeonTooltip && dungeonTooltip.classList.contains('show')) {
        dungeonTooltip.style.left = event.pageX + 15 + 'px';
        dungeonTooltip.style.top = event.pageY + 'px';
    }
}

function hideDungeonTooltip() {
    if (dungeonTooltip) {
        dungeonTooltip.classList.remove('show');
    }
}

function getDungeonSizeLabel(size) {
    const labels = {
        'egyszeru': '🔹 Egyszerű',
        'kis': '🔸 Közepes',
        'nagy': '🔶 Nagy',
        0: '🔹 Egyszerű',
        1: '🔸 Közepes',
        2: '🔶 Nagy'
    };
    return labels[size] || size;
}

function getRewardLabel(reward) {
    const labels = {
        'eletero': '❤️ Életerő Növelés',
        'sebzes': '⚔️ Támadás Növelés',
        ';eletero': '❤️ Életerő Növelés',
        ';sebzes': '⚔️ Támadás Növelés',
        'kartya': '🎁 Új Kártya'
    };
    return labels[reward] || reward;
}

// Dungeon Paths System
async function renderDungeonPaths() {
    const container = document.getElementById('dungeonPathsList');
    if (!container) return;

    // Clear placeholder text
    container.innerHTML = '';

    try {
        // Fetch paths from backend
        const paths = await window.HybridWebView.InvokeDotNet('GetPaths');

        if (!paths || paths.length === 0) {
            container.innerHTML = '<div style="color:#666;text-align:center;padding:20px">Még nincsenek elérhető katakombák.</div>';
            return;
        }

        paths.forEach(path => {
            const pathRow = document.createElement('div');
            pathRow.className = 'dungeon-path-row';

            const pathBtn = document.createElement('div');
            pathBtn.className = 'dungeon-path-btn';
            pathBtn.innerHTML = `
                <div class="dungeon-path-name">${path.Name}</div>
                <div class="dungeon-path-progress">${path.Dungeons.length} Kazamata</div>
            `;

            // Add expandable tooltip
            pathBtn.onclick = (e) => {
                e.stopPropagation();
                togglePathTooltip(path, pathBtn);
            };

            pathBtn.onmouseenter = (e) => showPathPreview(path, e);
            pathBtn.onmousemove = (e) => updateTooltipPosition(e);
            pathBtn.onmouseleave = () => hideDungeonTooltip();

            const pathIndicator = document.createElement('div');
            pathIndicator.className = 'dungeon-path-indicator';
            pathIndicator.innerHTML = `
                <div class="path-chain">⛓️</div>
                <div class="path-count">${path.Dungeons.length}</div>
            `;

            pathRow.appendChild(pathBtn);
            pathRow.appendChild(pathIndicator);
            container.appendChild(pathRow);
        });
    } catch (err) {
        console.error('Failed to fetch paths:', err);
        container.innerHTML = '<div style="color:#666;text-align:center;padding:20px">Hiba történt a katakombák betöltésekor.</div>';
    }
}

// Path preview tooltip (quick hover)
function showPathPreview(path, event) {
    const tooltip = createDungeonTooltip();

    let content = `
        <div class="dungeon-tooltip-header">${path.Name}</div>
        <div class="dungeon-tooltip-section">
            <div class="dungeon-tooltip-label">Kazamaták száma:</div>
            <div class="dungeon-tooltip-value">${path.Dungeons.length}</div>
        </div>
        <div class="dungeon-tooltip-section">
            <div class="dungeon-tooltip-label">Összes jutalom:</div>
            <div class="dungeon-tooltip-value">${path.Rewards.length} jutalom</div>
        </div>
        <div class="dungeon-tooltip-hint">Kattints a részletekért</div>
    `;

    tooltip.innerHTML = content;
    tooltip.style.left = event.pageX + 15 + 'px';
    tooltip.style.top = event.pageY + 'px';
    tooltip.classList.add('show');
}

// Expandable path detail tooltip
let expandedPathTooltip = null;

function togglePathTooltip(path, buttonElement) {
    // Close if already open
    if (expandedPathTooltip && expandedPathTooltip.classList.contains('show')) {
        expandedPathTooltip.classList.remove('show');
        setTimeout(() => {
            if (expandedPathTooltip && expandedPathTooltip.parentNode) {
                expandedPathTooltip.remove();
            }
            expandedPathTooltip = null;
        }, 300);
        return;
    }

    // Create expanded tooltip
    expandedPathTooltip = document.createElement('div');
    expandedPathTooltip.className = 'dungeon-path-expanded';

    let content = `
        <div class="path-expanded-header">
            <div class="path-expanded-title">${path.Name}</div>
            <button class="path-expanded-close" onclick="closeExpandedPathTooltip()">✕</button>
        </div>
        <div class="path-expanded-subtitle">Teljes útvonal áttekintése</div>
        <div class="path-expanded-content">
    `;

    path.Dungeons.forEach((dungeon, index) => {
        const reward = path.RewardCounts[index];
        console.log(dungeon);
        content += `
            <div class="path-dungeon-item">
                <div class="path-dungeon-number">${index + 1}</div>
                <div class="path-dungeon-info">
                    <div class="path-dungeon-name">${dungeon.name}</div>
                    <div class="path-dungeon-meta">
                        <span>${getDungeonSizeLabel(dungeon.type)}</span>
                        ${dungeon.bossTemplate ? '<span style="color:#ff2a6d">💀 Boss</span>' : ''}
                    </div>
                    <div class="path-dungeon-reward">
                        <span class="path-reward-label">Menekülési jutalom:</span>
                        <span class="path-reward-value">${reward} db kártya</span>
                    </div>
                </div>
            </div>
            ${index < path.Dungeons.length - 1 ? '<div class="path-connector">↓</div>' : ''}
        `;
    });

    content += `
        </div>
        <div class="path-expanded-footer">
            <button class="path-start-btn" onclick="startDungeonPath('${path.Name}')">
                ⚔️ Út Megkezdése
            </button>
        </div>
    `;

    expandedPathTooltip.innerHTML = content;
    document.body.appendChild(expandedPathTooltip);

    const rect = buttonElement.getBoundingClientRect();

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = rect.right + 20 + scrollX;
    let top = rect.top + scrollY;

    const tooltipWidth = expandedPathTooltip.offsetWidth;
    const viewportRight = scrollX + window.innerWidth;
    if (left + tooltipWidth > viewportRight) {
        left = rect.left - tooltipWidth - 20 + scrollX;
    }

    expandedPathTooltip.style.position = 'absolute';
    expandedPathTooltip.style.left = `${left}px`;
    expandedPathTooltip.style.top = `${top}px`;

    // Show with animation
    setTimeout(() => {
        expandedPathTooltip.classList.add('show');
    }, 10);
}

function closeExpandedPathTooltip() {
    if (expandedPathTooltip) {
        expandedPathTooltip.classList.remove('show');
        setTimeout(() => {
            if (expandedPathTooltip && expandedPathTooltip.parentNode) {
                expandedPathTooltip.remove();
            }
            expandedPathTooltip = null;
        }, 300);
    }
}

function startDungeonPath(pathName) {
    closeExpandedPathTooltip();
    window.toast.info(`"${pathName}" hamarosan elérhető!`);
    // TODO: Implement path start logic
    // window.HybridWebView.InvokeDotNet('StartDungeonPath', [pathName]);
}

// Initialize paths when switching view
const originalToggleDungeonView = window.toggleDungeonView;
window.toggleDungeonView = function () {
    originalToggleDungeonView();

    // Render paths when switching to paths view
    if (currentDungeonView === 'paths') {
        renderDungeonPaths();
    }
};

// Close expanded tooltip when clicking outside
document.addEventListener('click', (e) => {
    if (expandedPathTooltip &&
        !expandedPathTooltip.contains(e.target) &&
        !e.target.closest('.dungeon-path-btn')) {
        closeExpandedPathTooltip();
    }
});

// Make function available globally
window.closeExpandedPathTooltip = closeExpandedPathTooltip;
window.startDungeonPath = startDungeonPath;

async function onDungeonClick(name) {
    player.pause();
    showLoadingScreen(async () => {
        try {
            const result = await window.HybridWebView.InvokeDotNet('OnDungeonSelected', [name]);
            const res = JSON.parse(result);
            if (!res.success) window.toast.error(res.message || 'Nem lehet belépni a kazamatába!');
        } catch (err) {
            window.toast.error('Hiba történt!');
        }
    });
}

function updateSelectionCounter() {
    const el = document.getElementById('selectionCounter');
    if (el) {
        el.textContent = `Kiválasztva: ${gameState.CurrentDeckSize} / ${gameState.MaxDeckSize}`;
    }
}

function showLoadingScreen(callback) {
    const screen = document.getElementById('loading-screen');
    screen.classList.add('active');
    createFallingStars();

    const duration = 1600;

    setTimeout(() => {
        screen.classList.remove('active');
        if (callback) callback();
    }, duration);
}

function createFallingStars() {
    const container = document.querySelector('.stars');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        star.style.left = Math.random() * 100 + '%';
        star.style.top = '-5%';

        star.style.animationDuration = (1 + Math.random() * 2) + 's';
        star.style.animationDelay = (Math.random() * 2) + 's';

        container.appendChild(star);
    }
}

function showMainMenu(doSave = false) {
    if (doSave) {
        showAutoSaveIndicator();
        window.HybridWebView.InvokeDotNet("SaveGame");
        window.HybridWebView.InvokeDotNet("UnloadGame");
    }
    showLoadingScreen(() => {
        document.querySelectorAll('.fake-page').forEach(p => p.classList.remove('active'));
        document.getElementById('main-menu').style.display = 'flex';
        hideGameViewElements();
    })
}

function hideMainMenu() {
    document.getElementById('main-menu').style.display = 'none';
}

function enterGameMode() {
    hideMainMenu();
    document.querySelectorAll('.fake-page').forEach(p => p.classList.remove('active'));
    showGameViewElements();
    requestGameState();
}

function newGame() { showLoadingScreen(showNewGamePage); }
function loadGame() { showLoadingScreen(showLoadGamePage); }
function editor() { showLoadingScreen(showEditorPage); }

function exit() {
    if (window.HybridWebView) {
        window.HybridWebView.SendRawMessage('ExitProgram');
    } else {
        window.toast.warning("Kilépés... (Csak appban működik)");
    }
}

function showNewGamePage() {
    hideMainMenu();
    document.getElementById('new-game-page').classList.add('active');

    document.getElementById('saveName').value = '';
    document.getElementById('worldTemplate').value = '';
    document.getElementById('difficulty').value = "5";
    document.getElementById('difficultyValue').innerText = "5";

    const select = document.getElementById('worldTemplate');
    select.innerHTML = ''
    getTemplatesPlaceholder().then(templates => {
        if (templates.length == 0) {
            select.disabled = true;
            document.getElementById('makeTheGameButtonHasToBeUniqueAAAAA').disabled = true;
            return;
        } else {
            document.getElementById('makeTheGameButtonHasToBeUniqueAAAAA').disabled = false;
            select.disabled = false;
        }
        window.HybridWebView.InvokeDotNet("GetDefaultWorld").then(world => {
            const defaultOpt = new Option(world.templateName, world.worldId);
            select.add(defaultOpt);
            templates.forEach(t => {
                if (t.world.templateName == world.templateName) return;
                const opt = new Option(t.world.templateName, t.world.worldId);
                select.add(opt);
            });
        });
    });
}

async function showLoadGamePage() {
    hideMainMenu();
    document.getElementById('load-game-page').classList.add('active');

    const list = document.getElementById('saveList');
    list.innerHTML = '';

    getSavesPlaceholder().then(saves => {
        saves.forEach(save => {
            const item = document.createElement('div');
            item.className = 'save-item-btn';
            item.onclick = () => loadSave(save.saveId);

            const date = new Date(save.saveTimestamp * 1000);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');

            const formatted = `${year}-${month}-${day} ${hour}:${minute}`;

            item.innerHTML = `
                <div class="save-name">${save.saveName}</div>
                <div class="save-date">${formatted}</div>`;
            list.appendChild(item);
        });
    });
}

function showEditorPage() {
    hideMainMenu();
    document.getElementById('editor-page').classList.add('active');
    initWorldEditor();
}

function startNewGame() {
    const name = document.getElementById('saveName').value.trim();
    const template = document.getElementById('worldTemplate').value;

    if (!name) return window.toast.warning('Add meg a mentés nevét!');
    if (!template) return window.toast.warning('Válassz világ sablont!');

    showLoadingScreen(() => {
        window.HybridWebView.InvokeDotNet("MakeNewGame", { "name": name, "template": template });
        enterGameMode();
        window.toast.success(`Üdvözöllek a ${name} világban!`);
    });
}

function loadSave(id) {
    showLoadingScreen(() => {
        window.HybridWebView.InvokeDotNet("LoadGameById", id).then((save) => {
            enterGameMode();
            window.toast.success(`Üdv újra a ${save.saveName} világban!`);
        });
    });
}

async function getCards() {
    return await window.HybridWebView.InvokeDotNet("GetEditorCards");
}

async function getBosses() {
    return await window.HybridWebView.InvokeDotNet("GetBossCards");
}

function refreshSetCardListNumbers() {
    window.editorContext.cardObjects.forEach(cardElement => {
        if (window.editorContext.setCards.includes(cardElement.getAttribute('cardName'))) {
            const index = window.editorContext.setCards.indexOf(cardElement.getAttribute('cardName'));
            cardElement.style.setProperty('--card-index', `"${index + 1}"`);
        } else {
            cardElement.style.setProperty('--card-index', ``);
        }
    });
}

function openContextMenu(card, isBoss = false) {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.setProperty('--context-menu-y', `${window.mouse.y}px`);
    contextMenu.style.setProperty('--context-menu-x', `${window.mouse.x}px`);
    contextMenu.style.display = 'flex';

    document.getElementById('contextClose').style.display = 'block';

    if (isBoss) {
        document.getElementById('contextDelete').onclick = () => {
            window.HybridWebView.InvokeDotNet("DeleteBoss", { 'bossName': card.Name }).then(result => {
                if (result) window.toast.success(`A ${card.Name} vezér sikeresen törölve lett!`);
                else window.toast.error("Valami hiba történt!");

                closeContextMenu();
                switchEditorTab('settings');
            })
        };
        return;
    }
    document.getElementById('contextDelete').onclick = () => {
        window.HybridWebView.InvokeDotNet("DeleteCard", { 'cardName': card.Name }).then(result => {
            if (result) window.toast.success(`A ${card.Name} kártya sikeresen törölve lett!`);
            else window.toast.error("Valami hiba történt!");

            closeContextMenu();
            switchEditorTab('settings');
        })
    };
}


function closeContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'none';
    document.getElementById('contextClose').style.display = 'none';
}

function openContextMenuFunctions(editFunc, deleteFunc) {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.setProperty('--context-menu-y', `${window.mouse.y}px`);
    contextMenu.style.setProperty('--context-menu-x', `${window.mouse.x}px`);
    contextMenu.style.display = 'flex';

    document.getElementById('contextDelete').onclick = () => {
        deleteFunc();
        closeContextMenu();
        switchEditorTab('settings');
    };

    document.getElementById('contextClose').style.display = 'block';
}

async function getDungeons() {
    return await window.HybridWebView.InvokeDotNet("GetDungeons");
}
async function getPowers() {
    return await window.HybridWebView.InvokeDotNet("GetPowerCards");
}

async function getPaths() {
    return await window.HybridWebView.InvokeDotNet("GetEditorPaths");
}

function switchEditorTab(tabId, editingData = null) {
    document.querySelectorAll('.editor-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('active'));

    const clickedBtn = document.querySelector(`button[onclick="switchEditorTab('${tabId}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    const section = document.getElementById(`editor-${tabId}`);
    if (section) section.classList.add('active');

    if (tabId == 'sets') {
        if (editingData) {
            document.getElementById('setName').value = editingData.setName;
        } else {
            document.getElementById('setName').value = '';
        }
        const cardSelectionlist = document.getElementById('cardSelectionList');
        cardSelectionlist.innerHTML = ''


        window.editorContext.setCards = [];
        window.editorContext.cardObjects = [];

        getCards().then(cards => {
            cards.forEach(card => {
                const cardElement = createCardElement(card);
                    window.editorContext.cardObjects.push(cardElement);
                    cardElement.classList.add('editor-card');
                    cardElement.setAttribute("cardName", card.Name);
                    cardElement.onclick = () => {
                        if (!window.editorContext.setCards.includes(card.Name)) window.editorContext.setCards.push(card.Name);
                        else window.editorContext.setCards.splice(window.editorContext.setCards.indexOf(card.Name), 1);

                        refreshSetCardListNumbers();
                    }
                    cardSelectionlist.appendChild(cardElement);
            });
        });
    } else if (tabId == 'settings') {
        const allCardsList = document.getElementById('allCardsList');
        const allBosses = document.getElementById('allBosses');
        getCards().then(cards => {
            document.getElementById('worldName').value = window.editorContext.name;
            if (cards.length === 0) {
                allCardsList.innerHTML = `<p>Úgy néz ki még nincs egyetlen egy kártya sem ebben a világban.</p>
                    \n<p>Menj a <button class="fake-link" onclick="switchEditorTab('cards')"> Kártya Létrehozása</button> oldalra és csináj egyet!</p>`;
                allCardsList.classList.add('emptyMessage');
                return;
            }
            allCardsList.innerHTML = '';
            allCardsList.classList.remove('emptyMessage');
            cards.forEach(card => {
                const cardElement = createCardElement(card);
                cardElement.onclick = () => openContextMenu(card);
                allCardsList.appendChild(cardElement);
            });
        });
        getBosses().then(bosses => {
            allBosses.innerHTML = '';
            bosses.forEach(boss => {
                const cardElement = createCardElement(boss);
                cardElement.onclick = () => openContextMenu(boss, true);
                allBosses.appendChild(cardElement);
            });
        });
        const allCollections = document.getElementById('allSets');
        allCollections.innerHTML = '';

        getCollections().then(collections => {
            collections.forEach(col => {
                const collectionCard = document.createElement('div');
                collectionCard.classList.add("set-card");
                const collectionName = document.createElement('h4');
                collectionName.classList.add("set-card-title");
                collectionName.textContent = col.Name;

                const cardContent = document.createElement('div');

                col.Cards.forEach(card => {
                    const cardElement = createCardElement(card);
                    cardElement.onclick = () => { };
                    cardElement.classList.add("not-interesting");
                    cardContent.appendChild(cardElement);
                });
                collectionCard.onclick = () => {
                    openContextMenuFunctions(null, () => {
                        window.HybridWebView.InvokeDotNet("DeleteCollection", col.Name);
                    });
                };

                cardContent.classList.add("set-card-content");
                collectionCard.appendChild(collectionName);
                collectionCard.appendChild(cardContent);
                allCollections.appendChild(collectionCard);
            });
        });

        const allDungeons = document.getElementById('allDungeons');
        allDungeons.innerHTML = '';

        getDungeons().then(dungeons => {
            dungeons.forEach(dungeon => {
                const dungeonCard = document.createElement('div');
                dungeonCard.classList.add("dungeon-display");
                const title = document.createElement('h4');
                title.classList.add("dungeon-name-display");
                title.textContent = dungeon.Name;
                const reward = document.createElement('p');
                reward.textContent = `Jutalom: ${getRewardLabel(dungeon.Reward)}`;
                const size = document.createElement('p');
                size.textContent = `Méret: ${dungeon.Size}`;
                const holder = document.createElement('div');
                holder.classList.add("dungeon-cards-display");

                const cards = document.createElement('div');
                cards.classList.add("dungeon-cards");

                dungeon.Cards.forEach(card => {
                    const cardElement = createCardElement(card);
                    cardElement.onclick = () => { };
                    cardElement.classList.add("not-interesting");

                    cards.appendChild(cardElement);
                });

                holder.appendChild(cards);
                if (dungeon.HasBoss) {
                    const bossHolder = document.createElement('div');
                    bossHolder.classList.add("dungeon-boss");
                    holder.appendChild(bossHolder);
                    const bossCard = createCardElement({
                        Name: dungeon.BossName,
                        Health: dungeon.BossHealth,
                        Attack: dungeon.BossDamage,
                        ElementColor: dungeon.BossColor,
                        IsOwned: true
                    });
                    bossCard.onclick = () => { };
                    bossCard.classList.add("not-interesting");
                    bossHolder.appendChild(bossCard);
                }
                
                dungeonCard.onclick = () => {
                    openContextMenuFunctions(null, () => {
                        window.HybridWebView.InvokeDotNet("DeleteDungeon", dungeon.Name);
                    });
                }
                dungeonCard.appendChild(title);
                dungeonCard.appendChild(reward);
                dungeonCard.appendChild(size);
                dungeonCard.appendChild(holder);

                allDungeons.appendChild(dungeonCard);
            });
        });
        const allPowers = document.getElementById('allPowers');
        allPowers.innerHTML = '';
        getPowers().then(powers => {
            console.log(powers);
            powers.forEach(power => {
                const card = createAbilityCard({
                    Name: power.name,
                    Rarity: power.rarity,
                    Value: power.value,
                    Duration: power.duration,
                    Type: power.type
                });
                console.log(card);
                allPowers.appendChild(card);
            })
        });

        const pathContainer = document.getElementById('allRoutes');
        getPaths().then(paths => {
            paths.forEach(path => {
                const container = document.createElement('div');
                container.classList.add('dungeon-display')
                const name = document.createElement('h1');
                name.innerText = path.Name;
                
                const cardDisplay = document.createElement('p');
                let cards = '';
                path.Rewards.forEach(card => {
                    cards += card.Name + ', ';
                });

                const dungeons = document.createElement('p');
                let dungeonsText = '';
                let i = 0;
                path.Dungeons.forEach(d=> {
                    dungeonsText += d.name + '[<b>' + path.RewardCounts[i] + '</b>]' + ', ';
                    i++;
                });

                dungeonsText = dungeonsText.slice(0, dungeonsText.length-2);
                cards = cards.slice(0, cards.length-2);

                cardDisplay.innerText = cards;
                dungeons.innerHTML = dungeonsText;

                container.appendChild(name);
                container.appendChild(cardDisplay);
                container.appendChild(dungeons);
                
                pathContainer.appendChild(container);
            });
        });
    } else if (tabId == 'cards') {
        document.getElementById('cardName').value = '';
        document.getElementById('cardAttack').value = '1';
        document.getElementById('cardHealth').value = '1';
        document.getElementById('cardElement').value = 'tuz';

        document.getElementById('isBoss').checked = false;
        document.getElementById('bossName').value = '';
        document.getElementById('bossProficiency').value = 'sebzes';
        toggleBossInputs();
    } else if (tabId == 'dungeons') {
        window.editorContext.currentSelectedBoss = '';
        document.getElementById('dungeonName').value = '';
        document.getElementById('dungeonType').value = 'egyszeru';

        document.getElementById('cardPreview').innerHTML = '';
        document.getElementById('preview').style.display = 'none';
        toggleDungeonInputs();
        const dungeonDeck = document.getElementById('dungeonDeck');
        dungeonDeck.innerHTML = '<option value="">Válassz szettet...</option>';
        window.editorContext.collectionPairs = {}

        getCollections().then(collections => {
            collections.forEach(coll => {
                window.editorContext.collectionPairs[coll.Name] = coll.Cards;
                const option = document.createElement('option');
                option.setAttribute('value', coll.Name);
                option.innerText = coll.Name;
                dungeonDeck.appendChild(option);
            })
        })
    } else if (tabId === 'abilities') {
        document.getElementById('abilityName').value = '';
        document.getElementById('abilityType').value = 'Heal';
        document.getElementById('abilityValue').value = '2';
        document.getElementById('abilityDuration').value = '0';
        document.getElementById('abilityRarity').value = '300';
        document.getElementById('abilityDescription').value = '';
        updateAbilityPreview();
    } else if (tabId == 'plydeck') {
        document.getElementById('setName').value = '';
        const plyCardSelect = document.getElementById('plyCardSelect');
        plyCardSelect.innerHTML = '';

        getCards().then(cards => {
            if (cards.length === 0) {
                plyCardSelect.innerHTML = `<p>Még egy kártyád sincs! Készíts egyet <button class="fake-link" onclick="switchEditorTab('cards')">itt</button>!</p>`;
                return;
            }

            cards.forEach(card => {
                const cardElement = createCardElement(card);
                cardElement.setAttribute("selected", "false");
                window.HybridWebView.InvokeDotNet("IsInitialCard", card.Name).then(isAdded => {
                    if (isAdded) {
                        cardElement.setAttribute("selected", "true");
                        cardElement.classList.add("plySelected");
                    }
                });
                cardElement.onclick = () => {
                    cardElement.setAttribute("selected", cardElement.getAttribute("selected") == "true" ? "false" : "true");
                    if (cardElement.getAttribute("selected") == "true") {
                        cardElement.classList.add("plySelected");
                        window.HybridWebView.InvokeDotNet("AddToInitialDeck", card.Name);
                    } else {
                        cardElement.classList.remove("plySelected");
                        window.HybridWebView.InvokeDotNet("RemoveFromInitialDeck", card.Name);
                    }
                };
                plyCardSelect.appendChild(cardElement);
            });
        });
    } else if (tabId == 'paths') {
        const pathName = document.getElementById('dungeonName');
        pathName.value = '';

        const rewardSelector = document.getElementById('rewardSetSelector');
        rewardSelector.innerHTML = '<option value="">Válassz egy szettet</option>';

        const rewardSetPreview = document.getElementById('rewardSetPreview');
        console.log(rewardSetPreview);
        window.editorContext.collectionPairs = {};
        getCollections().then(collections => {
            collections.forEach(coll => {
                console.log("cards!");
                console.log(coll);
                window.editorContext.collectionPairs[coll.Name] = coll.Cards;
                const option = document.createElement('option');
                option.setAttribute('value', coll.Name);
                option.innerText = coll.Name;
                rewardSelector.appendChild(option);
            })
        })

        const refreshShit = () => {
            if (rewardSelector.value == "") {
                rewardSetPreview.style.display = 'none';
                return;
            }

            rewardSetPreview.style.display = 'flex';
            rewardSetPreview.innerHTML = '';
            const cards = window.editorContext.collectionPairs[rewardSelector.value];
            let i = 1;
            cards.forEach(card => {
                console.log(card);
                const cardElement = createCardElement(card);
                cardElement.onclick = () => { };
                cardElement.classList.add('editor-card', 'not-interesting');

                cardElement.style.setProperty('--card-index', `"${i}"`);
                rewardSetPreview.appendChild(cardElement);
                i++;
            });
        };

        const dungeonOrderSelector = document.getElementById('dungeonOrderSelector');
        dungeonOrderSelector.innerHTML = '';
        window.editorContext.dungeonPathDungeons = [];
        window.editorContext.pathSequence = [];
        document.getElementById('pathSequenceContainer').innerHTML = '';

        getDungeons().then(dungeons => {
            dungeons.forEach(dungeon => {
                const dungeonCard = document.createElement('div');
                dungeonCard.classList.add("dungeon-display");

                const title = document.createElement('h4');
                title.classList.add("dungeon-name-display");
                title.textContent = dungeon.Name;

                const reward = document.createElement('p');
                reward.textContent = `Jutalom: ${getRewardLabel(dungeon.Reward)}`;

                const size = document.createElement('p');
                size.textContent = `Méret: ${dungeon.Size}`;

                const holder = document.createElement('div');
                holder.classList.add("dungeon-cards-display");

                const cards = document.createElement('div');
                cards.classList.add("dungeon-cards");

                dungeon.Cards.forEach(card => {
                    const cardElement = createCardElement(card);
                    cardElement.onclick = () => { };
                    cardElement.classList.add("not-interesting");
                    cards.appendChild(cardElement);
                });

                holder.appendChild(cards);

                if (dungeon.HasBoss) {
                    const bossHolder = document.createElement('div');
                    bossHolder.classList.add("dungeon-boss");
                    holder.appendChild(bossHolder);

                    const bossCard = createCardElement({
                        Name: dungeon.BossName,
                        Health: dungeon.BossHealth,
                        Attack: dungeon.BossDamage,
                        ElementColor: dungeon.BossColor,
                        IsOwned: true
                    });
                    bossCard.onclick = () => { };
                    bossCard.classList.add("not-interesting");
                    bossHolder.appendChild(bossCard);
                }

                dungeonCard.appendChild(title);
                dungeonCard.appendChild(reward);
                dungeonCard.appendChild(size);
                dungeonCard.appendChild(holder);

                dungeonCard.onclick = () => {
                    const index = window.editorContext.pathSequence.findIndex(p => p.dungeonName === dungeon.Name);

                    if (index === -1) {
                        // Add
                        window.editorContext.pathSequence.push({
                            dungeonName: dungeon.Name,
                            cardBonus: 0
                        });
                        dungeonCard.classList.add('selected');
                    } else {
                        // Remove
                        window.editorContext.pathSequence.splice(index, 1);
                        dungeonCard.classList.remove('selected');
                    }

                    renderPathSequence();
                };

                dungeonOrderSelector.appendChild(dungeonCard);
            });
        });

        refreshShit();
        rewardSelector.onchange = () => refreshShit();
    }
}

function updatePreview() {
    const dungeonDeck = document.getElementById('dungeonDeck');
    if (dungeonDeck.value == "") {
        document.getElementById('preview').style.display = 'none';
        return;
    }

    document.getElementById('preview').style.display = 'block';
    const cardPreview = document.getElementById('cardPreview');
    cardPreview.innerHTML = '';
    const cards = window.editorContext.collectionPairs[dungeonDeck.value];
    let i = 1;
    cards.forEach(card => {
        const cardElement = createCardElement(card);
        cardElement.onclick = () => { };
        cardElement.classList.add('editor-card', 'not-interesting');
        cardElement.style.setProperty('--card-index', `"${i}"`);
        cardPreview.appendChild(cardElement);
        i++;
    });
}

function saveWorld() {
    const worldName = document.getElementById('worldName');
    if (worldName.value.trim() == "") {
        window.toast.warning("Ne hagyd üresen a világ nevét!");
        return;
    }
    window.HybridWebView.InvokeDotNet("SaveEditor", encodeURIComponent(worldName.value.trim()));
    window.toast.success('Világ mentve!');
}

function loadWorld() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h3>Világ Kiválasztása</h3>
        <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    `;

    const listContainer = document.createElement('div');
    listContainer.className = 'world-list-container';
    listContainer.id = 'worldList';
    listContainer.innerHTML = '';

    getTemplatesPlaceholder().then(worlds => {
        if (!worlds || worlds.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Nincs elérhető világ sablon</p>';
            modalContent.appendChild(header);
            modalContent.appendChild(listContainer);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            return;
        }

        worlds.forEach(world => {
            const item = document.createElement('div');
            item.className = 'world-item-btn';
            item.onclick = () => loadWorldTemplate(world.world.worldId, modal, world.world.templateName);

            item.innerHTML = `
                <div class="world-name">${world.world.templateName}</div>
                <div class="world-date">ID: ${world.world.worldId}</div>
            `;

            listContainer.appendChild(item);
        });
        modalContent.appendChild(header);
        modalContent.appendChild(listContainer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
    });
}

async function createAbility() {
    const name = document.getElementById('abilityName').value.trim();
    const type = document.getElementById('abilityType').value;
    const value = parseInt(document.getElementById('abilityValue').value);
    const duration = parseInt(document.getElementById('abilityDuration').value);
    const rarity = parseInt(document.getElementById('abilityRarity').value);
    const description = document.getElementById('abilityDescription').value.trim();

    if (!name) {
        window.toast.warning('Add meg a képesség nevét!');
        return;
    }

    if (value <= 0) {
        window.toast.warning('Az érték nem lehet 0 vagy negatív!');
        return;
    }

    try {
        const result = await window.HybridWebView.InvokeDotNet("CreateAbility", {
            name: name,
            type: type,
            value: value,
            duration: duration,
            rarity: rarity,
            description: description
        });

        if (result) {
            window.toast.success(`A(z) ${name} képesség létrehozva!`);
            switchEditorTab('abilities');
        } else {
            window.toast.error('Ilyen nevű képesség már létezik!');
        }
    } catch (err) {
        window.toast.error('Hiba történt a képesség létrehozásakor!');
    }
}

function updateAbilityPreview() {
    const type = document.getElementById('abilityType').value;
    const value = parseInt(document.getElementById('abilityValue').value) || 0;
    const duration = parseInt(document.getElementById('abilityDuration').value) || 0;
    const preview = document.getElementById('abilityPreview');

    let text = '';
    switch (type) {
        case 'Heal':
            text = `Visszakap ${value} életerőt`;
            break;
        case 'Shield':
            text = `Blokkolja a következő ${duration} kör sebzését`;
            break;
        case 'InstantDamage':
            text = `${value} azonnali sebzés az ellenfélnek`;
            break;
        case 'DamageBuff':
            text = `${duration} körig ${value}% sebzés növelés`;
            break;
    }

    preview.textContent = text;
}

function updateRarityLabel() {
    const rarity = parseInt(document.getElementById('abilityRarity').value);
    const label = document.getElementById('rarityLabel');

    if (rarity >= 200) {
        label.textContent = 'Közönséges';
        label.style.color = '#808080';
    } else if (rarity >= 80) {
        label.textContent = 'Ritka';
        label.style.color = '#4169e1';
    } else if (rarity >= 20) {
        label.textContent = 'Epikus';
        label.style.color = '#9400d3';
    } else {
        label.textContent = 'Legendás';
        label.style.color = '#ffd700';
    }
}

async function getAbilities() {
    return await window.HybridWebView.InvokeDotNet("GetEditorAbilities");
}

async function deleteAbility(abilityName) {
    window.HybridWebView.InvokeDotNet("DeleteAbility", abilityName);
    switchEditorTab('settings');
}

async function renderAbilityList() {
    const container = document.getElementById('allAbilitiesList');
    if (!container) return;

    const abilities = await getAbilities();

    if (abilities.length === 0) {
        container.innerHTML = `
            <p>Még nincsenek képességek ebben a világban.</p>
            <p>Menj a <button class="fake-link" onclick="switchEditorTab('abilities')">Képesség Létrehozása</button> oldalra!</p>
        `;
        container.classList.add('emptyMessage');
        return;
    }

    container.innerHTML = '';
    container.classList.remove('emptyMessage');

    abilities.forEach(ability => {
        const abilityCard = createAbilityCard(ability);
        container.appendChild(abilityCard);
    });
}

function createAbilityCard(ability) {
    const card = document.createElement('div');
    card.className = 'ability-card';

    let rarityClass = 'common';
    if (ability.Rarity >= 200) rarityClass = 'common';
    else if (ability.Rarity >= 80) rarityClass = 'rare';
    else if (ability.Rarity >= 20) rarityClass = 'epic';
    else rarityClass = 'legendary';

    card.classList.add(rarityClass);

    card.innerHTML = `
        <div class="ability-card-header">
            <div class="ability-card-icon">⚡</div>
            <div class="ability-card-title">${ability.Name}</div>
        </div>
        <div class="ability-card-type">${getAbilityTypeName(ability.Type)}</div>
        <div class="ability-card-description">${ability.Description}</div>
        <div class="ability-card-stats">
            <span>Érték: ${ability.Value}</span>
            <span>Időtartam: ${ability.Duration}</span>
            <span>Ritkaság: ${ability.Rarity}</span>
        </div>
        <button class="ability-delete-btn" onclick="deleteAbility('${ability.Name}')">Törlés</button>
    `;

    return card;
}

function getAbilityTypeName(type) {
    const typeNames = {
        'Heal': 'Gyógyítás',
        'Shield': 'Pajzs',
        'InstantDamage': 'Azonnali Sebzés',
        'DamageBuff': 'Sebzés Erősítés'
    };
    return typeNames[type] || type;
}

function loadWorldTemplate(worldId, modalElement, worldName) {
    modalElement.remove();

    loadWorldIntoEditor(worldId, worldName);

    window.toast.success(`Világ betöltve: ${worldName}`);
}

function loadWorldIntoEditor(worldId, worldName) {
    window.HybridWebView.InvokeDotNet("LoadWorldForEditing", worldId).then(world => {
        switchEditorTab('settings');
        window.editorContext = {};
        window.editorContext.name = world.World.templateName;
    });
}

function toggleBossInputs() {
    document.getElementById('bossInputs').style.display =
        document.getElementById('isBoss').checked ? 'block' : 'none';
}

function toggleDungeonInputs() {
    const show = ['kis', 'nagy'].includes(document.getElementById('dungeonType').value);
    const bossField = document.getElementById('dungeonBossInput');
    if (show) {
        bossField.style.display = 'block';
        const bossChooser = document.getElementById('bossChooser');
        bossChooser.innerHTML = '';

        let cards = [];

        getBosses().then(bosses => {
            if (bosses.length == 0) {
                bossChooser.innerHTML = '<p>Jelenleg nincsen egy vezéred sem! Készíts egyet <button class="fake-link" onclick="switchEditorTab(\'cards\')">itt</button>!</p>';
                return;
            }
            bosses.forEach(boss => {
                const cardElement = createCardElement(boss);
                cardElement.onclick = () => {
                    window.editorContext.currentSelectedBoss = boss.Name;
                    cards.forEach(c => {
                        c.classList.remove('bossSelected');
                    });
                    cardElement.classList.add('bossSelected');
                };
                if (window.editorContext.currentSelectedBoss === boss.Name) cardElement.classList.add('bossSelected');

                cards.push(cardElement);
                bossChooser.appendChild(cardElement);
            })
        })
    } else {
        bossField.style.display = 'none';
    }
}

function initWorldEditor() {
    window.HybridWebView.InvokeDotNet("InitEditor");
    window.editorContext = {};
    window.editorContext.name = '';
    switchEditorTab('settings');
    document.getElementById('contextMenu').style.display = 'none';
    document.getElementById('contextClose').style.display = 'none';

    document.getElementById('cardName').value = '';
    document.getElementById('cardAttack').value = '1';
    document.getElementById('cardHealth').value = '1';
    document.getElementById('cardElement').value = 'tuz';

    document.getElementById('isBoss').checked = false;
    document.getElementById('bossName').value = '';
    document.getElementById('bossProficiency').value = 'sebzes';
}

function createCardPlaceholder() {
    const cardName = document.getElementById('cardName').value;
    const cardAttack = document.getElementById('cardAttack').value;
    const cardHealth = document.getElementById('cardHealth').value;
    const cardElement = document.getElementById('cardElement').value;

    const isBoss = document.getElementById('isBoss').checked;
    const bossName = document.getElementById('bossName').value;
    const bossProficiency = document.getElementById('bossProficiency').value;

    if (cardName.trim() == "") {
        window.toast.warning("A név nem lehet üres!");
        return;
    }

    if (isBoss && bossName.trim() == "") {
        window.toast.warning("A vezér neve nem lehet üres!");
        return;
    }

    window.HybridWebView.InvokeDotNet("CreateCard", {
        "name": cardName,
        "attack": parseInt(cardAttack),
        "health": parseInt(cardHealth),
        "element": cardElement,
        "isBoss": isBoss,
        "bossName": bossName,
        "bossProficiency": bossProficiency
    }).then(result => {
        if (result) {
            window.toast.success(`A(z) ${cardName} kártya létrehozva!`);
        } else {
            window.toast.warning('Kártya vagy vezér ilyen névvel már van!');
        }
        switchEditorTab('cards');
    });
}

function createSetPlaceholder() {
    const setName = document.getElementById('setName');

    if (setName.value.trim() == "") {
        window.toast.warning("A szett neve nem lehet öres!");
        return;
    }

    window.HybridWebView.InvokeDotNet("CreateCollection", {
        "name": setName.value,
        "cards": window.editorContext.setCards
    }).then(result => {
        if (result) window.toast.success(`A(z) ${setName.value} elkészítve!`);
        else window.toast.warning(`Ilyen nevű szett már létezik`);
    })
}

function createDungeonPlaceholder() {
    const dungeonName = document.getElementById('dungeonName');
    const dungeonType = document.getElementById('dungeonType');
    const dungeonDeck = document.getElementById('dungeonDeck');
    const dungeonBossInput = document.getElementById('dungeonBossInput');
    const rewardType = document.getElementById('rewardType');

    window.HybridWebView.InvokeDotNet("CreateDungeon", {
        "name": dungeonName.value,
        "deckName": dungeonDeck.value,
        "type": dungeonType.value,
        "hasBoss": ["kis", "nagy"].includes(dungeonType.value),
        "boss": window.editorContext.currentSelectedBoss,
        "reward": rewardType.value
    }).then(result => {
        window.toast.success(`A(z) ${dungeonName.value} kazamata létrehozva!`)
    });
}

async function getTemplatesPlaceholder() {
    if (window.HybridWebView) {
        const worlds = await window.HybridWebView.InvokeDotNet("RequestWorlds");
        return worlds;
    }

    return [];
}

async function getSavesPlaceholder() {
    const saves = await window.HybridWebView.InvokeDotNet("RequestSaves");
    return saves;
}

async function getCollections() {
    return await window.HybridWebView.InvokeDotNet("GetCollections");
}

function switchCardGrid(gridType) {
    const cardGrid = document.getElementById('cardGridContainer');
    const powerGrid = document.getElementById('powerCardGridContainer');
    const buttons = document.querySelectorAll('.page-switch-btn');

    if (gridType === 'cards') {
        powerGrid.classList.remove('active');
        powerGrid.classList.add('slide-right');
        powerGrid.style.display = 'none';

        cardGrid.classList.remove('slide-left');
        cardGrid.classList.add('active');
        cardGrid.style.display = 'grid';

        buttons[0].classList.add('active');
        buttons[1].classList.remove('active');
    } else {
        cardGrid.classList.remove('active');
        cardGrid.classList.add('slide-left');
        cardGrid.style.display = 'none';

        powerGrid.classList.remove('slide-right');
        powerGrid.classList.add('active');
        powerGrid.style.display = 'grid';

        buttons[0].classList.remove('active');
        buttons[1].classList.add('active');

        fillPowers();
    }
}

function fillPowers() {
    const powerGrid = document.getElementById('powercardCollection');
    powerGrid.innerHTML = '';
    window.HybridWebView.InvokeDotNet("GetAbilityCards").then(powers => {
        powers.forEach(power => {
            const powerCard = createAbilityCard(power);
            powerGrid.appendChild(powerCard);
        });
    });
}


let currentDungeonView = 'dungeons';

function toggleDungeonView() {
    const dungeonsWrapper = document.getElementById('dungeonsWrapper');
    const pathsWrapper = document.getElementById('pathsWrapper');
    const toggleBtn = document.getElementById('dungeonViewToggle');
    const panelTitle = document.getElementById('dungeonPanelTitle');

    if (currentDungeonView === 'dungeons') {
        dungeonsWrapper.classList.remove('active');
        dungeonsWrapper.classList.add('slide-left');

        pathsWrapper.classList.remove('slide-right');
        pathsWrapper.classList.add('active');

        toggleBtn.textContent = 'Kazamaták';
        panelTitle.textContent = 'Katakombák';
        currentDungeonView = 'paths';
    } else {
        pathsWrapper.classList.remove('active');
        pathsWrapper.classList.add('slide-right');

        dungeonsWrapper.classList.remove('slide-left');
        dungeonsWrapper.classList.add('active');

        toggleBtn.textContent = 'Katakombák';
        panelTitle.textContent = 'Kazamaták';
        currentDungeonView = 'dungeons';
    }
}

window.switchCardGrid = switchCardGrid;
window.toggleDungeonView = toggleDungeonView;

function requestGameState() {
    if (window.HybridWebView) {
        window.HybridWebView.SendRawMessage('RequestGameState');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (!window.HybridWebView) {
        console.warn('HybridWebView NOT available – running in browser mode');
    }

    hideGameViewElements();
    requestGameState();
    hideMainMenu();

    showLoadingScreen(() => {
        showMainMenu(false);

    })
});

document.addEventListener("mousemove", ev => window.mouse = { 'x': ev.pageX, 'y': ev.pageY });
document.getElementById('worldName').oninput = (ev) => window.editorContext.name = ev.target.value;

function renderPathSequence() {
    const container = document.getElementById('pathSequenceContainer');
    container.innerHTML = '';

    const sequence = window.editorContext.pathSequence;

    sequence.forEach((step, index) => {
        const card = document.createElement('div');
        card.className = 'path-step-card';

        card.innerHTML = `
            <h4 class="dungeon-name">${step.dungeonName}</h4>
            <label>Kártya Nyeremény</label>
            <input type="number" value="${step.cardBonus}" onchange="updatePathStep(${index}, 'cardBonus', this.value)">
        `;

        container.appendChild(card);

        // Add arrow if there are at least 2 items and this is not the last one
        if (sequence.length >= 2 && index < sequence.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'path-arrow';
            arrow.innerHTML = '➜';
            container.appendChild(arrow);
        }
    });
}

window.updatePathStep = function (index, field, value) {
    if (window.editorContext.pathSequence[index]) {
        window.editorContext.pathSequence[index][field] = parseInt(value) || 0;
    }
};