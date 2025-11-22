using DuszaVerseny2025.Engine.Cards;

namespace DuszaVerseny2025.Engine;

public class GameEngine
{
    World _world;

    public World GameWorld => _world;

    PlayerCollection _playerInventory;

    public PlayerCollection PlayerInventory => _playerInventory;

    List<CardTemplate> cardTemplates = new List<CardTemplate>();

    public List<CardTemplate> CardTemplates => cardTemplates;
    public List<CardTemplate> currentDeck = new List<CardTemplate>();

    public GameEngine(List<CardTemplate> cards, List<DungeonTemplate> dungeons, PlayerCollection playerInventory, int difficulty)
    {
        _world = new World(cards, dungeons, difficulty);
        cardTemplates = cards;
        _playerInventory = playerInventory;
    }

    public CardTemplate this[string name] => cardTemplates.Where(t => t.name == name).First();

    public List<CardTemplate> initialDeck = new List<CardTemplate>();
}

public class DeckBuilder
{
    public GameEngine engine;

    public void Add(CardTemplate template) => engine.currentDeck.Add(template);

    public bool Any(Func<CardTemplate, bool> func) => engine.currentDeck.Any(func);
    public CardTemplate? FirstOrDefault(Func<CardTemplate, bool> func) => engine.currentDeck.FirstOrDefault(func);

    public void Remove(CardTemplate template) => engine.currentDeck.Remove(template);

    public int Count => engine.currentDeck.Count;

}