using System;
using System.Collections.Generic;
using System.Linq;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Save;
using static DuszaVerseny2025.Engine.Save.SaveManager;

namespace DuszaVerseny2025.Engine.Editor
{
    public class DungeonEditor
    {
        public class NamedCollection
        {
            public string Name { get; set; }
            public Collection collection { get; set; }
            public NamedCollection(List<CardTemplate> initialCards, string name)
            {
                Name = name;
                collection = new Collection(initialCards);
            }
        }
        public List<CardTemplate> cards = new List<CardTemplate>();
        public List<DungeonTemplate> dungeons = new List<DungeonTemplate>();
        public PlayerCollection playerInventory = new PlayerCollection();
        public List<CardTemplate> initialDeck = new List<CardTemplate>();
        public List<NamedCollection> collections = new List<NamedCollection>();
        public List<PowerCard> powerCards = new List<PowerCard>();
        public List<DungeonPathTemplate> dungeonPaths = new List<DungeonPathTemplate>();
        public int difficulty = 0;

        public GameEngine CompileMockEngine()
        {
            // Note: THIS IS THE FUCKING OFFICIAL ENGINE USED IN THE GAME
            // THIS IS FUCKED THIS SHOULD NOT BE USED IN GAME WE USE IT THO
            var engine = new GameEngine(cards, dungeons, playerInventory, difficulty);

            engine.initialDeck = initialDeck.ToList();
            engine.powerCards = powerCards.ToList();

            return engine;
        }

