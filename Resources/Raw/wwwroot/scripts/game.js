let gameState = {
        currentDeck: null,
        dungeon: null,
        dungeonDeck: null,
        currentCard: null,
        enemyCard: null,
        showStart: true,
        showCurrent: false,
        showEnemy: false,
        showEnd: false,
        enemyPowercards: [],
        playerPowercards: []
};

// Track pending animation end times (ms since epoch) to delay selects and attacks
let pendingAnimations = {};

// Placeholder powercard templates for testing
const PLACEHOLDER_POWERCARDS = [
        { name: "Tűzgolyó", type: "InstantDamage", value: 3, duration: 0, icon: "🔥", description: "Azonnali 3 sebzés" },
        { name: "Gyógyító Aura", type: "Heal", value: 2, duration: 3, icon: "💚", description: "3 körön át +2 gyógyítás" },
        { name: "Acélpajzs", type: "Shield", value: 4, duration: 2, icon: "🛡️", description: "2 körön át +4 védelem" },
        { name: "Erőnövelés", type: "DamageBuff", value: 50, duration: 2, icon: "💥", description: "2 körön át +50% sebzés" },
        { name: "Villámcsapás", type: "InstantDamage", value: 5, duration: 0, icon: "⚡", description: "Azonnali 5 sebzés" },
        { name: "Regeneráció", type: "Heal", value: 1, duration: 5, icon: "🌿", description: "5 körön át +1 gyógyítás" },
        { name: "Jégpajzs", type: "Shield", value: 3, duration: 3, icon: "❄️", description: "3 körön át +3 védelem" },
        { name: "Vérszomj", type: "DamageBuff", value: 30, duration: 3, icon: "🩸", description: "3 körön át +30% sebzés" }
];

let isRolling = false;

function debugLog(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
}

