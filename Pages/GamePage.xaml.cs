using System.Diagnostics;
using DuszaVerseny2025.Engine;
using System.Collections.ObjectModel;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.Views;
using System.Threading.Tasks;

namespace DuszaVerseny2025
{
    [QueryProperty(nameof(engine), "GameEngine")]
    [QueryProperty(nameof(currentDeck), "Deck")]
    [QueryProperty(nameof(dungeon), "Dungeon")]
    public partial class GamePage : ContentPage
    {
        private readonly GameBoardViewModel _viewModel;

        public GameEngine engine { get; set; }
        public Deck currentDeck { get; set; }
        public Dungeon dungeon { get; set; }
        public List<string> HistoryItems { get; set; } = new List<string>();

        Card currentCard;
        Card enemyCard;

        private Deck dungeonDeck;

        public GamePage()
        {
            InitializeComponent();
            _viewModel = new GameBoardViewModel();
            BindingContext = _viewModel;
            HistoryItems = new List<string>();
        }

        private async void OnNextRoundClicked(object sender, EventArgs e)
        {
            await SimulateGameTurnAsync();
        }

        private async Task SimulateGameTurnAsync()
        {
            if (int.TryParse(_viewModel.RoundText?.Split('.')[0], out int currentRound))
            {
                currentRound++;
                _viewModel.UpdateRound(currentRound);
                _viewModel.AddHistoryEntry($"{currentRound}. Kor: Player action - Kira damaged.");
                _viewModel.AddCard($"Card {currentRound}: Event text");
                RepositionDynamicCards();

                await DisplayAlert("Turn Advanced", $"Round {currentRound}!", "OK");
            }
        }

        private void RepositionDynamicCards()
        {
            var currentItems = _viewModel.Cards.ToList();
            _viewModel.Cards = new ObservableCollection<CardItem>(currentItems);

            Random rand = new Random();
            Debug.WriteLine($"Repositioned cards. Random: X={rand.NextDouble():F2}, Y={rand.NextDouble():F2}");
        }

        void RenderEnemyCards()
        {
            EnemyDeckHolder.Children.Clear();
            if (dungeon.HasBoss)
                RenderBossCard();

            RenderEnemyNormalCards();
        }

        void RenderEnemyNormalCards()
        {
            foreach (var card in dungeonDeck.Cards.Reverse())
            {
                if (enemyCard != null && card.Name == enemyCard.Name) break;

                var dcard = new GameCard()
                {
                    CardName = card.Name,
                    CardHealth = card.Health.ToString(),
                    CardDamage = card.Damage.ToString(),
                    ElementColor = card.Template.ElementColor,
                    IsBoss = false
                };
                EnemyDeckHolder.Children.Add(dcard);
            }
        }

        void RenderBossCard()
        {
            var boss = dungeon.boss;

            var card = new GameCard()
            {
                CardName = boss.Name,
                CardDamage = boss.Damage.ToString(),
                CardHealth = boss.Health.ToString(),
                IsBoss = true,
                ElementColor = boss.Template.ElementColor
            };
            EnemyDeckHolder.Children.Add(card);
        }

        void RenderPlayerCards()
        {
            PlayerDeckHolder.Children.Clear();
            foreach (var card in currentDeck.Cards.Reverse())
            {
                if (currentCard != null && card.Name == currentCard.Name) break;

                var dcard = new GameCard()
                {
                    CardName = card.Name,
                    CardDamage = card.Damage.ToString(),
                    CardHealth = card.Health.ToString(),
                    ElementColor = card.Template.ElementColor
                };
                PlayerDeckHolder.Children.Add(dcard);
            }
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();

            _viewModel.TopLabelText = dungeon.Name;

            dungeonDeck = dungeon.compileDeck();
            RenderEnemyCards();
            RenderPlayerCards();
        }

        private async Task PlayGame()
        {
            var result = await engine.GameWorld.FightDungeonButFancy(dungeon, currentDeck, OnFightEvent);
            if (result.Success)
            {
                System.Console.WriteLine("Player won!");
                // TODO: Handle victory
            }
            else
            {
                System.Console.WriteLine("Player lost");
                // TODO: Handle loss
            }
        }

