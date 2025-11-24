let gameState = {
        currentDeck: null,
        dungeon: null,
        dungeonDeck: null,
        currentCard: null,
        enemyCard: null,
        showStart: true,
        showCurrent: false,
        showEnemy: false,
        showEnd: false
};

document.addEventListener('DOMContentLoaded', function () {
        debugLog('=== GAME PAGE LOADED ===', 'info');

        // Bind buttons
        const startButton = document.getElementById('startButton');
        const backButton = document.getElementById('backButton');

        if (startButton) {
                startButton.addEventListener('click', startGameFromJS);
                debugLog('Start button bound', 'success');
        } else {
                debugLog('Start button not found!', 'error');
        }

        if (backButton) {
                backButton.addEventListener('click', navigateBack);
                debugLog('Back button bound', 'success');
        }

        // Listen for messages from C#
        window.addEventListener('HybridWebViewMessageReceived', function (e) {
                const message = e.detail.message;
                debugLog(`Received from C#: ${message}`, 'info');

                const parts = message.split('|');
                if (parts.length >= 2) {
                        const type = parts[0];
                        const data = parts.slice(1).join('|');
                        switch (type) {
                                case 'initializeGame':
                                        const initData = JSON.parse(data);
                                        document.getElementById('topLabel').textContent = initData.DungeonName;
                                        debugLog(`Game initialized: ${initData.DungeonName}`, 'success');
                                        break;
                                case 'startGame':
                                        const gameData = JSON.parse(data);
                                        gameState.currentDeck = gameData.PlayerDeck;
                                        gameState.dungeon = gameData.Dungeon;
                                        gameState.dungeonDeck = gameData.DungeonDeck;
                                        renderEnemyCards();
                                        renderPlayerCards();
                                        document.getElementById('historyContainer').innerHTML = '';
                                        gameState.showStart = false;
                                        document.getElementById('startOverlay').style.display = 'none';
                                        debugLog('Game started', 'success');
                                        break;
                                case 'fightEvent':
                                        const event = JSON.parse(data);
                                        handleFightEvent(event);
                                        break;
                                case 'gameOver':
                                        const result = JSON.parse(data);
                                        let rewardText = "";
                                        if (result.Success) {
                                                rewardText = result.Reward;
                                        }
                                        showEndScreen(result, rewardText);
                                        break;
                                case 'navigateBack':
                                        debugLog("JS received navigateBack command", 'info');
                                        break;
                                default:
                                        debugLog(`Unknown message type from C#: ${type}`, 'warn');
                        }
                } else {
                        debugLog(`Received simple message from C#: ${message}`, 'info');
                        if (message === 'navigateBack') {
                                debugLog("JS received navigateBack command (simple)", 'info');
                        }
                }
        });
});

function renderEnemyCards() {
        const container = document.getElementById('enemyDeck');
        container.innerHTML = '';
        if (gameState.dungeon.HasBoss) {
                renderBossCard();
        }
        renderEnemyNormalCards();
}

function renderBossCard() {
        if (gameState.enemyCard && gameState.enemyCard.IsBoss) return;
        const boss = gameState.dungeon.boss;
        const cardElement = createCardElement(boss, true, true);
        document.getElementById('enemyDeck').appendChild(cardElement);
}

function renderEnemyNormalCards() {
        if (gameState.enemyCard && gameState.enemyCard.IsBoss) return;

        const reversedCards = [...gameState.dungeonDeck].reverse();
        for (const card of reversedCards) {
                if (gameState.enemyCard && card.Name === gameState.enemyCard.Name) break;
                const cardElement = createCardElement(card, false, true);
                document.getElementById('enemyDeck').appendChild(cardElement);
        }
}

function renderPlayerCards() {
        const container = document.getElementById('playerDeck');
        container.innerHTML = '';

        const reversedCards = [...gameState.currentDeck.Cards].reverse();
        for (const card of reversedCards) {
                if (gameState.currentCard && card.Name === gameState.currentCard.Name) break;
                const cardElement = createCardElement(card, false, false);
                document.getElementById('playerDeck').appendChild(cardElement);
        }
}

