using System.Text;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Serializer;
using DuszaVerseny2025.Engine.Utils;

public class CardRegistry
{
    List<CardTemplate> _templates = new List<CardTemplate>();

    public CardTemplate this[string name] => _templates.Where(t => t.name == name).First();

    public void Register(CardTemplate template)
    {
        _templates.Add(template);
    }
}

public class Collection
{
    protected List<CardTemplate> _cards;
    public Collection(List<CardTemplate> cards)
    {
        _cards = cards;
    }

    Collection(Collection instance)
    {
        _cards = instance.Cards.ToList();
    }

    public IReadOnlyList<CardTemplate> Cards => _cards;

    public CardTemplate this[int i] { get => _cards[i]; }
    public CardTemplate? this[string name] => _cards.Where(c => c.name == name).First();
    public Collection Clone() => new Collection(this);
    public int Size => _cards.Count;

    public bool AddToCollection(CardTemplate card)
    {
        bool add = true;
        foreach (var c in _cards)
        {
            if (c.name == card.name)
            {
                add = false;
                break;
            }
        }

        if (add) _cards.Add(card);
        return add;
    }

    public float CanUse => MathF.Floor(_cards.Count / 2);

    public bool Has(CardTemplate template)
    {
        return Has(template.Name);
    }

    public bool Has(string name)
    {
        return _cards.Any(t => t.name == name);
    }
}

public class PlayerCollection : Collection, ISerialize
{
    public PlayerCollection() : base(new List<CardTemplate>()) { }

    public string Export()
    {
        StringBuilder builder = new StringBuilder();
        foreach (var card in _cards)
        {
            builder.Append($"gyujtemeny;{card.name};{card.damage};{card.health};");
            builder.Append(Utils.GetTypeName(card.ElementType));
            builder.AppendLine();
        }

        return builder.ToString();
    }

    public void Upgrade(string cardName, Card.Attribute toUpgrade)
    {
        var template = _cards.Where(t => t.name == cardName).First();

        CardTemplate newTemplate;
        if (toUpgrade == Card.Attribute.Health)
        {
            newTemplate = template.MakeAnother(0, 2);
        }
        else
        {
            newTemplate = template.MakeAnother(1, 0);
        }

        _cards[_cards.IndexOf(template)] = newTemplate;
    }
}

public class Deck : ISerialize
{
    List<Card> _cards;
    Collection _collection;

    public Collection Collection => _collection;

    public Card[] Cards => _cards.Where(c => c.GetType() == typeof(Card)).ToArray();
    public BossCard BossCard => (BossCard)_cards.Where(c => c.GetType() == typeof(BossCard)).First();

    public int Size => _cards.Count;

    Deck(List<Card> cards, Collection collection)
    {
        _cards = cards;
        _collection = collection;
    }

    public static bool fromCollection(Collection collection, List<CardTemplate> cards, out Deck? deck)
    {
        if (cards.Count > collection.CanUse) { deck = null; Console.WriteLine("Limit tul"); return false; }

        List<Card> cardsCompiled = new List<Card>();
        foreach (CardTemplate card in cards)
        {
            if (collection.Cards.Contains(card)) cardsCompiled.Add(Card.fromTemplate(card));
            else { deck = null; Console.WriteLine("Valami fost akartal hasznalni!"); return false; }
        }

        deck = new Deck(cardsCompiled, collection);

        return true;
    }

    public static Deck makeGameDeck(Collection collection)
    {
        List<Card> cardsCompiled = new List<Card>();
        Array.ForEach(collection.Cards.ToArray(), card => cardsCompiled.Add(Card.fromTemplate(card)));
        return new Deck(cardsCompiled, collection);
    }

    public string Export()
    {
        StringBuilder builder = new StringBuilder();
        foreach (var card in _cards)
        {
            builder.AppendLine("pakli;" + card.Name);
        }

        return builder.ToString();
    }
}