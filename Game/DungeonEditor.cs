using DuszaVerseny2025.Engine.Cards;
using static DuszaVerseny2025.Engine.Save.SaveManager;

namespace DuszaVerseny2025.Engine.Editor;

public class DungeonEditor
{
    public List<CardTemplate> cards = new List<CardTemplate>();
    public List<DungeonTemplate> dungeons = new List<DungeonTemplate>();
    public PlayerCollection playerInventory = new PlayerCollection();
    public List<CardTemplate> initialDeck = new List<CardTemplate>();
    public int difficulty = 0;
    public GameEngine CompileMockEngine()
    {
        var engine = new GameEngine(cards, dungeons, playerInventory, difficulty);
        engine.initialDeck = initialDeck;

        return engine;
    }

    public static DungeonEditor loadFromWorld(WorldSave save)
    {
        return new DungeonEditor();
    }
}