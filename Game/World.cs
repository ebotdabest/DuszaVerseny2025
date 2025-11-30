
using System.Text;
using DuszaVerseny2025;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Serializer;

namespace DuszaVerseny2025.Engine
{
    public class World
    {
        Collection _worldCollection;

        List<DungeonTemplate> _dungeons;

        public DungeonTemplate[] Dungeons => _dungeons.ToArray();

        public World(List<CardTemplate> cards, List<DungeonTemplate> dungeons, int diff)
        {
            _worldCollection = new Collection(cards);
            _dungeons = dungeons;
            _difficulty = diff;
        }

        public Dungeon generateDungeon(DungeonTemplate dungeon)
        {
            return Dungeon.fromTemplate(dungeon);
        }

        public record FightEvent(string event_name, Dictionary<string, object?> values)
        {
            public static FightEvent makeEvent(string name, params (string key, object? value)[] kwargs)
            {
                var dict = kwargs.ToDictionary(k => k.key, k => k.value);
                return new FightEvent(name, dict);
            }
        }

        private int Choice(Card c)
        {
            return c.Health > 0 ? 1 : 0;
        }

        public record FightResult(bool Success, string lastCard) { }

        public async Task<FightResult> FightDungeonButFancy(Dungeon d, Deck playerDeck, Func<FightEvent, Task> callback)
        {
            Deck dungeonDeck = d.compileDeck();

            int currentPlayerIndex = 0, currentEnemyIndex = 0;

            int round = 1;
            Card initialEnemy = dungeonDeck.Cards[currentEnemyIndex];
            Card initialPlayer = playerDeck.Cards[currentPlayerIndex];
            await callback(FightEvent.makeEvent("round", ("round", round)));

            await callback(FightEvent.makeEvent("game:select", ("round", round), ("card", initialEnemy))).ConfigureAwait(false);
            await callback(FightEvent.makeEvent("player:select", ("round", round), ("card", initialPlayer))).ConfigureAwait(false);
            await callback(FightEvent.makeEvent("round_over", ("round", round)));
            try
            {
                bool playerLost = false;
                while (currentPlayerIndex < playerDeck.Size && currentEnemyIndex < dungeonDeck.Size)
                {
                    round++;
                    await callback(FightEvent.makeEvent("round", ("round", round)));
                    Card currentPlayerCard = playerDeck.Cards[currentPlayerIndex];
                    Card currentEnemyCard = dungeonDeck.Cards[currentEnemyIndex];

                    int enemyChoice = Choice(currentEnemyCard);
                    if (enemyChoice == 0)
                    {
                        currentEnemyIndex++;
                        if (currentEnemyIndex >= dungeonDeck.Size)
                        {
                            break;
                        }
                        currentEnemyCard = dungeonDeck.Cards[currentEnemyIndex];
                        await callback(FightEvent.makeEvent("game:select", ("round", round), ("card", currentEnemyCard), ("index", currentEnemyIndex)));
                    }
                    else if (enemyChoice == 1)
                    {
                        int damageDealt;
                        Console.WriteLine($"Enemy attack {currentEnemyCard.Name}: {currentEnemyCard.Damage}");
                        currentEnemyCard.Attack(currentPlayerCard, false, out damageDealt);
                        await callback(FightEvent.makeEvent("game:attack", ("round", round), ("enemy", currentEnemyCard),
                            ("card", currentPlayerCard), ("damage", damageDealt)));
                    }

                    System.Console.WriteLine(currentPlayerCard.Name + ";" + currentEnemyCard.Health);
                    int playerChoice = Choice(currentPlayerCard);
                    if (playerChoice == 0)
                    {
                        currentPlayerIndex++;
                        if (currentPlayerIndex >= playerDeck.Size)
                        {
                            playerLost = true;
                            break;
                        }
                        currentPlayerCard = playerDeck.Cards[currentPlayerIndex];
                        await callback(FightEvent.makeEvent("player:select", ("round", round), ("card", currentPlayerCard), ("index", currentPlayerIndex)));
                    }
                    else if (playerChoice == 1)
                    {
                        int damageDealt;
                        currentPlayerCard.Attack(currentEnemyCard, true, out damageDealt);
                        await callback(FightEvent.makeEvent("player:attack", ("round", round), ("card", currentPlayerCard), ("enemy", currentEnemyCard), ("damage", damageDealt)));
                    }
                    await callback(FightEvent.makeEvent("round_over", ("round", round)));
                }

                System.Console.WriteLine(playerLost);

                if (playerLost)
                {
                    await callback(FightEvent.makeEvent("result", ("round", round), ("result", "jatekos vesztett")));
                    return new FightResult(false, "");
                }

                if (!d.HasBoss)
                {
                    Card card = playerDeck.Cards[currentPlayerIndex];
                    await callback(FightEvent.makeEvent("result", ("round", round), ("result", $"jatekos nyert{d.Reward.Export()};{card.Name}")));
                    return new FightResult(true, card.Name);
                }

                BossCard boss = d.boss;
                bool isDead = false;

                await callback(FightEvent.makeEvent("game:select", ("round", round), ("card", boss), ("isBoss", true)));
                int dmg;
                Card currentCard = playerDeck.Cards[currentPlayerIndex];
                currentCard.Attack(boss, true, out dmg);
                await callback(FightEvent.makeEvent("player:attack", ("card", currentCard),
                ("enemy", boss), ("damage", dmg), ("round", round)));

                while (boss.Health > 0 && !isDead)
                {
                    int damage;
                    boss.Attack(currentCard, false, out damage);
                    await callback(FightEvent.makeEvent("game:attack", ("round", round), ("enemy", boss),
                            ("card", currentCard), ("damage", damage)));

                    if (currentCard.Health <= 0)
                    {
                        currentPlayerIndex++;
                        if (currentPlayerIndex >= playerDeck.Size)
                        {
                            isDead = true;
                            break;
                        }
                        currentCard = playerDeck.Cards[currentPlayerIndex];
                        await callback(FightEvent.makeEvent("player:select", ("round", round), ("card", currentCard)));
                        continue;
                    }
                    else
                    {
                        int plyDmg;
                        currentCard.Attack(boss, true, out plyDmg);
                        await callback(FightEvent.makeEvent("player:attack", ("card", currentCard),
                        ("enemy", boss), ("damage", plyDmg), ("round", round)));

                    }
                    round++;

                }

                if (isDead)
                {
                    await callback(FightEvent.makeEvent("result", ("round", round), ("result", "jatekos vesztett")));
                    return new FightResult(false, "");
                }
                await callback(FightEvent.makeEvent("result", ("round", round), ("result", $"jatekos nyert{d.Reward.Export()};{currentCard.Name}")));

                return new FightResult(true, currentCard.Name);
            }
            catch (Exception e)
            {
                System.Console.WriteLine(e.ToString());
                return null;
            }
        }

