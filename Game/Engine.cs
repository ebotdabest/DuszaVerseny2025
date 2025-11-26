using System;
using System.Collections.Generic;
using System.Linq;
using DuszaVerseny2025.Engine.Cards;

namespace DuszaVerseny2025.Engine
{
    public class GameEngine
    {
        private readonly World _world;
        private readonly PlayerCollection _playerInventory;

        private readonly List<CardTemplate> _cardTemplates = new List<CardTemplate>();

        public World GameWorld => _world;
        public PlayerCollection PlayerInventory => _playerInventory;

        public List<CardTemplate> CardTemplates => _cardTemplates;

        public List<CardTemplate> currentDeck = new List<CardTemplate>();

        public List<CardTemplate> initialDeck = new List<CardTemplate>();

        public GameEngine(List<CardTemplate> cards, List<DungeonTemplate> dungeons, PlayerCollection playerInventory, int difficulty)
        {
            if (cards == null) throw new ArgumentNullException(nameof(cards));
            if (dungeons == null) throw new ArgumentNullException(nameof(dungeons));
            if (playerInventory == null) throw new ArgumentNullException(nameof(playerInventory));

            _cardTemplates = cards.ToList();
            _playerInventory = playerInventory;

            _world = new World(_cardTemplates, dungeons, difficulty);

            initialDeck = _playerInventory.Cards.ToList();
        }

        public CardTemplate this[string name]
        {
            get
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Card name cannot be null or whitespace.", nameof(name));

                var card = _cardTemplates.FirstOrDefault(t => t.name == name);
                if (card == null)
                    throw new KeyNotFoundException($"CardTemplate with name '{name}' was not found in GameEngine.");

                return card;
            }
        }
    }

    public class DeckBuilder
    {
        public GameEngine engine;
        // public DeckBuilder(GameEngine engine)
        // {
        //     this.engine = engine ?? throw new ArgumentNullException(nameof(engine));
        // }

        private GameEngine Engine
            => engine ?? throw new InvalidOperationException("DeckBuilder.engine has not been set.");

        public void Add(CardTemplate template)
        {
            if (template == null) throw new ArgumentNullException(nameof(template));
            Engine.currentDeck.Add(template);
        }

        public bool Any(Func<CardTemplate, bool> func)
        {
            if (func == null) throw new ArgumentNullException(nameof(func));
            return Engine.currentDeck.Any(func);
        }

        public CardTemplate? FirstOrDefault(Func<CardTemplate, bool> func)
        {
            if (func == null) throw new ArgumentNullException(nameof(func));
            return Engine.currentDeck.FirstOrDefault(func);
        }

        public void Remove(CardTemplate template)
        {
            if (template == null) throw new ArgumentNullException(nameof(template));
            Engine.currentDeck.Remove(template);
        }

        public int Count => Engine.currentDeck.Count;
        public void Clear()
        {
            Engine.currentDeck.Clear();
        }
    }
}
