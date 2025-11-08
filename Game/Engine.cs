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

    public GameEngine(List<CardTemplate> cards, List<DungeonTemplate> dungeons, PlayerCollection playerInventory)
    {
        _world = new World(cards, dungeons);
        cardTemplates = cards;
        _playerInventory = playerInventory;
    }

    public CardTemplate this[string name] => cardTemplates.Where(t => t.name == name).First();    
}