        public bool FightDungeon(Dungeon d, Deck playerDeck, ref string lastCard, Action<FightEvent> callback)
        {
            Deck dungeonDeck = d.compileDeck();

            int currentPlayerIndex = 0, currentEnemyIndex = 0;

            int round = 1;

            Card initialEnemy = dungeonDeck.Cards[currentEnemyIndex];
            Card initialPlayer = playerDeck.Cards[currentPlayerIndex];

            callback.Invoke(FightEvent.makeEvent("game:select", ("round", round), ("card", initialEnemy)));
            callback.Invoke(FightEvent.makeEvent("player:select", ("round", round), ("card", initialPlayer)));
            round++;
            callback.Invoke(FightEvent.makeEvent("round", ("round", round)));

            bool playerLost = false;
            while (currentPlayerIndex < playerDeck.Size && currentEnemyIndex < dungeonDeck.Size)
            {
                Card currentPlayerCard = playerDeck.Cards[currentPlayerIndex];
                Card currentEnemyCard = dungeonDeck.Cards[currentEnemyIndex];

                int enemyChoice = Choice(currentEnemyCard);
                if (enemyChoice == 0)
                {
                    currentEnemyIndex++;
                    if (currentEnemyIndex >= dungeonDeck.Size)
                    {
                        break;
                    }
                    currentEnemyCard = dungeonDeck.Cards[currentEnemyIndex];
                    callback.Invoke(FightEvent.makeEvent("game:select", ("round", round), ("card", currentEnemyCard), ("index", currentEnemyIndex)));
                }
                else if (enemyChoice == 1)
                {
                    int damageDealt;
                    currentEnemyCard.Attack(currentPlayerCard, false, out damageDealt);
                    callback.Invoke(FightEvent.makeEvent("game:attack", ("round", round), ("enemy", currentEnemyCard),
                        ("card", currentPlayerCard), ("damage", damageDealt)));
                }

                int playerChoice = Choice(currentPlayerCard);
                if (playerChoice == 0)
                {
                    currentPlayerIndex++;
                    if (currentPlayerIndex >= playerDeck.Size)
                    {
                        playerLost = true;
                        break;
                    }
                    currentPlayerCard = playerDeck.Cards[currentPlayerIndex];
                    callback.Invoke(FightEvent.makeEvent("player:select", ("round", round), ("card", currentPlayerCard), ("index", currentPlayerIndex)));
                }
                else if (playerChoice == 1)
                {
                    int damageDealt;
                    currentPlayerCard.Attack(currentEnemyCard, true, out damageDealt);
                    callback.Invoke(FightEvent.makeEvent("player:attack", ("round", round), ("card", currentPlayerCard), ("enemy", currentEnemyCard), ("damage", damageDealt)));
                }

                callback.Invoke(FightEvent.makeEvent("round", ("round", round)));
                round++;
            }

            if (playerLost)
            {
                callback.Invoke(FightEvent.makeEvent("result", ("round", round), ("result", "jatekos vesztett")));
                return false;
            }

            if (!d.HasBoss)
            {
                Card card = playerDeck.Cards[currentPlayerIndex];
                lastCard = card.Name;
                callback.Invoke(FightEvent.makeEvent("result", ("round", round), ("result", $"jatekos nyert{d.Reward.Export()};{card.Name}")));
                return true;
            }

            BossCard boss = d.boss;
            bool isDead = false;

            callback.Invoke(FightEvent.makeEvent("game:select", ("round", round), ("card", boss)));
            int dmg;
            Card currentCard = playerDeck.Cards[currentPlayerIndex];
            currentCard.Attack(boss, true, out dmg);
            callback.Invoke(FightEvent.makeEvent("player:attack", ("card", currentCard),
            ("enemy", boss), ("damage", dmg), ("round", round)));

            while (boss.Health > 0 && !isDead)
            {
                int damage;
                boss.Attack(currentCard, false, out damage);
                callback.Invoke(FightEvent.makeEvent("game:attack", ("round", round), ("enemy", boss),
                        ("card", currentCard), ("damage", damage)));

                if (currentCard.Health <= 0)
                {
                    currentPlayerIndex++;
                    if (currentPlayerIndex >= playerDeck.Size)
                    {
                        isDead = true;
                        break;
                    }
                    currentCard = playerDeck.Cards[currentPlayerIndex];
                    callback.Invoke(FightEvent.makeEvent("player:select", ("round", round), ("card", currentCard)));
                    continue;
                }
                else
                {
                    int plyDmg;
                    currentCard.Attack(boss, true, out plyDmg);
                    callback.Invoke(FightEvent.makeEvent("player:attack", ("card", currentCard),
                    ("enemy", boss), ("damage", plyDmg), ("round", round)));

                }
                round++;

            }

            if (isDead)
            {
                callback.Invoke(FightEvent.makeEvent("result", ("round", round), ("result", "jatekos vesztett")));
                return false;
            }
            lastCard = currentCard.Name;
            callback.Invoke(FightEvent.makeEvent("result", ("round", round), ("result", $"jatekos nyert{d.Reward.Export()};{currentCard.Name}")));
            return true;
        }