function createCardElement(card, isBoss, isEnemy) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${isBoss ? 'boss' : ''}`;

        const placeholderClass = isEnemy ? 'enemy-placeholder' : 'player-placeholder';
        cardDiv.innerHTML = `
    <div class="card-inner">
        <div class="card-name">${card.Name}</div>
        <div class="card-image-placeholder ${placeholderClass}"></div>
        <div class="stats">
            <div class="stat damage">
                <span>⚔️</span> ${card.Damage}
            </div>
            <div class="stat health">
                <span>❤️</span> ${card.Health}
            </div>
        </div>
    </div>
`;
        if (card.ElementColor) {
                cardDiv.style.background = `linear-gradient(135deg, ${card.ElementColor} 0%, #222 100%)`;
        }
        return cardDiv;
}

function startGameFromJS() {
        debugLog('Start button clicked, sending request to C#', 'info');
        window.HybridWebView.SendRawMessage('startGameRequested');
}

function addHistoryEntry(text) {
        const historyContainer = document.getElementById('historyContainer');
        const entry = document.createElement('div');
        entry.className = 'history-entry';
        entry.textContent = text;
        historyContainer.appendChild(entry);
        historyContainer.scrollTop = historyContainer.scrollHeight;
}

function updateRoundText(round) {
        document.getElementById('roundText').textContent = `${round}. kör`;
}

// FIX: Megbízható, CSS alapú damage popup animáció
function showDamageLabel(damage, isPlayer) {
        const label = document.getElementById('damagePopupLabel');
        if (!label) return;

        // Használjuk a támadó színét a sebzéshez (pl. kazamata támad = piros, játékos támad = arany)
        label.style.color = isPlayer ? 'var(--accent-red)' : 'var(--accent-gold)';
        label.textContent = `-${damage}`;

        // 1. Reseteljük az animációt és biztosítsuk a láthatóságot
        label.classList.remove('animate-damage-popup');
        label.style.display = 'block';

        // 2. Trigger reflow - kötelező, hogy az eltávolított class újra indulhasson
        void label.offsetWidth;

        // 3. Start animation (1s duration from CSS)
        label.classList.add('animate-damage-popup');

        // 4. Eltüntetés és reset az animáció befejezése után (1000ms a CSS-ből)
        setTimeout(() => {
                label.style.display = 'none';
                label.classList.remove('animate-damage-popup');
        }, 1000);
}

function showEndScreen(result, rewardText = "") {
        gameState.showEnd = true;
        document.getElementById('endScreen').style.display = 'flex';
        window.HybridWebView.InvokeDotNet("SaveGame");
        if (result.Success) {
                document.getElementById('endText').textContent = 'Nyertél!';
                document.getElementById('endText').style.color = ''; // CSS gradient handles color
                document.getElementById('endReward').textContent = rewardText;
        } else {
                document.getElementById('endText').textContent = 'Vesztettél!';
                document.getElementById('endText').style.color = 'var(--accent-red)'; // Fallback/consistency
        }
}

function navigateBack() {
        debugLog('Back button clicked, sending request to C#', 'info');
        window.HybridWebView.SendRawMessage('navigateBack');
}

function updateArenaCard(elementId, card, isBoss, isEnemy) {
        const arenaCard = document.getElementById(elementId);
        arenaCard.style.display = 'flex';

        // Update stats
        const healthEl = isEnemy ?
                document.getElementById('enemyHealth') : document.getElementById('playerHealth');
        const damageEl = isEnemy ? document.getElementById('enemyDamage') : document.getElementById('playerDamage');

        if (healthEl) healthEl.textContent = card.Health;
        if (damageEl) damageEl.textContent = card.Damage;

        // Update name
        arenaCard.querySelector('.card-name').textContent = card.Name;
        // Update classes
        if (isBoss) arenaCard.classList.add('boss');
        else arenaCard.classList.remove('boss');
        // Update color
        if (card.ElementColor) {
                arenaCard.style.background = `linear-gradient(135deg, ${card.ElementColor} 0%, #222 100%)`;
        }

        // Ensure placeholder is correct
        const placeholder = arenaCard.querySelector('.card-image-placeholder');
        placeholder.className = 'card-image-placeholder';
        placeholder.classList.add(isEnemy ? 'enemy-placeholder' : 'player-placeholder');
}