document.addEventListener('DOMContentLoaded', function () {
        debugLog('=== GAME PAGE LOADED ===', 'info');
        const player = new AudioPlayer({
                musicPath: './sound/music',
                sfxPath: './sound/effects',
                corner: 'bottom-right',
                theme: 'dark',
                accentColor: '#ff2a6d'
        });

        const startButton = document.getElementById('startButton');
        const backButton = document.getElementById('backButton');

        if (startButton) {
                // FIX: play SFX on click, not on load
                startButton.addEventListener('click', () => {
                        player.playSfx('StartClick.wav');
                        startGameFromJS();
                });
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
                                case 'initializeGame': {
                                        const initData = JSON.parse(data);
                                        const topLabel = document.getElementById('topLabel');
                                        if (topLabel) {
                                                topLabel.textContent = initData.DungeonName;
                                        }
                                        debugLog(`Game initialized: ${initData.DungeonName}`, 'success');
                                        break;
                                }
                                case 'startGame': {
                                        const gameData = JSON.parse(data);
                                        gameState.currentDeck = gameData.PlayerDeck;
                                        gameState.dungeon = gameData.Dungeon;
                                        gameState.dungeonDeck = gameData.DungeonDeck;
                                        renderEnemyCards();
                                        renderPlayerCards();
                                        const history = document.getElementById('historyContainer');
                                        if (history) history.innerHTML = '';
                                        gameState.showStart = false;
                                        const startOverlay = document.getElementById('startOverlay');
                                        if (startOverlay) startOverlay.style.display = 'none';
                                        debugLog('Game started', 'success');
                                        break;
                                }
                                case 'fightEvent': {
                                        const event = JSON.parse(data);
                                        handleFightEvent(event);
                                        break;
                                }
                                case 'gameOver': {
                                        const result = JSON.parse(data);
                                        let rewardText = "";
                                        if (result.Success) {
                                                rewardText = result.Reward;
                                        }
                                        debugLog(`Game over received. Success = ${result.Success}`, 'info');
                                        // FIX: actually show end screen
                                        showEndScreen(result, rewardText);
                                        break;
                                }
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
        if (!container) return;

        container.innerHTML = '';

        // FIX: guard against null dungeon
        if (gameState.dungeon && gameState.dungeon.HasBoss) {
                renderBossCard();
        }
        renderEnemyNormalCards();
}

function renderBossCard() {
        if (gameState.enemyCard && gameState.enemyCard.IsBoss) return;
        if (!gameState.dungeon) return;

        // FIX: use PascalCase Boss to match HasBoss
        const boss = gameState.dungeon.Boss || gameState.dungeon.boss;
        if (!boss) {
                debugLog('Dungeon has HasBoss but Boss is missing', 'warn');
                return;
        }

        const cardElement = createCardElement(boss, true, true);
        const enemyDeck = document.getElementById('enemyDeck');
        if (enemyDeck) {
                enemyDeck.appendChild(cardElement);
        }
}

function renderEnemyNormalCards() {
        if (!gameState.dungeonDeck) return;
        if (gameState.enemyCard && gameState.enemyCard.IsBoss) return;

        const reversedCards = [...gameState.dungeonDeck].reverse();
        const enemyDeck = document.getElementById('enemyDeck');
        if (!enemyDeck) return;

        for (const card of reversedCards) {
                if (gameState.enemyCard && card.Name === gameState.enemyCard.Name) break;
                const cardElement = createCardElement(card, false, true);
                enemyDeck.appendChild(cardElement);
        }
}

function renderPlayerCards() {
        const container = document.getElementById('playerDeck');
        if (!container || !gameState.currentDeck || !gameState.currentDeck.Cards) return;

        container.innerHTML = '';

        const reversedCards = [...gameState.currentDeck.Cards].reverse();
        for (const card of reversedCards) {
                if (gameState.currentCard && card.Name === gameState.currentCard.Name) break;
                const cardElement = createCardElement(card, false, false);
                container.appendChild(cardElement);
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
        if (window.HybridWebView && window.HybridWebView.SendRawMessage) {
                window.HybridWebView.SendRawMessage('startGameRequested');
        } else {
                debugLog('HybridWebView not available', 'error');
        }
}

function addHistoryEntry(text) {
        const historyContainer = document.getElementById('historyContainer');
        if (!historyContainer) return;

        const entry = document.createElement('div');
        entry.className = 'history-entry';
        entry.textContent = text;
        historyContainer.appendChild(entry);
        historyContainer.scrollTop = historyContainer.scrollHeight;
}

function updateRoundText(round) {
        const roundText = document.getElementById('roundText');
        if (roundText) {
                roundText.textContent = `${round}. kör`;
        }
}

// Megbízható, CSS alapú damage popup animáció (unchanged)
function showDamageLabel(damage, isPlayer) {
        const label = document.getElementById('damagePopupLabel');
        if (!label) return;

        // Használjuk a támadó színét a sebzéshez (pl. kazamata támad = piros, játékos támad = arany)
        label.style.color = isPlayer ? 'var(--accent-red)' : 'var(--accent-gold)';
        label.textContent = `-${damage}`;

        label.classList.remove('animate-damage-popup');
        label.style.display = 'block';

        void label.offsetWidth;

        label.classList.add('animate-damage-popup');

        setTimeout(() => {
                label.style.display = 'none';
                label.classList.remove('animate-damage-popup');
        }, 1000);
}

function showEndScreen(result, rewardText = "") {
        gameState.showEnd = true;
        const endScreen = document.getElementById('endScreen');
        if (endScreen) {
                endScreen.style.display = 'flex';
        }

        if (window.HybridWebView && window.HybridWebView.InvokeDotNet) {
                window.HybridWebView.InvokeDotNet("SaveGame");
        }

        const endText = document.getElementById('endText');
        const endReward = document.getElementById('endReward');

        if (result.Success) {
                if (endText) {
                        endText.textContent = 'Nyertél!';
                        endText.style.color = ''; // CSS gradient handles color
                }
                if (endReward) {
                        endReward.textContent = rewardText;
                }
        } else {
                if (endText) {
                        endText.textContent = 'Vesztettél!';
                        endText.style.color = 'var(--accent-red)'; // Fallback/consistency
                }
                if (endReward) {
                        endReward.textContent = '';
                }
        }
}

function navigateBack() {
        debugLog('Back button clicked, sending request to C#', 'info');
        if (window.HybridWebView && window.HybridWebView.SendRawMessage) {
                window.HybridWebView.SendRawMessage('navigateBack');
        }
}

function updateArenaCard(elementId, card, isBoss, isEnemy) {
        const arenaCard = document.getElementById(elementId);
        if (!arenaCard || !card) return;
        arenaCard.style.display = 'flex';

        // Clean animation classes before update to reset transforms/opacity
        arenaCard.classList.remove('attack-left', 'attack-right', 'damage-shake', 'death-fade');

        const healthEl = isEnemy ?
                document.getElementById('enemyHealth') : document.getElementById('playerHealth');
        const damageEl = isEnemy ? document.getElementById('enemyDamage') : document.getElementById('playerDamage');

        if (healthEl) healthEl.textContent = card.Health;
        if (damageEl) damageEl.textContent = card.Damage;

        const nameEl = arenaCard.querySelector('.card-name');
        if (nameEl) {
                nameEl.textContent = card.Name;
        }

        if (isBoss) arenaCard.classList.add('boss');
        else arenaCard.classList.remove('boss');

        if (card.ElementColor) {
                arenaCard.style.background = `linear-gradient(135deg, ${card.ElementColor} 0%, #222 100%)`;
        }

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
                                el.classList.remove('attack-left', 'attack-right', 'damage-shake', 'death-fade');
                                window.animateDraw(drawId);
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

                const healthElId = targetId === 'arenaEnemyCard' ? 'enemyHealth' : 'playerHealth';
                const healthEl = document.getElementById(healthElId);
                if (healthEl) {
                        healthEl.textContent = targetCard.Health;
                }
                addHistoryEntry(historyText);

                debugLog(`Triggering ${attackClass} on ${attackerId}`, 'debug');
                triggerAnimation(attackerId, attackClass);

                let attackerColor = null;
                if (isPlayerAttack) {
                        attackerColor = gameState.currentCard ? gameState.currentCard.ElementColor : null;
                } else {
                        attackerColor = gameState.enemyCard ? gameState.enemyCard.ElementColor : null;
                }

                if (window.playElementalAttack && attackerColor) {
                        debugLog(`Playing Elemental Attack: ${attackerColor}`, 'info');

                        if (isLethal && window.playElementalFinisher) {
                                debugLog(`Triggering FINISHER for ${attackerColor}`, 'info');
                                const elementType = getElementTypeFromColor(attackerColor);
                                const finisherDurations = {
                                        'FIRE': 1500,
                                        'WATER': 1700,
                                        'EARTH': 1300,
                                        'AIR': 1500,
                                        'NONE': 1000
                                };
                                const finisherDuration = (finisherDurations[elementType] || 1000) + 200;
                                const finisherEndTime = Date.now() + finisherDuration;
                                pendingAnimations['finisher'] = Math.max(pendingAnimations['finisher'] || 0, finisherEndTime);
                                debugLog(`Set pending finisher end for ${elementType}: ${finisherEndTime} (${finisherDuration}ms)`, 'debug');
                                setTimeout(() => {
                                        delete pendingAnimations['finisher'];
                                        debugLog(`Cleared pending finisher for ${elementType}`, 'debug');
                                }, finisherDuration);

                                window.playElementalFinisher(attackerId, targetId, attackerColor);

                                const deathText = targetId === 'arenaEnemyCard'
                                        ? `${targetCard.Name}(Kazamata) legyőzve!`
                                        : `${gameState.currentCard ? gameState.currentCard.Name : targetCard.Name}(Játékos) kártya legyőzve!`;
                                addHistoryEntry(deathText);

                                debugLog(`Skipping damage-shake and death-fade for lethal finisher on ${targetId}`, 'debug');
                        } else {
                                window.playElementalAttack(attackerId, targetId, attackerColor);
                        }
                }

                if (!isLethal) {
                        setTimeout(() => {
                                debugLog(`Triggering damage-shake on ${targetId} after 250ms`, 'debug');
                                triggerAnimation(targetId, 'damage-shake');
                                showDamageLabel(damage, !isPlayerAttack);

                                if (targetCard.Health <= 0) {
                                        setTimeout(() => {
                                                debugLog(`Triggering death-fade on ${targetId} after 800ms from attack`, 'debug');
                                                triggerAnimation(targetId, 'death-fade');
                                                const deathText = targetId === 'arenaEnemyCard'
                                                        ? `${targetCard.Name}(Kazamata) legyőzve!`
                                                        : `${gameState.currentCard ? gameState.currentCard.Name : targetCard.Name}(Játékos) kártya legyőzve!`;
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
                FIRE: '#CD5C5C',
                WATER: '#1E90FF',
                AIR: '#ADD8E6',
                EARTH: '#556B2F'
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
                notifyBackendWhenReady();
        } else if (event.event_name === "round_over") {
                addHistoryEntry(`${event.values.round}. kör vége`);
                notifyBackendWhenReady();
        } else if (event.event_name === "result") {
                debugLog(`Fight result: ${event.values.result}`, 'info');
                notifyBackendWhenReady();
        } else if (event.event_name === "game:select") {
                debugLog(`Received game:select, setting up delay for arenaEnemyCard`, 'debug');
                gameState.enemyCard = event.values.card;
                const isBoss = event.values.isBoss || false;
                const updateFn = () => {
                        debugLog(`Updating arenaEnemyCard for ${gameState.enemyCard.Name}`, 'debug');
                        updateArenaCard('arenaEnemyCard', gameState.enemyCard, isBoss, true);
                };
                delayedUpdate(
                        'arenaEnemyCard',
                        updateFn,
                        'arenaEnemyCard',
                        () => addHistoryEntry(`Kazamata kijátszotta: ${gameState.enemyCard.Name}`),
                        () => renderEnemyCards()
                );
                notifyBackendWhenReady();
        } else if (event.event_name === "player:select") {
                debugLog(`Received player:select, setting up delay for arenaPlayerCard`, 'debug');
                gameState.currentCard = event.values.card;
                const updateFn = () => {
                        debugLog(`Updating arenaPlayerCard for ${gameState.currentCard.Name}`, 'debug');
                        updateArenaCard('arenaPlayerCard', gameState.currentCard, false, false);
                };
                delayedUpdate(
                        'arenaPlayerCard',
                        updateFn,
                        'arenaPlayerCard',
                        () => addHistoryEntry(`Játékos kijátszotta: ${gameState.currentCard.Name}`),
                        () => renderPlayerCards()
                );
                notifyBackendWhenReady();
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

function notifyBackendWhenReady() {
        waitForAnimations(() => {
                debugLog('Sending resumeGame to backend', 'info');
                const time = setTimeout(() => {
                        if (window.HybridWebView && window.HybridWebView.SendRawMessage) {
                                window.HybridWebView.SendRawMessage('resumeGame');
                        } else {
                                debugLog('HybridWebView not available for resumeGame', 'error');
                        }
                        clearTimeout(time);
                }, 600);
        });
}

function triggerAnimation(elementId, animationClass) {
        const element = document.getElementById(elementId);
        if (!element) {
                debugLog(`Element ${elementId} not found for ${animationClass}`, 'warn');
                return;
        }

        const durations = {
                'attack-right': 500,
                'attack-left': 500,
                'damage-shake': 500,
                'death-fade': 800
        };
        const duration = durations[animationClass] || 1000;

        debugLog(`Starting ${animationClass} on ${elementId} at ${Date.now()} (duration: ${duration}ms)`, 'debug');

        element.classList.remove(animationClass);
        void element.offsetWidth;

        element.classList.add(animationClass);

        const endTime = Date.now() + duration;
        pendingAnimations[elementId] = Math.max(pendingAnimations[elementId] || 0, endTime);
        debugLog(`Set pending end for ${elementId} (${animationClass}): ${endTime} (max with existing)`, 'debug');

        if (animationClass !== 'death-fade') {
                setTimeout(() => {
                        const currentEl = document.getElementById(elementId);
                        if (currentEl === element) {
                                element.classList.remove(animationClass);
                                debugLog(`Ended ${animationClass} on ${elementId} at ${Date.now()}`, 'debug');
                        } else {
                                debugLog(`Element ${elementId} changed during ${animationClass}, skipping cleanup`, 'warn');
                        }
                        if (pendingAnimations[elementId] <= Date.now()) {
                                delete pendingAnimations[elementId];
                                debugLog(`Cleared pending for ${elementId}`, 'debug');
                        }
                }, duration);
        } else {
                setTimeout(() => {
                        if (pendingAnimations[elementId] <= Date.now()) {
                                delete pendingAnimations[elementId];
                                debugLog(`Cleared pending for ${elementId} (death-fade kept for forwards)`, 'debug');
                        }
                }, duration);
        }
}

// ========== POWERCARD FUNCTIONS ==========

async function rollPowercard(powercard, isPlayer) {
        if (isRolling) return;
        isRolling = true;

        // More accurate block: cycleCount * cycleDelay + reveal delay
        const cycleCount = 20;
        const cycleDelay = 300;
        const revealDelay = 500;
        const totalDuration = cycleCount * cycleDelay + revealDelay;

        pendingAnimations['powercardRoll'] = Date.now() + totalDuration;
        debugLog(`Rolling powercard: ${powercard.name} for ${isPlayer ? 'player' : 'enemy'} (totalDuration=${totalDuration}ms)`, 'info');

        const overlay = document.getElementById('powercardRollOverlay');
        const rollingCard = document.getElementById('rollingPowercard');
        if (!overlay || !rollingCard) {
                debugLog('Powercard roll elements missing in DOM', 'error');
                isRolling = false;
                delete pendingAnimations['powercardRoll'];
                return;
        }

        overlay.style.display = 'flex';

        rollingCard.className = 'rolling-powercard cycling';
        rollingCard.classList.add(isPlayer ? 'player-roll' : 'enemy-roll');

        for (let i = 0; i < cycleCount; i++) {
                const randomCard = await window.HybridWebView.InvokeDotNet("RollForPowercard");
                if (randomCard) {
                    updateRollingCard(randomCard);
                }
                await new Promise(resolve => setTimeout(resolve, cycleDelay));
        }

        rollingCard.classList.remove('cycling');
        rollingCard.classList.add('revealed');
        updateRollingCard(powercard);

        debugLog(`Revealed powercard: ${powercard.name}`, 'success');

        await new Promise(resolve => setTimeout(resolve, revealDelay));

        addPowercardToContainer(powercard, isPlayer);

        overlay.style.display = 'none';
        rollingCard.classList.remove('revealed', 'enemy-roll', 'player-roll');

        isRolling = false;

        delete pendingAnimations['powercardRoll'];
        debugLog('Powercard roll finished, cleared pending animation', 'debug');
        notifyBackendWhenReady();
}

window.rollPowercard = rollPowercard;

function updateRollingCard(powercard) {
        const rollingCard = document.getElementById('rollingPowercard');
        if (!rollingCard || !powercard) return;

        const typeLabels = {
                'HealPower': '💚 Gyógyítás',
                'ShieldPower': '🛡️ Pajzs',
                'DamagePower': '⚔️ Azonnali Sebzés',
                'StrengthPower': '💥 Sebzés Erősítés'
        };

        const typeLabel = typeLabels[powercard.type] || '';

        rollingCard.innerHTML = `
        <div class="rolling-powercard-icon">${powercard.icon || ''}</div>
        <div class="rolling-powercard-name">${powercard.name || ''}</div>
        <div class="rolling-powercard-type">${typeLabel}</div>
        <div class="rolling-powercard-description">${powercard.description || ''}</div>
    `;
}

function addPowercardToContainer(powercard, isPlayer) {
        const containerId = isPlayer ? 'playerPowercards' : 'enemyPowercards';
        const container = document.getElementById(containerId);
        if (!container) {
                debugLog(`Powercard container ${containerId} not found`, 'error');
                return;
        }

        const powercardEl = document.createElement('div');
        powercardEl.className = `powercard ${isPlayer ? 'player-card' : ''}`;
        powercardEl.dataset.powercardId = String(Date.now());

        const durationHtml = powercard.duration > 0
                ? `<div class="powercard-duration">${powercard.duration}</div>`
                : '';

        powercardEl.innerHTML = `
        <div class="powercard-icon">${powercard.icon}</div>
        <div class="powercard-name">${powercard.name}</div>
        <div class="powercard-description">${powercard.description}</div>
        ${durationHtml}
    `;

        container.appendChild(powercardEl);

        const powercardData = { ...powercard, element: powercardEl, id: powercardEl.dataset.powercardId };
        if (isPlayer) {
                gameState.playerPowercards.push(powercardData);
        } else {
                gameState.enemyPowercards.push(powercardData);
        }

        debugLog(`Added powercard ${powercard.name} to ${isPlayer ? 'player' : 'enemy'} container`, 'success');

        if (powercard.duration > 0) {
                startPowercardCountdown(powercardEl, powercard.duration, isPlayer);
        }
}

function startPowercardCountdown(element, initialDuration, isPlayer) {
        let duration = initialDuration;

        const countdown = setInterval(() => {
                duration--;

                const durationEl = element.querySelector('.powercard-duration');
                if (durationEl) {
                        durationEl.textContent = duration;
                }

                if (duration <= 0) {
                        clearInterval(countdown);
                        removePowercard(element, isPlayer);
                }
        }, 1000); // per second for testing
}

function removePowercard(element, isPlayer) {
        element.style.animation = 'powercardSlideOut 0.5s ease-in forwards';

        setTimeout(() => {
                const powercardId = element.dataset.powercardId;
                element.remove();

                if (isPlayer) {
                        gameState.playerPowercards = gameState.playerPowercards.filter(p => p.id !== powercardId);
                } else {
                        gameState.enemyPowercards = gameState.enemyPowercards.filter(p => p.id !== powercardId);
                }

                debugLog(`Removed expired powercard from ${isPlayer ? 'player' : 'enemy'}`, 'info');
        }, 500);
}

// Backend hook function - call this to update a powercard's duration
function updatePowercardDuration(powercardId, newDuration, isPlayer) {
        const idStr = String(powercardId);
        const cards = isPlayer ? gameState.playerPowercards : gameState.enemyPowercards;
        const card = cards.find(c => c.id === idStr);

        if (card && card.element) {
                const durationEl = card.element.querySelector('.powercard-duration');
                if (durationEl) {
                        durationEl.textContent = newDuration;
                }
        }
}
