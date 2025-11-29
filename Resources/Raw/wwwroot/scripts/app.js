let gameState = null;

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

function switchEditorTab(tabId) {
    document.querySelectorAll('.editor-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('active'));

    const clickedBtn = document.querySelector(`button[onclick="switchEditorTab('${tabId}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    const section = document.getElementById(`editor-${tabId}`);
    if (section) section.classList.add('active');

    if (tabId == 'sets') {
        document.getElementById('setName').value = '';
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
                allCardsList.innerHTML = `<p>Úgy néz ki még nincs egyetlen egy kártya ebben a világban.</p>
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
    try {
        const result = await window.HybridWebView.InvokeDotNet("DeleteAbility", {
            abilityName: abilityName
        });

        if (result) {
            window.toast.success(`A ${abilityName} képesség törölve!`);
            switchEditorTab('abilities');
        } else {
            window.toast.error('Hiba történt!');
        }
    } catch (err) {
        window.toast.error('Hiba történt a képesség törlésekor!');
    }
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
                bossChooser.innerHTML = '<p>Még jelenleg nincsen egy vezéred sem! Készíts egyet <button class="fake-link" onclick="switchEditorTab(\'cards\')">itt</button>!</p>';
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

        cardGrid.classList.remove('slide-left');
        cardGrid.classList.add('active');

        buttons[0].classList.add('active');
        buttons[1].classList.remove('active');
    } else {
        cardGrid.classList.remove('active');
        cardGrid.classList.add('slide-left');

        powerGrid.classList.remove('slide-right');
        powerGrid.classList.add('active');

        buttons[0].classList.remove('active');
        buttons[1].classList.add('active');
    }
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
});

document.addEventListener("mousemove", ev => window.mouse = { 'x': ev.pageX, 'y': ev.pageY });
document.getElementById('worldName').oninput = (ev) => window.editorContext.name = ev.target.value;