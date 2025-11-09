namespace DuszaVerseny2025.Views;

public partial class GameCard : ContentView
{
    public static readonly BindableProperty CardNameProperty =
    BindableProperty.Create(nameof(CardName), typeof(string), typeof(GameCard), String.Empty);

    public static readonly BindableProperty CardHealthProperty =
    BindableProperty.Create(nameof(CardHealth), typeof(string), typeof(GameCard), String.Empty);

    public static readonly BindableProperty CardDamageProperty =
    BindableProperty.Create(nameof(CardDamage), typeof(string), typeof(GameCard), String.Empty);
    public static readonly BindableProperty IsBossProperty =
    BindableProperty.Create(nameof(IsBoss), typeof(bool), typeof(GameCard), false);

    public static readonly BindableProperty ElementColorProperty =
    BindableProperty.Create(nameof(ElementColor), typeof(Color), typeof(GameCard), Color.FromRgba(0, 0, 0, 0));


    public string CardName
    {
        get => (string)GetValue(CardNameProperty);
        set => SetValue(CardNameProperty, value);
    }
    public string CardHealth
    {
        get => (string)GetValue(CardHealthProperty);
        set => SetValue(CardHealthProperty, value);
    }
    public string CardDamage
    {
        get => (string)GetValue(CardDamageProperty);
        set => SetValue(CardDamageProperty, value);
    }
    public Color ElementColor
    {
        get => (Color)GetValue(ElementColorProperty);
        set => SetValue(ElementColorProperty, value);
    }

    public bool IsBoss
    {
        get => (bool)GetValue(IsBossProperty);
        set => SetValue(IsBossProperty, value);
    }

    public GameCard()
    {
        InitializeComponent();
    }
}