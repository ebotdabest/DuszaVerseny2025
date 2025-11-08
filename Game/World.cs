namespace DuszaVerseny2025.Engine;

using System.Text;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Serializer;

public class World
{
    Collection _worldCollection;
    
    List<DungeonTemplate> _dungeons;

    public DungeonTemplate[] Dungeons => _dungeons.ToArray();

    public World(List<CardTemplate> cards, List<DungeonTemplate> dungeons)
    {
        _worldCollection = new Collection(cards);
        _dungeons = dungeons;

    }

    public Dungeon generateDungeon(DungeonTemplate dungeon)
    {
        return Dungeon.fromTemplate(dungeon);
    }

    public record FightEvent(string event_name, Dictionary<string, object> values)
    {
        public static FightEvent makeEvent(string name, params (string key, object value)[] kwargs)
        {
            var dict = kwargs.ToDictionary(k => k.key, k => k.value);
            return new FightEvent(name, dict);
        }
    }

    public bool FightDungeon(Dungeon d, Deck playerDeck, ref string lastCard, Action<FightEvent> callback)
    {
        Deck dungeonDeck = d.compileDeck();

        int currentCardIndex = 0, currentEnemyIndex = 0;
        int round = 1;

        bool lost = false;

        while (currentCardIndex < playerDeck.Size && currentEnemyIndex < dungeonDeck.Size)
        {
            bool playerWin = false, enemyWin = false;
            Card currentCard = playerDeck.Cards[currentCardIndex];
            Card enemyCard = dungeonDeck.Cards[currentEnemyIndex];

            while (!playerWin && !enemyWin)
            {
                Console.WriteLine($"Round {round}: {enemyCard.Name} ({enemyCard.Health}/{enemyCard.Damage}) vs {currentCard.Name}({currentCard.Health}/{currentCard.Damage})");
                enemyWin = enemyCard.Attack(currentCard);
                if (enemyWin)
                {
                    Console.WriteLine("Enemy won the round!");
                    currentCardIndex++;
                    if (currentCardIndex >= playerDeck.Size) { lost = true; }
                    break;
                }

                playerWin = currentCard.Attack(enemyCard);
                if (playerWin)
                {
                    currentEnemyIndex++;
                    Console.WriteLine("Player won the round!");
                    break;
                }
                Console.WriteLine("Nobody died!");
            }
            round++;

        }

        if (lost)
        {
            Console.WriteLine("All perished!");
            return false;
        }

        if (d.HasBoss)
        {
            Console.WriteLine($"Boss is: {d.boss?.Name}");
            bool bossDead = false;
            round = 1;

            while (currentCardIndex < playerDeck.Size && !bossDead)
            {
                Card currentCard = playerDeck.Cards[currentCardIndex];
                Console.WriteLine($"Round {round}: {d.boss.Name} ({d.boss.Health}/{d.boss.Damage}) vs {currentCard.Name}({currentCard.Health}/{currentCard.Damage})");
                bool bossWin = d.boss.Attack(currentCard);
                if (bossWin)
                {
                    currentCardIndex++;
                    if (currentCardIndex >= playerDeck.Size) { break; }
                    continue;
                }

                bool playerWin = currentCard.Attack(d.boss);
                if (playerWin)
                {
                    Console.WriteLine("Player defeated the boss!");
                    bossDead = true;
                    continue;
                }
                Console.WriteLine("Nobody died!");
                round++;
            }

            if (bossDead)
            {
                Console.WriteLine("Dungeon victorious!");
                lastCard = playerDeck.Cards[currentCardIndex].Name;
                return true;
            }
        }
        else
        {
            return true;
        }

        return false;
    }
}

public record DungeonTemplate(DungeonTemplate.DungeonType type, string name, Collection collection, CardTemplate? bossTemplate, DungeonTemplate.DungeonReward reward) : ISerialize
{
    public DungeonTemplate(DungeonType type, string name, Collection collection, DungeonReward reward) : this(type, name, collection, null, reward) { }

    public interface DungeonReward : ISerialize
    {
        public void Grant(PlayerCollection playerCollection, CardTemplate lastPlayedCard);
    }

    public class AttributeReward : DungeonReward
    {
        Card.Attribute attribute;
        public AttributeReward(Card.Attribute attribute)
        {
            this.attribute = attribute;
        }

        public string Export()
        {
            return $";{attribute switch
            {
                Card.Attribute.Health => "eletero",
                Card.Attribute.Damage => "eletero",
                _ => ""
            }}";
        }