function handleFightEvent(event) {
        debugLog(`Handling fight event: ${event.event_name}`, 'info');
        if (event.event_name === "round") {
                updateRoundText(event.values.round);
                addHistoryEntry(`${event.values.round}. Kör`);
        } else if (event.event_name === "round_over") {
                addHistoryEntry(`${event.values.round}. kör vége`);
        } else if (event.event_name === "game:select") {
                gameState.enemyCard = event.values.card;
                const isBoss = event.values.isBoss || false;

                updateArenaCard('arenaEnemyCard', gameState.enemyCard, isBoss, true);
                if (window.animateDraw) window.animateDraw('arenaEnemyCard');

                addHistoryEntry(`Kazamata kijátszotta: ${gameState.enemyCard.Name}`);
                renderEnemyCards();
        } else if (event.event_name === "player:select") {
                gameState.currentCard = event.values.card;
                updateArenaCard('arenaPlayerCard', gameState.currentCard, false, false);
                if (window.animateDraw) window.animateDraw('arenaPlayerCard');

                addHistoryEntry(`Játékos kijátszotta: ${gameState.currentCard.Name}`);
                renderPlayerCards();
        } else if (event.event_name === "game:attack") {
                const damage = event.values.damage;
                const targetCard = event.values.card;

                document.getElementById('playerHealth').textContent = targetCard.Health;
                addHistoryEntry(`Kazamata(${gameState.enemyCard.Name}) támad: ${damage} a ${targetCard.Name}(Játékos), élete maradt: ${targetCard.Health}`);

                if (window.animateAttack) window.animateAttack('arenaEnemyCard', 'arenaPlayerCard');
                if (window.animateDamage) setTimeout(() => window.animateDamage('arenaPlayerCard'), 250); // Sync with impact
                showDamageLabel(damage, true); // isPlayer = true, mert a játékost sebezte

                if (targetCard.Health <= 0) {
                        if (window.animateDeath) {
                                setTimeout(() => window.animateDeath('arenaPlayerCard'), 800);
                        } else {
                                setTimeout(() => {
                                        document.getElementById('arenaPlayerCard').style.display = 'none';
                                }, 500);
                        }
                        addHistoryEntry(`${gameState.currentCard.Name}(Játékos) kártya legyőzve!`);
                }
        } else if (event.event_name === "player:attack") {
                const damage = event.values.damage;
                const targetCard = event.values.enemy;

                document.getElementById('enemyHealth').textContent = targetCard.Health;
                addHistoryEntry(`Játékos(${gameState.currentCard.Name}) támad: ${damage} a ${targetCard.Name}(Kazamata), élete maradt: ${targetCard.Health}`);

                if (window.animateAttack) window.animateAttack('arenaPlayerCard', 'arenaEnemyCard');
                if (window.animateDamage) setTimeout(() => window.animateDamage('arenaEnemyCard'), 250); // Sync with impact
                showDamageLabel(damage, false); // isPlayer = false, mert az ellenséget sebezte

                if (targetCard.Health <= 0) {
                        if (window.animateDeath) {
                                setTimeout(() => window.animateDeath('arenaEnemyCard'), 800);
                        } else {
                                setTimeout(() => {
                                        document.getElementById('arenaEnemyCard').style.display = 'none';
                                }, 500);
                        }
                        addHistoryEntry(`${targetCard.Name}(Kazamata) legyőzve!`);
                }
        }
}