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

// Event queue system for sequential processing
let eventQueue = [];
let isProcessingEvent = false;
let isRolling = false;
processNextEvent();

let player = null;

const playerObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                                if (node.classList && node.classList.contains('audio-player-container')) {
                                        node.style.display = 'none';
                                }
                        });
                }
        });
});
playerObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', function () {
        player = new AudioPlayer({
                musicPath: './sound/music',
                sfxPath: './sound/effects',
                corner: 'bottom-right',
                theme: 'dark',
                accentColor: '#ff2a6d'
        });

        const startButton = document.getElementById('startButton');
        const backButton = document.getElementById('backButton');

        if (startButton) {
                startButton.addEventListener('click', () => {
                        if (player) player.playSfx('StartClick.wav');
                        startGameFromJS();
                });
        }

        if (backButton) {
                backButton.addEventListener('click', navigateBack);
        }

        window.addEventListener('HybridWebViewMessageReceived', function (e) {
                const message = e.detail.message;

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
                                        break;
                                }
                                case 'fightEvent': {
                                        const event = JSON.parse(data);
                                        queueEvent(event);
                                        break;
                                }
                                case 'gameOver': {
                                        const result = JSON.parse(data);
                                        let rewardText = result.Success ? result.Reward : "";

                                        queueEvent({
                                                event_name: 'gameOver',
                                                values: { result: result, rewardText: rewardText }
                                        });
                                        break;
                                }
                        }
                }
        });
});

function queueEvent(event) {
        eventQueue.push(event);
        // debugLog(`Event queued: ${event.event_name} (Queue size: ${eventQueue.length})`, 'debug');
        processNextEvent();
}

async function processNextEvent() {
        if (isProcessingEvent || eventQueue.length === 0) return;

        isProcessingEvent = true;
        const event = eventQueue.shift();

        await handleFightEvent(event);

        isProcessingEvent = false;

        if (eventQueue.length > 0) {
                setTimeout(() => processNextEvent(), 300);
        }
}

// ========== RENDER FUNCTIONS ==========

function renderEnemyCards() {
        const container = document.getElementById('enemyDeck');
        if (!container) return;

        container.innerHTML = '';

        if (gameState.dungeon && gameState.dungeon.HasBoss) {
                renderBossCard();
        }
        renderEnemyNormalCards();
}

function renderBossCard() {
        if (gameState.enemyCard && gameState.enemyCard.IsBoss) return;
        if (!gameState.dungeon) return;

        const boss = gameState.dungeon.Boss || gameState.dungeon.boss;
        if (!boss) {
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

// ========== GAME FLOW FUNCTIONS ==========

function startGameFromJS() {
        if (window.HybridWebView && window.HybridWebView.SendRawMessage) {
                window.HybridWebView.SendRawMessage('startGameRequested');
        }
}

function addHistoryEntry(text) {
        const historyContainer = document.getElementById('historyContainer');
        if (!historyContainer) return;

        const entry = document.createElement('div');
        entry.className = 'history-entry';
        entry.textContent = text;

        entry.style.opacity = '0';
        historyContainer.appendChild(entry);

        requestAnimationFrame(() => {
                entry.style.transition = 'opacity 0.3s ease-in';
                entry.style.opacity = '1';
        });

        historyContainer.scrollTop = historyContainer.scrollHeight;
}

function updateRoundText(round) {
        const roundText = document.getElementById('roundText');
        if (roundText) {
                roundText.textContent = `${round}. kör`;
                roundText.classList.add('pulse-animation');
                setTimeout(() => roundText.classList.remove('pulse-animation'), 600);
        }
}

function showDamageLabel(damage, isPlayer) {
        const label = document.getElementById('damagePopupLabel');
        if (!label) return;

        label.style.color = isPlayer ? 'var(--accent-red)' : 'var(--accent-gold)';
        label.textContent = `-${damage}`;

        label.classList.remove('animate-damage-popup');
        label.style.display = 'block';

        void label.offsetWidth;

        label.classList.add('animate-damage-popup');

        setTimeout(() => {
                label.style.display = 'none';
                label.classList.remove('animate-damage-popup');
        }, 1200);
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
                        endText.style.color = '';
                }
                if (endReward) {
                        endReward.textContent = rewardText;
                }
        } else {
                if (endText) {
                        endText.textContent = 'Vesztettél!';
                        endText.style.color = 'var(--accent-red)';
                }
                if (endReward) {
                        endReward.textContent = '';
                }
        }
}

function navigateBack() {
        if (window.HybridWebView && window.HybridWebView.SendRawMessage) {
                window.HybridWebView.SendRawMessage('navigateBack');
        }
}