        public void Grant(PlayerCollection playerCollection, CardTemplate lastPlayedCard)
        {
            playerCollection.Upgrade(lastPlayedCard.name, attribute);
        }
    }

    public class CardReward : DungeonReward
    {
        CardTemplate[] rewards;
        public CardReward(CardTemplate[] rewards)
        {
            this.rewards = rewards;
        }

        public string Export()
        {
            return "";
        }

        public void Grant(PlayerCollection playerCollection, CardTemplate lastPlayedCard)
        {
            foreach (var reward in rewards)
            {
                foreach (var card in playerCollection.Cards)
                {
                    if (reward.name != card.name)
                    {
                        playerCollection.AddToCollection(reward);
                        return;
                    }
                }
            }
        }
    }

    public enum DungeonType
    {
        Small,
        Medium,
        Big,
        Unknown
    }

    public static DungeonTemplate? fromFile(string[] args, List<CardTemplate> cards)
    {
        List<CardTemplate> dungeonTemplates = new List<CardTemplate>();
        Console.WriteLine("Cards: " + args[2]);
        foreach(var card in args[2].Split(","))
        {
            var c = cards.Where(t => t.name == card).ToArray();
            if(c.Length > 0)
            {
                dungeonTemplates.Add(c[0]);
            }
        }

        Collection dungeonCards = new Collection(dungeonTemplates);
        DungeonType type = args[0] switch
        {
            "egyszeru" => DungeonType.Small,
            "kis" => DungeonType.Medium,
            "nagy" => DungeonType.Big,
            _ => DungeonType.Unknown
        };
        Card.Attribute reward = args[3] switch
        {
            "eletero" => Card.Attribute.Health,
            "sebzes" => Card.Attribute.Damage,
            _ => Card.Attribute.None
        };

        if (type == DungeonType.Small)
        {
            return new DungeonTemplate(type, args[1], dungeonCards, new AttributeReward(reward));
        }
        else if (type == DungeonType.Medium)
        {
            var boss = cards.Where(t => t.bossName == args[3]).First();
            return new DungeonTemplate(type, args[1], dungeonCards, boss, new AttributeReward(reward));
        }
        else if (type == DungeonType.Big)
        {
            var boss = cards.Where(t => t.bossName == args[3]).First();
            return new DungeonTemplate(type, args[1], dungeonCards, boss, new CardReward(dungeonCards.Cards.ToArray()));
        }
        return null;
    }

    public string Export()
    {
        //kazamata;egyszeru;Teszt1a Kazamata;Sadan;;eletero
        //kazamata;egyszeru;Teszt1a Kazamata;Sadan;eletero
        //kazamata;kis;Teszt2a Kazamata;Aragorn,Eowyn,ObiWan;Darth ObiWan;eletero
        //kazamata;nagy;Teszt3 Kazamata;Aragorn,Eowyn,ObiWan,Kira,Tul'Arak;Darth ObiWan
        StringBuilder dungeonBuilder = new StringBuilder();
        dungeonBuilder.Append("kazamata;");
        dungeonBuilder.Append(type switch
        {
            DungeonType.Small => "egyszeru",
            DungeonType.Medium => "kis",
            DungeonType.Big => "nagy",
            _ => ""
        });
        dungeonBuilder.Append(";");
        dungeonBuilder.Append(name);
        dungeonBuilder.Append(";");

        string[] names = new string[collection.Size];
        for (int i = 0; i < collection.Size; i++)
        {
            names[i] = collection.Cards[i].name;
        }
        dungeonBuilder.Append(string.Join(",", names));
        if (bossTemplate != null)
        {
            dungeonBuilder.Append(";");
            dungeonBuilder.Append(bossTemplate.Name);
        }
        dungeonBuilder.Append(reward.Export());

        return dungeonBuilder.ToString();
    }
}

public class Dungeon
{

    Collection _collection;
    string _name;
    DungeonTemplate.DungeonType _type;
     DungeonTemplate.DungeonReward _reward;
    BossCard? _boss;
    bool _hasBoss = false;

    public Collection collection => _collection.Clone();
    public string Name => _name;
    public DungeonTemplate.DungeonType Type => _type;
    public DungeonTemplate.DungeonReward Reward => _reward;
    public BossCard? boss => _boss;
    public bool HasBoss => _hasBoss;

    public Deck compileDeck()
    {
        return Deck.makeGameDeck(collection);
    }

    Dungeon(Collection collection, string name, DungeonTemplate.DungeonType type, CardTemplate? boss, DungeonTemplate.DungeonReward reward)
    {
        _collection = collection;
        _name = name;
        _type = type;
        _reward = reward;
        if (boss != null)
        {
            _boss = Card.fromTemplate(boss).promote();
            _hasBoss = true;
        }

    }
    public static Dungeon fromTemplate(DungeonTemplate template)
    {
        return new Dungeon(template.collection, template.name, template.type, template.bossTemplate, template.reward);
    }
}