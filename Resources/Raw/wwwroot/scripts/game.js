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

// Track pending animation end times (ms since epoch) to delay selects and attacks
let pendingAnimations = {};

function debugLog(message, type) {
        console.log(`[${type.toUpperCase()}] ${message}`);
}

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
                                case 'gameOver': {
                                        const result = JSON.parse(data);
                                        let rewardText = "";
                                        if (result.Success) {
                                                rewardText = result.Reward;
                                        }
                                        // Wait dynamically for all animations (including finisher) to end
                                        waitForAnimations(() => {
                                                showEndScreen(result, rewardText);
                                        });
                                        break;
                                }
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

function waitForAnimations(callback) {
        const check = () => {
                const now = Date.now();
                let maxPending = 0;
                for (const time of Object.values(pendingAnimations)) {
                        if (time > maxPending) maxPending = time;
                }
                if (maxPending <= now) {
                        debugLog('All animations completed, proceeding with callback', 'debug');
                        callback();
                } else {
                        debugLog(`Still pending animations until ${maxPending}, checking again in 50ms`, 'debug');
                        setTimeout(check, 50);
                }
        };
        check();
}

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

// Megbízható, CSS alapú damage popup animáció (unchanged)
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
        if (!arenaCard) return;
        arenaCard.style.display = 'flex';

        // FIXED: Clean animation classes before update to reset transforms/opacity
        arenaCard.classList.remove('attack-left', 'attack-right', 'damage-shake', 'death-fade');

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
        if (placeholder) {
                placeholder.className = 'card-image-placeholder';
                placeholder.classList.add(isEnemy ? 'enemy-placeholder' : 'player-placeholder');
        }
}

// Helper for delayed updates (handles pending anims + draw)
function delayedUpdate(elementId, updateFn, drawId, historyFn, renderFn, baseDelay = 0) {
        const now = Date.now();
        const pendingTime = pendingAnimations[elementId] || 0;
        const actualDelay = Math.max(baseDelay, pendingTime > now ? pendingTime - now : 0);
        debugLog(`delayedUpdate for ${elementId}: pendingTime=${pendingTime}, now=${now}, actualDelay=${actualDelay}ms`, 'debug');

        setTimeout(() => {
                debugLog(`delayedUpdate timeout fired for ${elementId} after ${actualDelay}ms`, 'debug');
                updateFn();
                if (window.animateDraw && drawId) {
                        const el = document.getElementById(drawId);
                        if (el) {
                                debugLog(`Calling animateDraw on ${drawId}`, 'debug');
                                // Clean conflicting classes before draw
                                el.classList.remove('attack-left', 'attack-right', 'damage-shake', 'death-fade');
                                window.animateDraw(drawId);
                                // Track pending for draw anim (adjust 1000ms if your CSS duration differs)
                                const drawEndTime = Date.now() + 1000;
                                pendingAnimations[drawId] = drawEndTime;
                                debugLog(`Set pending draw anim end for ${drawId}: ${drawEndTime}`, 'debug');
                                setTimeout(() => {
                                        delete pendingAnimations[drawId];
                                        debugLog(`Cleared pending draw anim for ${drawId}`, 'debug');
                                }, 1000);
                        } else {
                                debugLog(`Element ${drawId} not found for animateDraw`, 'warn');
                        }
                }
                if (historyFn) {
                        debugLog(`Calling historyFn for ${elementId}`, 'debug');
                        historyFn();
                }
                if (renderFn) {
                        debugLog(`Calling renderFn for ${elementId}`, 'debug');
                        renderFn();
                }
                debugLog(`delayedUpdate completed for ${elementId}`, 'debug');
        }, actualDelay);
}