        public void SetBaseId(int baseId)
        {
            _baseId = baseId;
        }

        int _difficulty;
        int _baseId;
        public int Difficulty { get => _difficulty; set => _difficulty = value; }
        public int BaseId => _baseId;
    }

    public class DungeonTemplate : ISerialize
    {
        public DungeonType type { get; init; }
        public string name { get; init; }
        public Collection collection { get; init; }
        public CardTemplate? bossTemplate { get; set; }
        public DungeonReward reward { get; init; }

        public DungeonTemplate(DungeonType type, string name, Collection collection, CardTemplate? bossTemplate, DungeonReward reward)
        {
            this.type = type;
            this.name = name;
            this.collection = collection;
            this.bossTemplate = bossTemplate;
            this.reward = reward;
        }

        public DungeonTemplate(DungeonType type, string name, Collection collection, DungeonReward reward)
            : this(type, name, collection, null, reward) { }

        public interface DungeonReward : ISerialize
        {
            public string Grant(PlayerCollection playerCollection, CardTemplate lastPlayedCard);
        }

        public class AttributeReward : DungeonReward
        {
            public Card.Attribute attribute;

            public AttributeReward(Card.Attribute attribute)
            {
                this.attribute = attribute;
            }

            public string Export()
            {
                return $";{Utils.Utils.GetAttributeName(attribute)}";
            }

