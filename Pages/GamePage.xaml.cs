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

        Card currentCard;
        Card enemyCard;

        private Deck dungeonDeck;

        public GamePage()
        {
            InitializeComponent();
            _viewModel = new GameBoardViewModel();
            BindingContext = _viewModel;
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
            if (result.Succsess)
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
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (ev.event_name == "game:select")
                {
                    enemyCard = (Card)ev.values["card"];
                    _viewModel.ShowEnemy = true;
                    _viewModel.EnemyName = enemyCard.Name;
                    _viewModel.EnemyHealth = enemyCard.Health.ToString();
                    _viewModel.EnemyDamage = enemyCard.Damage.ToString();
                    RenderEnemyCards();
                }

                else if (ev.event_name == "player:select")
                {
                    currentCard = (Card)ev.values["card"];
                    _viewModel.ShowCurrent = true;
                    _viewModel.CurrentName = currentCard.Name;
                    _viewModel.CurrentHealth = currentCard.Health.ToString();
                    _viewModel.CurrentDamage = currentCard.Damage.ToString();
                    RenderPlayerCards();
                }

                else if (ev.event_name == "game:attack")
                {
                    Card card = (Card)ev.values["card"];
                    _viewModel.CurrentHealth = card.Health.ToString();
                    _viewModel.CurrentDamage = card.Damage.ToString();
                }
                else if (ev.event_name == "player:attack")
                {
                    System.Console.WriteLine("enemy attack!");
                    Card enemy = (Card)ev.values["enemy"];
                    _viewModel.EnemyHealth = enemy.Health.ToString();
                    _viewModel.EnemyDamage = enemy.Damage.ToString();
                }
                else if (ev.event_name == "result")
                {

                }
            });
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
