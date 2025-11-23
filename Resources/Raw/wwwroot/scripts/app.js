// app.js - Fixed & Complete Version

let gameState = null;

// ====================================================================
// UI RENDERING & NAVIGATION HELPERS
// ====================================================================

function hideGameViewElements() {
        const headerBtn = document.getElementById('headerBackButton');
        const content = document.getElementById('mainGameContent');
        if (headerBtn) headerBtn.style.display = 'none';
        if (content) content.style.display = 'none';
}

function showGameViewElements() {
        const headerBtn = document.getElementById('headerBackButton');
        const content = document.getElementById('mainGameContent');
        if (headerBtn) headerBtn.style.display = 'flex'; // Use flex to center '◄'
        if (content) content.style.display = 'flex';
}

window.updateGameState = function (state) {
        debugLog('=== updateGameState received ===', 'info');
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
                debugLog(`UI render error: ${err.message}`, 'error');
                console.error(err);
        }
}

function renderCards() {
        const container = document.getElementById('cardCollection');
        if (!container) return;
        container.innerHTML = '';

        gameState.AvailableCards.forEach((card, index) => {
                if (card.IsSelected) return;
                const cardEl = createCardElement(card, index);
                container.appendChild(cardEl);
        });
}

function renderDeck() {
        const container = document.getElementById('selectedDeck');
        if (!container) return;
        container.innerHTML = '';

        const selected = gameState.AvailableCards
                .filter(c => c.IsSelected)
                .sort((a, b) => a.DeckOrder - b.DeckOrder);

        selected.forEach((card, i) => {
                const cardEl = createCardElement(card, card.Index, i + 1);
                container.appendChild(cardEl);
        });
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
        // Browser Mode Fallback
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
                if (!res.success) showAlert(res.message || 'Hiba történt');
        } catch (err) {
                debugLog('Card click error: ' + err.message, 'error');
                showAlert('Hiba történt a kártya kiválasztásakor!');
        }
}

