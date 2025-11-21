// Game state
let gameState = null;

// Debug console functions are now in console.js
// We use the global debugLog function

// Update game state from C#
window.updateGameState = function (state) {
        debugLog('=== updateGameState CALLED ===', 'info');
        debugLog('Received game state from C#', 'info');

        gameState = state;

        debugLog(`Cards received: ${state.AvailableCards?.length || 0}`, 'info');
        debugLog(`Dungeons received: ${state.Dungeons?.length || 0}`, 'info');
        debugLog(`Deck size: ${state.CurrentDeckSize}/${state.MaxDeckSize}`, 'info');

        renderUI();
};

// Render the entire UI
function renderUI() {
        if (!gameState) {
                debugLog('No game state available', 'warn');
                return;
        }

        debugLog('Rendering UI...', 'info');

        try {
                renderCards();
                renderDeck();
                renderDungeons();
                updateSelectionCounter();
                debugLog('UI rendered successfully', 'success');
        } catch (error) {
                debugLog(`Error rendering UI: ${error.message}`, 'error');
                console.error(error);
        }
}

// Render card collection
function renderCards() {
        const container = document.getElementById('cardCollection');
        container.innerHTML = '';

        debugLog(`Rendering ${gameState.AvailableCards.length} cards`, 'info');

        gameState.AvailableCards.forEach((card, index) => {
                if (card.IsSelected) {
                        // debugLog(`Skipping selected card: ${card.Name}`, 'info');
                        return; // Skip selected cards in collection
                }

                const cardEl = createCardElement(card, index);
                container.appendChild(cardEl);
        });

        debugLog(`Rendered ${container.children.length} cards in collection`, 'success');
}

// Render selected deck
function renderDeck() {
        const container = document.getElementById('selectedDeck');
        container.innerHTML = '';

        const selectedCards = gameState.AvailableCards.filter(c => c.IsSelected);
        debugLog(`Rendering ${selectedCards.length} cards in deck`, 'info');

        selectedCards.forEach((card, order) => {
                const cardEl = createCardElement(card, card.Index, order + 1);
                container.appendChild(cardEl);
        });
}

// Create a card element
function createCardElement(card, index, order = null) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';

        if (!card.IsOwned) {
                cardEl.classList.add('locked');
        }

        if (card.IsSelected) {
                cardEl.classList.add('selected');
        }

        // Border color based on element
        cardEl.style.borderColor = card.IsSelected ? '#FFD700' : card.ElementColor;

        // Background color
        const bgEl = document.createElement('div');
        bgEl.className = 'card-background';
        bgEl.style.backgroundColor = card.ElementColor;
        cardEl.appendChild(bgEl);

        // Order badge (if selected)
        if (order !== null) {
                const orderEl = document.createElement('div');
                orderEl.className = 'card-order';
                orderEl.textContent = order;
                cardEl.appendChild(orderEl);
        }

        const nameEl = document.createElement('div');
        nameEl.className = 'card-name';
        nameEl.textContent = card.Name;
        cardEl.appendChild(nameEl);

        // Card stats
        const statsEl = document.createElement('div');
        statsEl.className = 'card-stats';

        const attackEl = document.createElement('div');
        attackEl.className = 'card-stat stat-attack';
        attackEl.innerHTML = `⚔️: ${card.Attack}`;
        statsEl.appendChild(attackEl);

        const healthEl = document.createElement('div');
        healthEl.className = 'card-stat stat-health';
        healthEl.innerHTML = `❤️: ${card.Health}`;
        statsEl.appendChild(healthEl);

        cardEl.appendChild(statsEl);

        // Click handler
        if (card.IsOwned) {
                cardEl.onclick = async () => await onCardClick(index);
        }

        return cardEl;
}

// Handle card click
async function onCardClick(cardIndex) {
        debugLog(`Card clicked: index ${cardIndex}`, 'info');

        try {
                const result = await window.HybridWebView.InvokeDotNet('OnCardTapped', [cardIndex]);
                debugLog(`C# response: ${result}`, 'info');

                const response = JSON.parse(result);

                if (!response.success && response.message) {
                        debugLog(`Card click failed: ${response.message}`, 'error');
                        showAlert(response.message);
                } else {
                        debugLog('Card click successful', 'success');
                }
        } catch (error) {
                debugLog(`Error clicking card: ${error.message}`, 'error');
                console.error('Error clicking card:', error);
                showAlert('Hiba történt!');
        }
}

// Render dungeons
function renderDungeons() {
        const container = document.getElementById('dungeonList');
        container.innerHTML = '';

        debugLog(`Rendering ${gameState.Dungeons.length} dungeons`, 'info');

        gameState.Dungeons.forEach(dungeon => {
                const dungeonEl = createDungeonElement(dungeon);
                container.appendChild(dungeonEl);
        });

        debugLog(`Rendered ${container.children.length} dungeons`, 'success');
}