// Helper for delayed attacks to avoid overlap with prior damage-shake
function delayedAttack(attackerId, targetId, attackClass, damage, targetCard, historyText, isPlayerAttack, baseDelay = 0) {
        const now = Date.now();
        const pendingTime = pendingAnimations[attackerId] || 0;
        const actualDelay = Math.max(baseDelay, pendingTime > now ? pendingTime - now : 0);
        debugLog(`delayedAttack for ${attackerId}: pendingTime=${pendingTime}, now=${now}, actualDelay=${actualDelay}ms`, 'debug');

        const isLethal = targetCard.Health <= 0;

        setTimeout(() => {
                debugLog(`delayedAttack timeout fired for ${attackerId} after ${actualDelay}ms`, 'debug');

                // Update health immediately (before anims)
                const healthElId = targetId === 'arenaEnemyCard' ? 'enemyHealth' : 'playerHealth';
                document.getElementById(healthElId).textContent = targetCard.Health;
                addHistoryEntry(historyText);

                // Trigger attack anim on attacker
                debugLog(`Triggering ${attackClass} on ${attackerId}`, 'debug');
                triggerAnimation(attackerId, attackClass);

                // --- NEW VFX INTEGRATION ---
                // Get attacker element color
                let attackerColor = null;
                if (isPlayerAttack) {
                        // Player attacking: currentCard
                        attackerColor = gameState.currentCard ? gameState.currentCard.ElementColor : null;
                } else {
                        // Enemy attacking: enemyCard
                        attackerColor = gameState.enemyCard ? gameState.enemyCard.ElementColor : null;
                }

                if (window.playElementalAttack && attackerColor) {
                        debugLog(`Playing Elemental Attack: ${attackerColor}`, 'info');

                        if (isLethal && window.playElementalFinisher) {
                                debugLog(`Triggering FINISHER for ${attackerColor}`, 'info');
                                // Determine finisher duration based on element type
                                const elementType = getElementTypeFromColor(attackerColor);
                                const finisherDurations = {
                                        'FIRE': 1500,
                                        'WATER': 1700,
                                        'EARTH': 1300,
                                        'AIR': 1500,
                                        'NONE': 1000  // Fallback
                                };
                                const finisherDuration = (finisherDurations[elementType] || 1000) + 200; // +200ms buffer
                                const finisherEndTime = Date.now() + finisherDuration;
                                pendingAnimations['finisher'] = Math.max(pendingAnimations['finisher'] || 0, finisherEndTime);
                                debugLog(`Set pending finisher end for ${elementType}: ${finisherEndTime} (${finisherDuration}ms)`, 'debug');
                                setTimeout(() => {
                                        delete pendingAnimations['finisher'];
                                        debugLog(`Cleared pending finisher for ${elementType}`, 'debug');
                                }, finisherDuration);

                                window.playElementalFinisher(attackerId, targetId, attackerColor);

                                // For lethal: add death history immediately
                                const deathText = targetId === 'arenaEnemyCard' ? `${targetCard.Name}(Kazamata) legyőzve!` : `${gameState.currentCard ? gameState.currentCard.Name : targetCard.Name}(Játékos) kártya legyőzve!`;
                                addHistoryEntry(deathText);

                                // Skip damage-shake, damage label, and death-fade for finisher
                                debugLog(`Skipping damage-shake and death-fade for lethal finisher on ${targetId}`, 'debug');
                        } else {
                                // Normal attack
                                window.playElementalAttack(attackerId, targetId, attackerColor);
                        }
                }
                // ---------------------------

                // For non-lethal attacks only: Damage shake + label on target after 250ms
                if (!isLethal) {
                        setTimeout(() => {
                                debugLog(`Triggering damage-shake on ${targetId} after 250ms`, 'debug');
                                triggerAnimation(targetId, 'damage-shake');
                                showDamageLabel(damage, !isPlayerAttack);  // isPlayer=false for game:attack (red), true for player:attack (gold)

                                // Death fade if needed, 550ms after damage (total 800ms from attack start)
                                if (targetCard.Health <= 0) {
                                        setTimeout(() => {
                                                debugLog(`Triggering death-fade on ${targetId} after 800ms from attack`, 'debug');
                                                triggerAnimation(targetId, 'death-fade');
                                                const deathText = targetId === 'arenaEnemyCard' ? `${targetCard.Name}(Kazamata) legyőzve!` : `${gameState.currentCard ? gameState.currentCard.Name : targetCard.Name}(Játékos) kártya legyőzve!`;
                                                addHistoryEntry(deathText);
                                        }, 550);
                                }
                        }, 250);
                }

                debugLog(`delayedAttack completed for ${attackerId}`, 'debug');
        }, actualDelay);
}

function getElementTypeFromColor(hexColor) {
        if (!hexColor) return 'NONE';
        const color = hexColor.toUpperCase();

        const ELEMENT_COLORS = {
                FIRE: '#CD5C5C',   // IndianRed
                WATER: '#1E90FF',  // DodgerBlue
                AIR: '#ADD8E6',    // LightBlue
                EARTH: '#556B2F'   // DarkOliveGreen
        };

        if (color === ELEMENT_COLORS.FIRE) return 'FIRE';
        if (color === ELEMENT_COLORS.WATER) return 'WATER';
        if (color === ELEMENT_COLORS.AIR) return 'AIR';
        if (color === ELEMENT_COLORS.EARTH) return 'EARTH';

        return 'NONE';
}