function updateArenaCard(elementId, card, isBoss, isEnemy) {
        const arenaCard = document.getElementById(elementId);
        if (!arenaCard || !card) return;
        arenaCard.style.display = 'flex';

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

// ========== EVENT HANDLERS WITH PROPER TIMING ==========

async function handleFightEvent(event) {
        switch (event.event_name) {
                case "round":
                        updateRoundText(event.values.round);
                        addHistoryEntry(`${event.values.round}. Kör`);
                        await sleep(600); // Reduced from 800
                        notifyBackend();
                        break;

                case "round_over":
                        addHistoryEntry(`${event.values.round}. kör vége`);
                        await sleep(400); // Reduced from 600
                        notifyBackend();
                        break;

                case "result":
                        await sleep(200); // Reduced from 400
                        notifyBackend();
                        break;

                case "game:select":
                        gameState.enemyCard = event.values.card;
                        const isBoss = event.values.isBoss || false;
                        player.playSfx('EnemySelect.wav');
                        updateArenaCard('arenaEnemyCard', gameState.enemyCard, isBoss, true);

                        if (window.animateDraw) {
                                window.animateDraw('arenaEnemyCard');
                        }

                        addHistoryEntry(`Kazamata kijátszotta: ${gameState.enemyCard.Name}`);
                        renderEnemyCards();

                        await sleep(1000); // Reduced from 1200
                        notifyBackend();
                        break;

                case "player:select":
                        gameState.currentCard = event.values.card;
                        player.playSfx('PlayerSelect.wav');
                        updateArenaCard('arenaPlayerCard', gameState.currentCard, false, false);

                        if (window.animateDraw) {
                                window.animateDraw('arenaPlayerCard');
                        }

                        addHistoryEntry(`Játékos kijátszotta: ${gameState.currentCard.Name}`);
                        renderPlayerCards();

                        await sleep(1000); // Reduced from 1200
                        notifyBackend();
                        break;

                case "game:attack":
                        if (!gameState.enemyCard) {
                                notifyBackend();
                                break;
                        }
                        player.playSfx('TakeDamage.mp3');
                        await handleAttack(
                                'arenaEnemyCard',
                                'arenaPlayerCard',
                                'attack-right',
                                event.values.damage,
                                event.values.card,
                                `Kazamata(${gameState.enemyCard.Name}) támad: ${event.values.damage} a ${event.values.card.Name}(Játékos), élete maradt: ${event.values.card.Health}`,
                                false,
                                gameState.enemyCard
                        );
                        break;

                case "player:attack":
                        if (!gameState.currentCard) {
                                notifyBackend();
                                break;
                        }

                        if (!event.values.enemy) {
                                notifyBackend();
                                break;
                        }
                        player.playSfx('TakeDamage.mp3');
                        await handleAttack(
                                'arenaPlayerCard',
                                'arenaEnemyCard',
                                'attack-left',
                                event.values.damage,
                                event.values.enemy,
                                `Játékos(${gameState.currentCard.Name}) támad: ${event.values.damage} a ${event.values.enemy.Name}(Kazamata), élete maradt: ${event.values.enemy.Health}`,
                                true,
                                gameState.currentCard
                        );
                        break;

                case "gameOver":
                        await sleep(1000); // Reduced from 1500
                        showEndScreen(event.values.result, event.values.rewardText);
                        break;

                default:
                        notifyBackend();
        }
}

async function handleAttack(attackerId, targetId, attackClass, damage, targetCard, historyText, isPlayerAttack, attackerCard) {
        // Guard against null values
        if (!targetCard) {
                notifyBackend();
                return;
        }

        if (!attackerCard) {
                notifyBackend();
                return;
        }

        const isLethal = targetCard.Health <= 0;

        const healthElId = targetId === 'arenaEnemyCard' ? 'enemyHealth' : 'playerHealth';
        const healthEl = document.getElementById(healthElId);
        if (healthEl) {
                healthEl.textContent = targetCard.Health;
        }

        addHistoryEntry(historyText);

        // Attack animation
        const attacker = document.getElementById(attackerId);
        if (attacker) {
                attacker.classList.add(attackClass);
                await sleep(600);
                attacker.classList.remove(attackClass);
        }

        // Elemental effects and damage
        if (window.playElementalAttack && attackerCard.ElementColor) {
                if (isLethal && window.playElementalFinisher) {
                        window.playElementalFinisher(attackerId, targetId, attackerCard.ElementColor);

                        const target = document.getElementById(targetId);
                        if (target) {
                                // Add damage shake during finisher
                                setTimeout(() => {
                                        target.classList.add('damage-shake');
                                        showDamageLabel(damage, !isPlayerAttack);
                                }, 200);

                                setTimeout(() => {
                                        target.classList.remove('damage-shake');
                                }, 800);
                        }

                        // Wait for finisher to complete
                        await sleep(2000);

                        // Death fade after finisher
                        if (target) {
                                target.classList.add('death-fade');
                                await sleep(800);
                        }

                        const deathText = targetId === 'arenaEnemyCard'
                                ? `${targetCard.Name}(Kazamata) legyőzve!`
                                : `${targetCard.Name}(Játékos) kártya legyőzve!`;
                        addHistoryEntry(deathText);

                        // Extra pause after death
                        await sleep(500);

                } else {
                        // NON-LETHAL HIT - Regular attack
                        window.playElementalAttack(attackerId, targetId, attackerCard.ElementColor);
                        await sleep(400);

                        const target = document.getElementById(targetId);
                        if (target) {
                                target.classList.add('damage-shake');
                                showDamageLabel(damage, !isPlayerAttack);
                                await sleep(600);
                                target.classList.remove('damage-shake');
                        }

                        // Check if this attack killed them (Health reached 0 but wasn't lethal before)
                        if (targetCard.Health <= 0 && target) {
                                await sleep(300);
                                target.classList.add('death-fade');
                                await sleep(800);

                                const deathText = targetId === 'arenaEnemyCard'
                                        ? `${targetCard.Name}(Kazamata) legyőzve!`
                                        : `${targetCard.Name}(Játékos) kártya legyőzve!`;
                                addHistoryEntry(deathText);

                                await sleep(500);
                        }
                }
        } else {
                await sleep(400);

                const target = document.getElementById(targetId);
                if (target) {
                        target.classList.add('damage-shake');
                        showDamageLabel(damage, !isPlayerAttack);
                        await sleep(600);
                        target.classList.remove('damage-shake');
                }

                if (isLethal && target) {
                        await sleep(300);
                        target.classList.add('death-fade');
                        await sleep(800);

                        const deathText = targetId === 'arenaEnemyCard'
                                ? `${targetCard.Name}(Kazamata) legyőzve!`
                                : `${targetCard.Name}(Játékos) kártya legyőzve!`;
                        addHistoryEntry(deathText);

                        await sleep(500);
                }
        }

        // Final pause before notifying backend
        await sleep(400);
        notifyBackend();
}

function notifyBackend() {
        if (window.HybridWebView && window.HybridWebView.SendRawMessage) {
                window.HybridWebView.SendRawMessage('resumeGame');
        }
}

function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

// ========== POWERCARD FUNCTIONS WITH SLOWER ANIMATION ==========

async function rollPowercard(powercard, isPlayer) {
        if (isRolling) return;
        isRolling = true;

        const cycleCount = 8;
        const cycleDelay = 150;
        const revealDelay = 1000;


        const overlay = document.getElementById('powercardRollOverlay');
        const rollingCard = document.getElementById('rollingPowercard');
        if (!overlay || !rollingCard) {
                isRolling = false;
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
                await sleep(cycleDelay);
        }

        rollingCard.classList.remove('cycling');
        rollingCard.classList.add('revealed');
        updateRollingCard(powercard);


        await sleep(revealDelay);

        if (powercard.duration == 0) {
            
        }

        addPowercardToContainer(powercard, isPlayer);

        overlay.style.transition = 'opacity 0.3s ease-out';
        overlay.style.opacity = '0';
        await sleep(300);

        overlay.style.display = 'none';
        overlay.style.opacity = '1';
        rollingCard.classList.remove('revealed', 'enemy-roll', 'player-roll');

        isRolling = false;
        notifyBackend();
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
                return;
        }

        const powercardEl = document.createElement('div');
        powercardEl.className = `powercard ${isPlayer ? 'player-card' : ''}`;
        powercardEl.dataset.powercardId = String(Date.now());
        powercardEl.style.opacity = '0';
        powercardEl.style.transform = 'scale(0.8)';

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

        requestAnimationFrame(() => {
                powercardEl.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                powercardEl.style.opacity = '1';
                powercardEl.style.transform = 'scale(1)';
        });

        const powercardData = { ...powercard, element: powercardEl, id: powercardEl.dataset.powercardId };
        if (isPlayer) {
                gameState.playerPowercards.push(powercardData);
        } else {
                gameState.enemyPowercards.push(powercardData);
        }


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

                        durationEl.classList.add('pulse');
                        setTimeout(() => durationEl.classList.remove('pulse'), 300);
                }

                if (duration <= 0) {
                        clearInterval(countdown);
                        removePowercard(element, isPlayer);
                }
        }, 1000);
}

function removePowercard(element, isPlayer) {
        element.style.transition = 'all 0.5s ease-in';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8) translateY(20px)';

        setTimeout(() => {
                const powercardId = element.dataset.powercardId;
                element.remove();

                if (isPlayer) {
                        gameState.playerPowercards = gameState.playerPowercards.filter(p => p.id !== powercardId);
                } else {
                        gameState.enemyPowercards = gameState.enemyPowercards.filter(p => p.id !== powercardId);
                }
        }, 500);
}

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