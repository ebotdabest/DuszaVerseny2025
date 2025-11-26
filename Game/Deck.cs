using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Engine.Serializer;
using DuszaVerseny2025.Engine.Utils;

public class CardRegistry
{
    private readonly List<CardTemplate> _templates = new List<CardTemplate>();

    /// <summary>
    /// Gets a card template by name. Throws if not found.
    /// </summary>
    public CardTemplate this[string name]
    {
        get
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Card name cannot be null or whitespace.", nameof(name));

            var card = _templates.FirstOrDefault(t => t.name == name);
            if (card == null)
                throw new KeyNotFoundException($"CardTemplate with name '{name}' was not found in the registry.");

            return card;
        }
    }

    public void Register(CardTemplate template)
    {
        if (template == null) throw new ArgumentNullException(nameof(template));

        // Optional: prevent duplicates by name
        if (_templates.Any(t => t.name == template.name))
            throw new InvalidOperationException($"A card with name '{template.name}' is already registered.");

        _templates.Add(template);
    }

    public bool TryGet(string name, out CardTemplate? template)
    {
        template = _templates.FirstOrDefault(t => t.name == name);
        return template != null;
    }

    public IReadOnlyList<CardTemplate> Templates => _templates;
}

public class Collection
{
    protected readonly List<CardTemplate> _cards;

    public Collection(List<CardTemplate> cards)
    {
        _cards = cards ?? throw new ArgumentNullException(nameof(cards));
    }

    // Copy constructor (kept same accessibility: no modifier => internal)
    Collection(Collection instance)
    {
        if (instance == null) throw new ArgumentNullException(nameof(instance));
        _cards = instance.Cards.ToList();
    }

    public IReadOnlyList<CardTemplate> Cards => _cards;

    public CardTemplate this[int i]
    {
        get
        {
            if (i < 0 || i >= _cards.Count)
                throw new ArgumentOutOfRangeException(nameof(i), $"Index {i} is out of range (0..{_cards.Count - 1}).");
            return _cards[i];
        }
    }

    /// <summary>
    /// Name indexer: returns null if not found (now matches its nullable type).
    /// </summary>
    public CardTemplate? this[string name]
    {
        get
        {
            if (string.IsNullOrWhiteSpace(name))
                return null;
            return _cards.FirstOrDefault(c => c.name == name);
        }
    }

    public Collection Clone() => new Collection(this);

    public int Size => _cards.Count;

    /// <summary>
    /// Adds a card if no other card with the same name exists.
    /// Returns true if added, false if a card with the same name already exists.
    /// </summary>
    public bool AddToCollection(CardTemplate card)
    {
        if (card == null) throw new ArgumentNullException(nameof(card));

        if (_cards.Any(c => c.name == card.name))
            return false;

        _cards.Add(card);
        return true;
    }

    /// <summary>
    /// Maximum number of cards that can be used (integer division by 2).
    /// </summary>
    public int MaxUsableCards => _cards.Count / 2;

    /// <summary>
    /// Kept for compatibility: original float-based property.
    /// Basically the same as MaxUsableCards, just as a float.
    /// </summary>
    public float CanUse => MaxUsableCards;

    public bool Has(CardTemplate template)
    {
        if (template == null) throw new ArgumentNullException(nameof(template));
        return Has(template.Name);
    }

    public bool Has(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        return _cards.Any(t => t.name == name);
    }

    public void Purge(CardTemplate card)
    {
        _cards.Remove(card);
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
        if (string.IsNullOrWhiteSpace(cardName))
            throw new ArgumentException("Card name cannot be null or whitespace.", nameof(cardName));

        var template = _cards.FirstOrDefault(t => t.name == cardName);
        if (template == null)
            throw new KeyNotFoundException($"Cannot upgrade: card '{cardName}' not found in player collection.");

        CardTemplate newTemplate;
        if (toUpgrade == Card.Attribute.Health) newTemplate = template.MakeAnother(0, 2);
        else if (toUpgrade == Card.Attribute.Damage) newTemplate = template.MakeAnother(1, 0);
        else return;

        int idx = -1;
        foreach (var card in _cards)
        {
            if (card.name == cardName)
            {
                idx++;
                break;
            }
            idx++;
        }

        if (idx >= 0) _cards[idx] = newTemplate;
    }
}

public class Deck : ISerialize
{
    private readonly List<Card> _cards;
    private readonly Collection _collection;

    public Collection Collection => _collection;

    public Card[] Cards => _cards.OfType<Card>().ToArray();

    public BossCard BossCard
        => _cards.OfType<BossCard>().First();

    public int Size => _cards.Count;

    // Kept same accessibility (no modifier)
    Deck(List<Card> cards, Collection collection)
    {
        _cards = cards ?? throw new ArgumentNullException(nameof(cards));
        _collection = collection ?? throw new ArgumentNullException(nameof(collection));
    }

    /// <summary>
    /// Builds a deck from a collection and selected card templates.
    /// Fails if too many cards or if a card is not in the collection.
    /// </summary>
    public static bool fromCollection(Collection collection, List<CardTemplate> cards, out Deck? deck)
    {
        if (collection == null) throw new ArgumentNullException(nameof(collection));
        if (cards == null) throw new ArgumentNullException(nameof(cards));

        // using MaxUsableCards, but keeping same behaviour as original CanUse check
        if (cards.Count > collection.MaxUsableCards)
        {
            deck = null;
            Console.WriteLine("Limit tul");
            return false;
        }

        List<Card> cardsCompiled = new List<Card>();
        foreach (CardTemplate card in cards)
        {
            if (collection.Has(card))
            {
                cardsCompiled.Add(Card.fromTemplate(card));
            }
            else
            {
                deck = null;
                Console.WriteLine("Valami fost akartal hasznalni!");
                return false;
            }
        }

        deck = new Deck(cardsCompiled, collection);
        return true;
    }

    public static Deck makeGameDeck(Collection collection)
    {
        if (collection == null) throw new ArgumentNullException(nameof(collection));

        List<Card> cardsCompiled = new List<Card>();
        foreach (var cardTemplate in collection.Cards)
        {
            cardsCompiled.Add(Card.fromTemplate(cardTemplate));
        }

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