            public string Grant(PlayerCollection playerCollection, CardTemplate lastPlayedCard)
            {
                System.Console.WriteLine($"Upgrading {lastPlayedCard.name}'s {Export()}");
                playerCollection.Upgrade(lastPlayedCard.name, attribute);
                var amount = attribute == Card.Attribute.Damage ? 1 : 2;
                var what = attribute == Card.Attribute.Damage ? "Sebzést" : "Életerőt";
                return $"A {lastPlayedCard.name} kártyád kap +{amount} {what}";
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

            public string Grant(PlayerCollection playerCollection, CardTemplate lastPlayedCard)
            {
                string[] names = new string[playerCollection.Size];
                for (int i = 0; i < playerCollection.Size; i++) names[i] = playerCollection.Cards[i].Name;

                foreach (var reward in rewards)
                {
                    if (!names.Contains(reward.Name))
                    {
                        playerCollection.AddToCollection(reward);
                        return $"Megkaptad a {reward.Name} kártyát!";
                    }
                }

                return "Nincs olyan kártya amit kaphatnál!";
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
            foreach (var card in args[2].Split(","))
            {
                var c = cards.Where(t => t.name == card).ToArray();
                if (c.Length > 0)
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

            if (type == DungeonType.Small)
            {
                var reward = Utils.Utils.GetAttributeByName(args[3]);
                return new DungeonTemplate(type, args[1], dungeonCards, new AttributeReward(reward));
            }
            else if (type == DungeonType.Medium)
            {
                var reward = Utils.Utils.GetAttributeByName(args[4]);
                var boss = cards.Where(t => t.bossName == args[3]).First();
                return new DungeonTemplate(type, args[1], dungeonCards, boss, new AttributeReward(reward));
            }
            else if (type == DungeonType.Big)
            {
                var boss = cards.Where(t => t.bossName == args[3]).First();
                return new DungeonTemplate(type, args[1], dungeonCards, boss, new CardReward(dungeonTemplates.ToArray()));
            }
            return null;
        }

        public string Export()
        {
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
            System.Console.WriteLine($"reward: {reward}");
            dungeonBuilder.Append(reward.Export());

            return dungeonBuilder.ToString();
        }

        public void Orphan()
        {
            this.bossTemplate = null;
        }

        public override bool Equals(object? obj)
        {
            if (obj is not DungeonTemplate other) return false;

            return name == other.name;
        }

        public static bool operator ==(DungeonTemplate? left, DungeonTemplate? right)
        {
            if (left is null || right is null) return false;
            return left.Equals(right);
        }

        public static bool operator !=(DungeonTemplate? left, DungeonTemplate? right)
        {
            return !(left == right);
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
        public List<PowerCard> activeEnemyPowers = new List<PowerCard>();
        public List<PowerCard> activePlayerPowers = new List<PowerCard>();

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
}

public class DungeonPathTemplate
{
    DungeonTemplate[] _dungeons;
    string _name;

    public DungeonTemplate[] Dungeons => _dungeons.ToArray();
    public string Name => _name;
    CardTemplate[] _rewards;
    int[] _rewardCounts;
    public CardTemplate[] Rewards => _rewards.ToArray();
    public int[] RewardCounts => _rewardCounts;

    public void setDungeons(DungeonTemplate[] newDungeons)
    {
        _dungeons = newDungeons;
    }

    public DungeonPathTemplate(string name, DungeonTemplate[] dungeons, CardTemplate[] rewards, int[] rewardCounts)
    {
        _dungeons = dungeons;
        _name = name;
        _rewards = rewards;
        _rewardCounts = rewardCounts;
    }
}

public class DungeonPath
{

    int currentStage = 0;

    Deck playerDeck;

    Func<World.FightEvent, Task> callbackFunc;
    DungeonPathTemplate _template;

    public DungeonPath(DungeonPathTemplate template, Deck playerDeck, Func<World.FightEvent, Task> callback)
    {
        this.playerDeck = playerDeck;
        callbackFunc = callback;
        _template = template;
    }

    public async Task<bool> FightPath(GameEngine engine)
    {
        bool hasLostOnce = false;
        for (int state = 0; !hasLostOnce && state < _template.Dungeons.Length; state++)
        {
            bool hasWon = await fightState(state, engine);
            if (!hasWon) hasLostOnce = true;
        }

        if (!hasLostOnce) return true;

        return false;
    }

    async Task<bool> fightState(int dungeon, GameEngine engine)
    {
        var d = Dungeon.fromTemplate(_template.Dungeons[dungeon]);
        var res = await engine.GameWorld.FightDungeonButFancy(d, playerDeck.Clone(), OnFightEvent);
        if (res.Success)
        {
            await callbackFunc(World.FightEvent.makeEvent("dungeonp:dungeonwon", ("dungeonidx", dungeon), ("round", -1)));
            return true;
        }

        await callbackFunc(World.FightEvent.makeEvent("dungeonp:dungeonlost", ("dungeonidx", dungeon), ("round", -1)));
        return false;

    }

    async Task OnFightEvent(World.FightEvent ev)
    {
        await callbackFunc(ev);
    }
}