// --- DUNGEON RENDERING ---
function renderDungeons() {
        const container = document.getElementById('dungeonList');
        if (!container) return;
        container.innerHTML = '';

        if (gameState.Dungeons && gameState.Dungeons.length > 0) {
                gameState.Dungeons.forEach(d => {
                        // 1. Wrapper Row
                        const row = document.createElement('div');
                        row.className = 'dungeon-row';

                        // 2. Left Side: Interactive Button
                        const btn = document.createElement('div');
                        btn.className = 'dungeon-btn';
                        btn.onclick = () => onDungeonClick(d.Name);
                        btn.innerHTML = `
                <div class="dungeon-name">${d.Name}</div>
                <div class="dungeon-lbl">KATTINTS A BELÉPÉSHEZ</div>
            `;

                        // 3. Right Side: Static Boss Card
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

async function onDungeonClick(name) {
        showLoadingScreen(async () => {
                if (!window.HybridWebView) {
                        showAlert(`Belépés a kazamatába: ${name} (Demo)`);
                        return;
                }

                try {
                        const result = await window.HybridWebView.InvokeDotNet('OnDungeonSelected', [name]);
                        const res = JSON.parse(result);
                        if (!res.success) showAlert(res.message || 'Nem lehet belépni a kazamatába!');
                } catch (err) {
                        debugLog('Dungeon error: ' + err.message, 'error');
                        showAlert('Hiba történt!');
                }
        });
}

function updateSelectionCounter() {
        const el = document.getElementById('selectionCounter');
        if (el) el.textContent = `Kiválasztva: ${gameState.CurrentDeckSize} / ${gameState.MaxDeckSize}`;
}

// ====================================================================
// MODAL & LOADING SCREEN
// ====================================================================

function showAlert(message) {
        document.getElementById('alertMessage').textContent = message;
        document.getElementById('alertModal').classList.add('show');
}

function closeAlert() {
        document.getElementById('alertModal').classList.remove('show');
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

// ====================================================================
// PAGE NAVIGATION
// ====================================================================

function showMainMenu() {
    window.HybridWebView.InvokeDotNet("SaveGame");
        showLoadingScreen(() => {
            debugLog('→ Back to Main Menu', 'info');
            document.querySelectorAll('.fake-page').forEach(p => p.classList.remove('active'));
            document.getElementById('main-menu').style.display = 'flex';
            hideGameViewElements(); // Fő játék nézet és fejléc gomb elrejtése
        })
}

function hideMainMenu() {
        document.getElementById('main-menu').style.display = 'none';
}

function enterGameMode() {
        hideMainMenu();
        document.querySelectorAll('.fake-page').forEach(p => p.classList.remove('active'));
        showGameViewElements(); // Fő játék nézet és fejléc gomb megjelenítése
        requestGameState();
}

function newGame() { showLoadingScreen(showNewGamePage); }
function loadGame() { showLoadingScreen(showLoadGamePage); }
function editor() { showLoadingScreen(showEditorPage); }

function exit() {
        if (window.HybridWebView) {
                window.HybridWebView.SendRawMessage('ExitProgram');
        } else {
                showAlert("Kilépés... (Csak appban működik)");
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
        if (select.children.length === 1) {
                getTemplatesPlaceholder().then(templates => {
                    templates.forEach(t => {
                        const opt = new Option(t.world.templateName, t.world.worldId);
                        select.add(opt);
                    });
                });
        }
}

async function showLoadGamePage() {
        hideMainMenu();
        document.getElementById('load-game-page').classList.add('active');

        const list = document.getElementById('saveList');
        list.innerHTML = '';

        getSavesPlaceholder().then(saves => {
                saves.forEach(save => {
                        debugLog(save, 'info');
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

// ====================================================================
// GAME LOGIC
// ====================================================================

function startNewGame() {
        const name = document.getElementById('saveName').value.trim();
        const template = document.getElementById('worldTemplate').value;

        if (!name) return showAlert('Add meg a mentés nevét!');
        if (!template) return showAlert('Válassz világ sablont!');

        showLoadingScreen(() => {
                window.HybridWebView.InvokeDotNet("MakeNewGame", {"name":name, "template": template});
                enterGameMode();
                showAlert(`Üdvözöllek, ${name}!`);
        });
}

function loadSave(id) {
    showLoadingScreen(() => {
        window.HybridWebView.InvokeDotNet("LoadGameById", id).then((save) => {
            debugLog(save);
            enterGameMode();
            showAlert(`Üdv újra, ${save.saveName}`);
        });
    });
}

function switchEditorTab(tabId) {
        // 1. Remove active from tabs
        document.querySelectorAll('.editor-tab').forEach(b => b.classList.remove('active'));
        // 2. Remove active from sections
        document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('active'));

        // 3. Find the specific button that was clicked
        const clickedBtn = document.querySelector(`button[onclick="switchEditorTab('${tabId}')"]`);
        if (clickedBtn) clickedBtn.classList.add('active');

        // 4. Activate section
        const section = document.getElementById(`editor-${tabId}`);
        if (section) section.classList.add('active');

        if (tabId == 'sets') {
            // document.getElementById('cardSelectionList')
        }
}

function saveWorld() {
    showAlert('Világ mentve (Demo)');
}

// Add this to your scripts/app.js file

function loadWorld() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
        <h3>Világ Kiválasztása</h3>
        <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    `;

        // List container
        const listContainer = document.createElement('div');
        listContainer.className = 'world-list-container';
        listContainer.id = 'worldList';
        listContainer.innerHTML = ''; // Clear any existing content

        // Load world templates
        getTemplatesPlaceholder().then(worlds => {
            if (!worlds || worlds.length === 0) {
                listContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Nincs elérhető világ sablon</p>';
                modalContent.appendChild(header);
                modalContent.appendChild(listContainer);
                modal.appendChild(modalContent);
                document.body.appendChild(modal);
                return;
            }

            let i = 0;
            worlds.forEach(world => {
                    debugLog(world, 'info');

                    const item = document.createElement('div');
                    item.className = 'world-item-btn';
                    item.onclick = () => loadWorldTemplate(world.id, modal, world.name);

                    item.innerHTML = `
                <div class="world-name">${world.name}</div>
                <div class="world-date"></div>
            `;

                    i++;
                    listContainer.appendChild(item);
            });
            // Append elements
            modalContent.appendChild(header);
            modalContent.appendChild(listContainer);
            modal.appendChild(modalContent);
    
            // Add to document
            document.body.appendChild(modal);
        });

}

// Helper function to load a specific world template by ID
function loadWorldTemplate(worldId, modalElement, worldName) {
        // Close the modal
        modalElement.remove();

        // Here you would load the specific world template into your editor
        // For example, populate editor fields with the world's data
        loadWorldIntoEditor(worldId, worldName);

        // Show success message
        showAlert(`Világ betöltve: ${worldName}`);
}

// Function to load world data into editor based on template ID
function loadWorldIntoEditor(worldId, worldName) {
        // This function should populate your editor with the specific world template's data
        // You'll need to implement this based on what data each template should load

        console.log(`Loading world template: ${worldId} (${worldName})`);

        // Example: Set some editor fields based on the template
        switch (worldId) {
                case 'forest':
                        // Load forest-specific data into editor
                        console.log('Loading Forest template data...');
                        // Example: document.getElementById('worldName').value = 'Sötét Erdő';
                        break;
                case 'cave':
                        // Load cave-specific data into editor
                        console.log('Loading Cave template data...');
                        break;
                case 'volcano':
                        // Load volcano-specific data into editor
                        console.log('Loading Volcano template data...');
                        break;
                default:
                        console.log('Loading generic template data...');
        }

        // Add your actual editor population logic here
        // This could involve loading cards, dungeons, sets, etc. specific to the template
}

// Make sure you have this helper function for debugging
function debugLog(message, level = 'info') {
        if (typeof console !== 'undefined') {
                console[level](message);
        }
}

function showAlert(message) {
        const alertModal = document.createElement('div');
        alertModal.className = 'alert-modal';

        alertModal.innerHTML = `
        <div class="alert-content">
            <div class="alert-message">${message}</div>
            <button class="alert-btn" onclick="this.closest('.alert-modal').remove()">OK</button>
        </div>
    `;

        document.body.appendChild(alertModal);
}

function toggleBossInputs() {
        document.getElementById('bossInputs').style.display =
                document.getElementById('isBoss').checked ? 'block' : 'none';
}

function toggleDungeonInputs() {
        const show = ['Medium', 'Big'].includes(document.getElementById('dungeonType').value);
        // Logic placeholder
}

function initWorldEditor() {
    window.HybridWebView.InvokeDotNet("InitEditor");
}

function createCardPlaceholder() { 
    const cardName = document.getElementById('cardName').value;
    const cardAttack = document.getElementById('cardAttack').value;
    const cardHealth = document.getElementById('cardHealth').value;
    const cardElement = document.getElementById('cardElement').value;

    const isBoss = document.getElementById('isBoss').checked;
    const bossName = document.getElementById('bossName').value;
    const bossProficiency = document.getElementById('bossProficiency').value;
    
    

    window.HybridWebView.InvokeDotNet("CreateCard", {
        "name": cardName,
        "attack": parseInt(cardAttack),
        "health": parseInt(cardHealth),
        "element":cardElement,
        "isBoss": isBoss,
        "bossName": bossName,
        "bossProficiency": bossProficiency
    });

}
function createSetPlaceholder() { showAlert('Szett mentve (Demo)'); }
function createDungeonPlaceholder() { showAlert('Kazamata létrehozva (Demo)'); }

// Data Providers
async function getTemplatesPlaceholder() {
    if (window.HybridWebView) {
        const worlds = await window.HybridWebView.InvokeDotNet("RequestWorlds");
        debugLog(worlds);
        return worlds;
    }

    return [];
}

async function getSavesPlaceholder() {
    const saves = await window.HybridWebView.InvokeDotNet("RequestSaves");
    return saves;
}

// ====================================================================
// INIT & MOCK DATA
// ====================================================================

function requestGameState() {
        if (window.HybridWebView) {
            window.HybridWebView.SendRawMessage('RequestGameState');
        } else {
            debugLog('Browser mode: Loading Mock Data', 'warn');                    
        }       
}


window.addEventListener('DOMContentLoaded', () => {
        debugLog('=== DAMAREEN JS LOADED ===', 'success');
        if (!window.HybridWebView) {
                debugLog('HybridWebView NOT available – running in browser mode', 'warn');
        }

        // Inicializáláskor elrejtjük a játék nézet elemeit, mivel a főmenü aktív
        hideGameViewElements();
        requestGameState();
});