        private async Task OnFightEvent(World.FightEvent ev)
        {
            if (ev.event_name.Contains("select")) await Task.Delay(500);
            else await Task.Delay(400);
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                if (ev.event_name == "game:select")
                {
                    enemyCard = (Card)ev.values["card"];
                    bool isBoss = ev.values.ContainsKey("isBoss") && (bool)ev.values["isBoss"];
                    ArenaEnemyCard.IsBoss = isBoss;
                    ArenaEnemyCard.Opacity = 0;
                    ArenaEnemyCard.Scale = 0.8f;
                    ArenaEnemyCard.TranslationY = 150;
                    ArenaEnemyCard.Rotation = 0;
                    ArenaEnemyCard.TranslationX = 0;
                    _viewModel.ShowEnemy = true;
                    _viewModel.EnemyName = enemyCard.Name;
                    _viewModel.EnemyHealth = enemyCard.Health.ToString();
                    _viewModel.EnemyDamage = enemyCard.Damage.ToString();
                    ArenaEnemyCard.ElementColor = enemyCard.Template.ElementColor;
                    RenderEnemyCards();
                    await Task.WhenAll(
                        ArenaEnemyCard.FadeTo(1, 500, Easing.CubicInOut),
                        ArenaEnemyCard.ScaleTo(1, 500, Easing.BounceOut),
                        ArenaEnemyCard.TranslateTo(0, 0, 500, Easing.CubicInOut)
                    );
                }
                else if (ev.event_name == "player:select")
                {
                    currentCard = (Card)ev.values["card"];
                    ArenaPlayerCard.Opacity = 0;
                    ArenaPlayerCard.Scale = 0.8f;
                    ArenaPlayerCard.TranslationY = -150;
                    ArenaPlayerCard.Rotation = 0;
                    ArenaPlayerCard.TranslationX = 0;
                    _viewModel.ShowCurrent = true;
                    _viewModel.CurrentName = currentCard.Name;
                    _viewModel.CurrentHealth = currentCard.Health.ToString();
                    _viewModel.CurrentDamage = currentCard.Damage.ToString();
                    ArenaPlayerCard.ElementColor = currentCard.Template.ElementColor;
                    RenderPlayerCards();
                    await Task.WhenAll(
                        ArenaPlayerCard.FadeTo(1, 500, Easing.CubicInOut),
                        ArenaPlayerCard.ScaleTo(1, 500, Easing.BounceOut),
                        ArenaPlayerCard.TranslateTo(0, 0, 500, Easing.CubicInOut)
                    );
                }
                else if (ev.event_name == "game:attack")
                {
                    int damage = (int)ev.values["damage"];
                    Card targetCard = (Card)ev.values["card"];
                    _viewModel.CurrentHealth = targetCard.Health.ToString();
                    _viewModel.CurrentDamage = targetCard.Damage.ToString();

                    ArenaEnemyCard.Scale = 1;
                    ArenaEnemyCard.Rotation = 0;
                    ArenaEnemyCard.TranslationX = 0;
                    await Task.WhenAll(
                        ArenaEnemyCard.TranslateTo(0, 75, 220, Easing.SpringOut),
                        ArenaEnemyCard.ScaleTo(1.2f, 220, Easing.SpringOut),
                        ArenaEnemyCard.RotateTo(-5, 220, Easing.SpringOut)
                    );

                    DamagePopupLabel.Text = $"-{damage}";
                    DamagePopupLabel.IsVisible = true;
                    DamagePopupLabel.Scale = 0.3f;
                    DamagePopupLabel.Opacity = 1;
                    DamagePopupLabel.TranslationY = 0;
                    await Task.WhenAll(
                        DamagePopupLabel.ScaleTo(1.4f, 180, Easing.BounceOut),
                        DamagePopupLabel.FadeTo(0, 350, Easing.CubicOut),
                        DamagePopupLabel.TranslateTo(0, -90, 350, Easing.CubicOut)
                    );
                    DamagePopupLabel.IsVisible = false;
                    DamagePopupLabel.Scale = 1;
                    DamagePopupLabel.TranslationY = 0;

                    await Task.WhenAll(
                        ArenaEnemyCard.TranslateTo(0, 0, 250, Easing.SpringIn),
                        ArenaEnemyCard.ScaleTo(1f, 250, Easing.SpringIn),
                        ArenaEnemyCard.RotateTo(0, 250, Easing.SpringIn)
                    );

                    if (int.Parse(_viewModel.CurrentHealth) <= 0)
                    {
                        await ShakeAndFade(ArenaPlayerCard);
                        _viewModel.ShowCurrent = false;
                    }
                }
                else if (ev.event_name == "player:attack")
                {
                    int damage = (int)ev.values["damage"];
                    Card targetCard = (Card)ev.values["enemy"];
                    _viewModel.EnemyHealth = targetCard.Health.ToString();
                    _viewModel.EnemyDamage = targetCard.Damage.ToString();

                    ArenaPlayerCard.Scale = 1;
                    ArenaPlayerCard.Rotation = 0;
                    ArenaPlayerCard.TranslationX = 0;
                    await Task.WhenAll(
                        ArenaPlayerCard.TranslateTo(0, -75, 220, Easing.SpringOut),
                        ArenaPlayerCard.ScaleTo(1.2f, 220, Easing.SpringOut),
                        ArenaPlayerCard.RotateTo(5, 220, Easing.SpringOut)
                    );

                    DamagePopupLabel.Text = $"-{damage}";
                    DamagePopupLabel.IsVisible = true;
                    DamagePopupLabel.Scale = 0.3f;
                    DamagePopupLabel.Opacity = 1;
                    DamagePopupLabel.TranslationY = 0;
                    await Task.WhenAll(
                        DamagePopupLabel.ScaleTo(1.4f, 180, Easing.BounceOut),
                        DamagePopupLabel.FadeTo(0, 350, Easing.CubicOut),
                        DamagePopupLabel.TranslateTo(0, -90, 350, Easing.CubicOut)
                    );
                    DamagePopupLabel.IsVisible = false;
                    DamagePopupLabel.Scale = 1;
                    DamagePopupLabel.TranslationY = 0;

                    await Task.WhenAll(
                        ArenaPlayerCard.TranslateTo(0, 0, 250, Easing.SpringIn),
                        ArenaPlayerCard.ScaleTo(1f, 250, Easing.SpringIn),
                        ArenaPlayerCard.RotateTo(0, 250, Easing.SpringIn)
                    );

                    if (int.Parse(_viewModel.EnemyHealth) <= 0)
                    {
                        await ShakeAndFade(ArenaEnemyCard);
                        _viewModel.ShowEnemy = false;
                    }
                }
            });
        }

        private async Task ShakeAndFade(View card)
        {
            await Task.WhenAll(
                card.TranslateTo(15, 0, 120, Easing.SinIn),
                card.RotateTo(-8, 120, Easing.SinIn)
            );
            await Task.WhenAll(
                card.TranslateTo(-15, 0, 120, Easing.SinIn),
                card.RotateTo(8, 120, Easing.SinIn)
            );
            await Task.WhenAll(
                card.TranslateTo(0, 0, 120, Easing.SinIn),
                card.RotateTo(0, 120, Easing.SinIn)
            );
            await card.FadeTo(0, 400, Easing.CubicIn);
            card.Opacity = 1;
            card.TranslationX = 0;
            card.TranslationY = 0;
            card.Rotation = 0;
            card.Scale = 1;
        }
        protected override bool OnBackButtonPressed()
        {
            Device.BeginInvokeOnMainThread(async () =>
            {
                await Shell.Current.GoToAsync("..");
            });
            return true;
        }

        private void StartButton_clicked(object sender, EventArgs e)
        {
            _viewModel.ShowStart = false;
            PlayGame();
        }
    }
}