        public static DungeonEditor loadFromWorld(WorldSave save, WorldSave.DungeonSave[] dungeonSaves)
        {
            if (save == null) throw new ArgumentNullException(nameof(save));
            if (dungeonSaves == null) throw new ArgumentNullException(nameof(dungeonSaves));

            var dungeonEditor = new DungeonEditor();

            var cardTemplates = new List<CardTemplate>();
            foreach (var cardSave in save.cards ?? Array.Empty<WorldSave.CardSave>())
            {
                if (cardSave == null)
                    throw new InvalidOperationException("Encountered null CardSave entry in world save.");

                var type = cardSave.type switch
                {
                    "tuz" => CardTemplate.Type.Fire,
                    "viz" => CardTemplate.Type.Water,
                    "fold" => CardTemplate.Type.Earth,
                    "levego" => CardTemplate.Type.Air,
                    _ => throw new InvalidOperationException(
                        $"Unknown card element type '{cardSave.type}' for card '{cardSave.name}'.")
                };

                cardTemplates.Add(new CardTemplate(cardSave.damage, cardSave.health, cardSave.name, type));
            }

            List<PowerCard> powerCards = new List<PowerCard>();
            foreach (var power in save.powerCards)
            {
                switch (power.type)
                {
                    case "HealPower":
                        powerCards.Add(new HealPower(power.duration, power.value, power.name, power.rarity));
                        break;
                    case "ShieldPower":
                        powerCards.Add(new ShieldPower(power.duration, power.value, power.name, power.rarity));
                        break;
                    case "DamagePower":
                        powerCards.Add(new DamagePower(power.duration, power.value, power.name, power.rarity));
                        break;
                    case "StrengthPower":
                        powerCards.Add(new StrengthPower(power.duration, power.value, power.name, power.rarity));
                        break;
                }
            }

            var cardByName = cardTemplates.ToDictionary(c => c.name, StringComparer.Ordinal);

            foreach (var bossOverride in save.bosses ?? Array.Empty<WorldSave.BossOverride>())
            {
                if (bossOverride == null)
                    throw new InvalidOperationException("Encountered null BossOverride entry in world save.");

                if (!cardByName.TryGetValue(bossOverride.originalName, out var baseTemplate))
                    throw new InvalidOperationException(
                        $"Boss override refers to unknown card '{bossOverride.originalName}'.");

                var proficiency = Utils.Utils.GetAttributeByName(bossOverride.proficiency);

                var bossTemplate = baseTemplate.ToBoss(bossOverride.bossName, proficiency);
                cardTemplates.Add(bossTemplate);
                cardByName[bossTemplate.bossName] = bossTemplate;
            }

            // --- Build dungeons ---
            var dungeonTemplates = new List<DungeonTemplate>();

            foreach (var dungeonSave in dungeonSaves)
            {
                if (dungeonSave == null)
                    throw new InvalidOperationException("Encountered null DungeonSave entry.");

                // Resolve dungeon cards
                var dungeonCardTemplates = new List<CardTemplate>();
                foreach (var cardName in dungeonSave.cards ?? Array.Empty<string>())
                {
                    if (string.IsNullOrWhiteSpace(cardName))
                        throw new InvalidOperationException(
                            $"Dungeon '{dungeonSave.dungeonName}' has an empty card name entry.");

                    if (!cardByName.TryGetValue(cardName, out var cardTemplate))
                        throw new InvalidOperationException(
                            $"Dungeon '{dungeonSave.dungeonName}' refers to unknown card '{cardName}'.");

                    dungeonCardTemplates.Add(cardTemplate);
                }

                var dungeonInventory = new Collection(dungeonCardTemplates);

                var dungeonType = dungeonSave.dungeonSize switch
                {
                    "egyszeru" => DungeonTemplate.DungeonType.Small,
                    "kis" => DungeonTemplate.DungeonType.Medium,
                    "nagy" => DungeonTemplate.DungeonType.Big,
                    _ => throw new InvalidOperationException(
                        $"Unknown dungeon size '{dungeonSave.dungeonSize}' for dungeon '{dungeonSave.dungeonName}'.")
                };

                // Original logic: "nagy" == boss dungeon (card reward), others == attribute reward
                if (dungeonSave.dungeonSize == "nagy")
                {
                    if (string.IsNullOrWhiteSpace(dungeonSave.bossName))
                        throw new InvalidOperationException(
                            $"Big dungeon '{dungeonSave.dungeonName}' does not specify a bossName.");

                    if (!cardByName.TryGetValue(dungeonSave.bossName, out var bossTemplate))
                        throw new InvalidOperationException(
                            $"Big dungeon '{dungeonSave.dungeonName}' refers to unknown boss '{dungeonSave.bossName}'.");

                    var reward = new DungeonTemplate.CardReward(dungeonCardTemplates.ToArray());

                    dungeonTemplates.Add(
                        new DungeonTemplate(
                            dungeonType,
                            dungeonSave.dungeonName,
                            dungeonInventory,
                            bossTemplate,
                            reward
                        )
                    );
                }
                else if (dungeonSave.dungeonSize == "kis")
                {
                    if (string.IsNullOrWhiteSpace(dungeonSave.reward))
                    {
                        throw new InvalidOperationException(
                            $"Dungeon '{dungeonSave.dungeonName}' does not specify a reward.");
                    }

                    var rewardAttribute = Utils.Utils.GetAttributeByName(dungeonSave.reward);

                    if (!cardByName.TryGetValue(dungeonSave.bossName, out var bossTemplate))
                        throw new InvalidOperationException(
                            $"Big dungeon '{dungeonSave.dungeonName}' refers to unknown boss '{dungeonSave.bossName}'.");

                    var reward = new DungeonTemplate.AttributeReward(rewardAttribute);

                    dungeonTemplates.Add(
                        new DungeonTemplate(
                            dungeonType,
                            dungeonSave.dungeonName,
                            dungeonInventory,
                            bossTemplate,
                            reward
                        )
                    );
                }
                else
                {
                    // Attribute reward dungeon
                    if (string.IsNullOrWhiteSpace(dungeonSave.reward))
                    {
                        throw new InvalidOperationException(
                            $"Dungeon '{dungeonSave.dungeonName}' does not specify a reward.");
                    }

                    var rewardAttribute = Utils.Utils.GetAttributeByName(dungeonSave.reward);

                    var reward = new DungeonTemplate.AttributeReward(rewardAttribute);

                    dungeonTemplates.Add(
                        new DungeonTemplate(
                            dungeonType,
                            dungeonSave.dungeonName,
                            dungeonInventory,
                            reward
                        )
                    );
                }
            }

            // --- Build initial deck from starterDeck names ---
            var initialDeck = new List<CardTemplate>();
            foreach (var cardName in save.starterDeck ?? Array.Empty<string>())
            {
                if (string.IsNullOrWhiteSpace(cardName))
                    throw new InvalidOperationException("starterDeck contains an empty card name.");

                if (!cardByName.TryGetValue(cardName, out var template))
                    throw new InvalidOperationException($"starterDeck refers to unknown card '{cardName}'.");

                initialDeck.Add(template);
            }

            var namedCollections = new List<NamedCollection>();

            foreach (var collection in save.collections)
            {
                List<CardTemplate> cards = new List<CardTemplate>();
                foreach (var card in collection.cards) cards.Add(cardByName[card]);
                namedCollections.Add(new NamedCollection(cards, collection.collectionName));
            }

            dungeonEditor.cards = cardTemplates;
            dungeonEditor.dungeons = dungeonTemplates;
            dungeonEditor.initialDeck = initialDeck;
            dungeonEditor.collections = namedCollections;
            dungeonEditor.powerCards = powerCards;

            return dungeonEditor;
        }
    }
}