// Create dungeon element
function createDungeonElement(dungeon) {
        const dungeonEl = document.createElement('div');
        dungeonEl.className = 'dungeon-card';
        dungeonEl.onclick = async () => await onDungeonClick(dungeon.Name);

        // Dungeon title
        const titleEl = document.createElement('div');
        titleEl.className = 'dungeon-title';
        titleEl.textContent = dungeon.Name;
        dungeonEl.appendChild(titleEl);

        // Boss info (if exists)
        if (dungeon.HasBoss) {
                const bossEl = document.createElement('div');
                bossEl.className = 'dungeon-boss';

                const bossNameEl = document.createElement('div');
                bossNameEl.className = 'boss-name';
                bossNameEl.textContent = dungeon.BossName;
                bossEl.appendChild(bossNameEl);

                const bossStatsEl = document.createElement('div');
                bossStatsEl.className = 'boss-stats';

                const attackEl = document.createElement('div');
                attackEl.className = 'boss-stat attack';
                attackEl.innerHTML = `⚔️ ${dungeon.BossDamage}`;
                bossStatsEl.appendChild(attackEl);

                const healthEl = document.createElement('div');
                healthEl.className = 'boss-stat health';
                healthEl.innerHTML = `❤️ ${dungeon.BossHealth}`;
                bossStatsEl.appendChild(healthEl);

                bossEl.appendChild(bossStatsEl);
                dungeonEl.appendChild(bossEl);
        }

        return dungeonEl;
}

// Handle dungeon click
async function onDungeonClick(dungeonName) {
        debugLog(`Dungeon clicked: ${dungeonName}`, 'info');

        try {
                const result = await window.HybridWebView.InvokeDotNet('OnDungeonSelected', [dungeonName]);
                debugLog(`C# response: ${result}`, 'info');

                const response = JSON.parse(result);

                if (!response.success && response.message) {
                        debugLog(`Dungeon selection failed: ${response.message}`, 'error');
                        showAlert(response.message);
                } else {
                        debugLog('Dungeon selection successful', 'success');
                }
        } catch (error) {
                debugLog(`Error selecting dungeon: ${error.message}`, 'error');
                console.error('Error selecting dungeon:', error);
                showAlert('Hiba történt!');
        }
}

// Update selection counter
function updateSelectionCounter() {
        const counter = document.getElementById('selectionCounter');
        counter.textContent = `Kiválasztva: ${gameState.CurrentDeckSize} / ${gameState.MaxDeckSize}`;
}

// Show alert modal
function showAlert(message) {
        const modal = document.getElementById('alertModal');
        const messageEl = document.getElementById('alertMessage');
        messageEl.textContent = message;
        modal.classList.add('show');
}

// Close alert modal
function closeAlert() {
        const modal = document.getElementById('alertModal');
        modal.classList.remove('show');
}

// Request game state from C#
function requestGameState() {
        debugLog('Requesting game state from C#...', 'info');
        if (window.HybridWebView) {
                window.HybridWebView.SendRawMessage('RequestGameState');
        }
}

// Initialize
window.addEventListener('DOMContentLoaded', function () {
        debugLog('=== MAIN PAGE LOADED ===', 'info');
        debugLog('DOM Content Loaded', 'success');

        // Check if HybridWebView is available
        if (window.HybridWebView) {
                debugLog('HybridWebView API is available', 'success');
                // Request game state immediately
                requestGameState();
        } else {
                debugLog('HybridWebView API is NOT available!', 'error');
        }

        // Check if all containers exist
        const cardCollection = document.getElementById('cardCollection');
        const selectedDeck = document.getElementById('selectedDeck');
        const dungeonList = document.getElementById('dungeonList');

        debugLog(`Card collection element: ${cardCollection ? 'FOUND' : 'NOT FOUND'}`, cardCollection ? 'success' : 'error');
        debugLog(`Selected deck element: ${selectedDeck ? 'FOUND' : 'NOT FOUND'}`, selectedDeck ? 'success' : 'error');
        debugLog(`Dungeon list element: ${dungeonList ? 'FOUND' : 'NOT FOUND'}`, dungeonList ? 'success' : 'error');

        debugLog('Waiting for game state from C#...', 'warn');
});

// Listen for visibility changes (when navigating back)
document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
                debugLog('Page became visible, requesting game state...', 'info');
                requestGameState();
        }
});

// Main Menu Functions
function newGame() {
        debugLog('New Game clicked', 'info');
        document.getElementById('main-menu').style.display = 'none';
}

function loadGame() {
        debugLog('Load Game clicked', 'info');
}

function editor() {
        debugLog('Editor clicked', 'info');
}

function exit() {
        debugLog('Exit clicked', 'info');
        if (window.HybridWebView) {
                window.HybridWebView.InvokeDotNet('Exit');
        } else {
                console.log('Exit requested (HybridWebView not available)');
        }
}

function showMainMenu() {
        debugLog('Showing Main Menu', 'info');
        document.getElementById('main-menu').style.display = 'flex';
}