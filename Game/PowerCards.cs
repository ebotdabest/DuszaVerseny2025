namespace DuszaVerseny2025.Engine.Cards;

public interface IPowerCard
{
    string getName();
    int getValue();
    int getDuration();
    int getTimeLeft();
    int getRarity();

    bool ApplyEffect(Card currentCard, Card currentEnemyCard, bool isPlayer);
}

public abstract class PowerCard : IPowerCard
{
    int duration, value, rarity;
    string name;

    int roundsLeft;

    public PowerCard(int duration, int value, string name, int rarity)
    {
        this.duration = duration;
        this.value = value;
        this.name = name;
        this.rarity = rarity;
        roundsLeft = duration;
    }

    public abstract bool ApplyEffect(Card currentCard, Card currentEnemyCard, bool isPlayer);

    public int getDuration()
    {
        return duration;
    }

    public string getName()
    {
        return name;
    }

    public int getValue()
    {
        return value;
    }

    public int getTimeLeft()
    {
        return roundsLeft;
    }

    public bool spendRound()
    {
        roundsLeft--;
        if (roundsLeft <= 0) return true;

        return false;
    }

    public int getRarity()
    {
        return rarity;
    }

    public abstract PowerCard Clone();
}

public class HealPower : PowerCard
{
    public HealPower(int duration, int value, string name, int rarity) : base(duration, value, name, rarity) { }

    public override bool ApplyEffect(Card currentCard, Card currentEnemyCard, bool isPlayer)
    {
        currentCard.Heal(getValue());
        return true;
    }

    public override PowerCard Clone()
    {
        return new HealPower(getDuration(), getValue(), getName(), getRarity());
    }
}

public class ShieldPower : PowerCard
{
    public ShieldPower(int duration, int value, string name, int rarity) : base(duration, value, name, rarity) { }

    public override bool ApplyEffect(Card currentCard, Card currentEnemyCard, bool isPlayer)
    {
        return true;
    }

    public override PowerCard Clone()
    {
        return new ShieldPower(getDuration(), getValue(), getName(), getRarity());
    }
}

public class DamagePower : PowerCard
{
    public DamagePower(int duration, int value, string name, int rarity) : base(duration, value, name, rarity) { }

    public override bool ApplyEffect(Card currentCard, Card currentEnemyCard, bool isPlayer)
    {
        if (isPlayer)
        {
            currentEnemyCard.ApplyDamage(getValue());
            return currentEnemyCard.Health <= 0;
        }
        else
        {
            currentCard.ApplyDamage(getValue());
            return currentCard.Health <= 0;
        }
    }

    public override PowerCard Clone()
    {
        return new DamagePower(getDuration(), getValue(), getName(), getRarity());
    }
}


public class StrengthPower : PowerCard
{
    public StrengthPower(int duration, int value, string name, int rarity) : base(duration, value, name, rarity) { }

    public override bool ApplyEffect(Card currentCard, Card currentEnemyCard, bool isPlayer)
    {
        return true;
    }

    public override PowerCard Clone()
    {
        return new StrengthPower(getDuration(), getValue(), getName(), getRarity());
    }
}