function handleFightEvent(event) {
        debugLog(`Handling fight event: ${event.event_name} at ${Date.now()}`, 'info');
        if (event.event_name === "round") {
                updateRoundText(event.values.round);
                addHistoryEntry(`${event.values.round}. Kör`);
        } else if (event.event_name === "round_over") {
                addHistoryEntry(`${event.values.round}. kör vége`);
        } else if (event.event_name === "result") {
                // Handle result event (from log)
                debugLog(`Fight result: ${event.values.result}`, 'info');
                // Optionally parse and show early, but gameOver follows
        } else if (event.event_name === "game:select") {
                debugLog(`Received game:select, setting up delay for arenaEnemyCard`, 'debug');
                gameState.enemyCard = event.values.card;
                const isBoss = event.values.isBoss || false;
                const updateFn = () => {
                        debugLog(`Updating arenaEnemyCard for ${gameState.enemyCard.Name}`, 'debug');
                        updateArenaCard('arenaEnemyCard', gameState.enemyCard, isBoss, true);
                };
                delayedUpdate('arenaEnemyCard', updateFn, 'arenaEnemyCard',
                        () => addHistoryEntry(`Kazamata kijátszotta: ${gameState.enemyCard.Name}`),
                        () => renderEnemyCards());
        } else if (event.event_name === "player:select") {
                debugLog(`Received player:select, setting up delay for arenaPlayerCard`, 'debug');
                gameState.currentCard = event.values.card;
                const updateFn = () => {
                        debugLog(`Updating arenaPlayerCard for ${gameState.currentCard.Name}`, 'debug');
                        updateArenaCard('arenaPlayerCard', gameState.currentCard, false, false);
                };
                delayedUpdate('arenaPlayerCard', updateFn, 'arenaPlayerCard',
                        () => addHistoryEntry(`Játékos kijátszotta: ${gameState.currentCard.Name}`),
                        () => renderPlayerCards());
        } else if (event.event_name === "game:attack") {
                debugLog(`Received game:attack, damage=${event.values.damage}`, 'debug');
                const damage = event.values.damage;
                const targetCard = event.values.card;
                const historyText = `Kazamata(${gameState.enemyCard.Name}) támad: ${damage} a ${targetCard.Name}(Játékos), élete maradt: ${targetCard.Health}`;

                delayedAttack('arenaEnemyCard', 'arenaPlayerCard', 'attack-right', damage, targetCard, historyText, false);
        } else if (event.event_name === "player:attack") {
                debugLog(`Received player:attack, damage=${event.values.damage}`, 'debug');
                const damage = event.values.damage;
                const targetCard = event.values.enemy;
                const historyText = `Játékos(${gameState.currentCard.Name}) támad: ${damage} a ${targetCard.Name}(Kazamata), élete maradt: ${targetCard.Health}`;

                delayedAttack('arenaPlayerCard', 'arenaEnemyCard', 'attack-left', damage, targetCard, historyText, true);
        }
}

// FIXED: Robust trigger with per-class durations + pending tracking
function triggerAnimation(elementId, animationClass) {
        const element = document.getElementById(elementId);
        if (!element) {
                debugLog(`Element ${elementId} not found for ${animationClass}`, 'warn');
                return;
        }

        // FIXED: Animation durations matching CSS
        const durations = {
                'attack-right': 500,
                'attack-left': 500,
                'damage-shake': 500,
                'death-fade': 800
        };
        const duration = durations[animationClass] || 1000;

        debugLog(`Starting ${animationClass} on ${elementId} at ${Date.now()} (duration: ${duration}ms)`, 'debug');

        // Remove first to restart cleanly
        element.classList.remove(animationClass);
        void element.offsetWidth; // Trigger reflow

        element.classList.add(animationClass);

        const endTime = Date.now() + duration;
        pendingAnimations[elementId] = Math.max(pendingAnimations[elementId] || 0, endTime);  // Take max if overlapping
        debugLog(`Set pending end for ${elementId} (${animationClass}): ${endTime} (max with existing)`, 'debug');

        // For death-fade, don't remove class (keep forwards state until next update cleans it)
        if (animationClass !== 'death-fade') {
                setTimeout(() => {
                        // Only remove if element still exists (safe guard)
                        const currentEl = document.getElementById(elementId);
                        if (currentEl === element) {
                                element.classList.remove(animationClass);
                                debugLog(`Ended ${animationClass} on ${elementId} at ${Date.now()}`, 'debug');
                        } else {
                                debugLog(`Element ${elementId} changed during ${animationClass}, skipping cleanup`, 'warn');
                        }
                        // Clear only if no later pending
                        if (pendingAnimations[elementId] <= Date.now()) {
                                delete pendingAnimations[elementId];
                                debugLog(`Cleared pending for ${elementId}`, 'debug');
                        }
                }, duration);
        } else {
                // For death, clear pending after duration but keep class
                setTimeout(() => {
                        // Clear only if no later pending
                        if (pendingAnimations[elementId] <= Date.now()) {
                                delete pendingAnimations[elementId];
                                debugLog(`Cleared pending for ${elementId} (death-fade kept for forwards)`, 'debug');
                        }
                }, duration);
        }
}