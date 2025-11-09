using System.Collections.ObjectModel;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.ViewModels;
using DuszaVerseny2025.Pages;
using System.Linq;
using System.Threading.Tasks;
using DuszaVerseny2025.Views;

namespace DuszaVerseny2025
{
    public partial class MainPage : ContentPage
    {
        public static MainPage Current { get; private set; }

        public ObservableCollection<CardViewModel> AvailableCards { get; } = new();
        public ObservableCollection<CardViewModel> SelectedCards { get; } = new();

        public Command DungeonButtonCommand { get; }
        public MainPage()
        {
            InitializeComponent();
            Current = this;
            BindingContext = this;

            MessagingCenter.Subscribe<CardView, CardViewModel>(this, "CardTapped", OnCardTapped);
            MessagingCenter.Subscribe<GamePage>(this, "DungeonWon", (sender) => RefreshAvailableCards());
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            RefreshAvailableCards();
            UpdateSelectionLabel();
            ShowDungeons(MauiProgram.engine.GameWorld.Dungeons);
        }

        void ShowDungeons(DungeonTemplate[] dungeons)
        {
            DungeonContainer.Children.Clear();
            foreach (var dungeon in dungeons)
            {
                DungeonCard card;
                if (dungeon.bossTemplate == null)
                {
                    card = new DungeonCard()
                    {
                        Title = dungeon.name,
                        OnClick = new Command(async () => await OnDungeonSelected(dungeon))
                    };
                }
                else
                {
                    card = new DungeonCard()
                    {
                        Title = dungeon.name,
                        ShowCard = true,
                        BossDamage = dungeon.bossTemplate.damage.ToString(),
                        BossHealth = dungeon.bossTemplate.health.ToString(),
                        BossName = dungeon.bossTemplate.name,
                        OnClick = new Command(async () => await OnDungeonSelected(dungeon))
                    };
                }
                DungeonContainer.Children.Add(card);
            }
        }

        async Task OnDungeonSelected(DungeonTemplate dungeonTemplate)
        {
            var dungeon = MauiProgram.engine.GameWorld.generateDungeon(dungeonTemplate);
            if (MauiProgram.deckBuilder.Count == 0)
            {
                await DisplayAlert("Hiba", "Legyen nálad legalább 1 kártya!", "Ok");
                return;
            }

            Deck deck;
            System.Console.WriteLine("Cards you bitch!!!");
            foreach (var t in MauiProgram.deckBuilder)
            {
                System.Console.WriteLine(t);
            }
            Deck.fromCollection(MauiProgram.engine.PlayerInventory, MauiProgram.deckBuilder, out deck);

            var parameters = new Dictionary<string, object>
            {
                ["Deck"] = deck,
                ["Dungeon"] = dungeon
            };
            await Shell.Current.GoToAsync(nameof(GamePage), parameters);

        }

        void RefreshIfDeck()
        {
            if (MauiProgram.deckBuilder.Count <= 0) return;

            List<CardTemplate> refreshedDeckBuilder = new List<CardTemplate>();
            SelectedCards.Clear();
            foreach (var card in MauiProgram.deckBuilder)
            {
                var template = card;
                if (!MauiProgram.engine.PlayerInventory.Cards.Any(t => t == card))
                {
                    template = MauiProgram.engine.PlayerInventory.Cards.Where(t => t.name == card.name).First();
                }
                refreshedDeckBuilder.Add(template);

                var vm = AvailableCards.Where(vm => vm.Template.name == card.name).First();
                int originalIndex = AvailableCards.IndexOf(vm);
                AvailableCards.Remove(vm);
                vm.OriginalIndex = ++originalIndex;
                vm.IsSelected = true;
                vm.Template = template;
                SelectedCards.Add(vm);
            }
            MauiProgram.deckBuilder = refreshedDeckBuilder;
            ReorderSelectedCards();
        }

        private void RefreshAvailableCards()
        {
            AvailableCards.Clear();
            int index = 0;
            foreach (var template in MauiProgram.engine.CardTemplates)
            {

                CardViewModel vm;
                if (MauiProgram.engine.PlayerInventory.Has(template))
                {
                    var ply = MauiProgram.engine.PlayerInventory.Cards.Where(t => t.name == template.name).First();
                    vm = new CardViewModel(ply)
                    {
                        IsInteractable = true,
                        OriginalIndex = index++
                    };
                }
                else
                {
                    vm = new CardViewModel(template)
                    {
                        IsInteractable = false,
                        OriginalIndex = index++
                    };
                }
                AvailableCards.Add(vm);
            }
            RefreshIfDeck();
        }
        private async void OnCardTapped(CardView sender, CardViewModel vm)
        {
            if (!vm.IsInteractable) return;

            if (vm.IsSelected)
            {
                vm.IsSelected = false;
                vm.Order = 0;
                SelectedCards.Remove(vm);

                MauiProgram.deckBuilder.Remove(vm.Template);
                if (vm.OriginalIndex >= 0 && vm.OriginalIndex <= AvailableCards.Count)
                {
                    AvailableCards.Insert(vm.OriginalIndex, vm);
                }
                else
                {
                    AvailableCards.Add(vm);
                }
            }
            else
            {
                if (SelectedCards.Count >= MauiProgram.engine.PlayerInventory.CanUse)
                {
                    await DisplayAlert("Limit", $"Max {MauiProgram.engine.PlayerInventory.CanUse} kártya!", "OK");
                    return;
                }

                int originalIndex = AvailableCards.IndexOf(vm);
                AvailableCards.Remove(vm);
                vm.OriginalIndex = originalIndex;

                SelectedCards.Add(vm);
                MauiProgram.deckBuilder.Add(vm.Template);
                vm.IsSelected = true;
            }

            ReorderSelectedCards();
            UpdateSelectionLabel();
        }

        private void ReorderSelectedCards()
        {
            for (int i = 0; i < SelectedCards.Count; i++)
            {
                SelectedCards[i].Order = i + 1;
            }
        }

        private void UpdateSelectionLabel()
        {
            SelectionLabel.Text = $"Kiválásztva: {MauiProgram.deckBuilder.Count} / {MauiProgram.engine.PlayerInventory.CanUse}";
        }

        private void OnUnlockNext(object sender, EventArgs e)
        {
            var locked = MauiProgram.engine.CardTemplates.FirstOrDefault(t => !MauiProgram.engine.PlayerInventory.Has(t));
            if (locked != null)
            {
                MauiProgram.engine.PlayerInventory.AddToCollection(locked);
                RefreshAvailableCards();
                ReorderSelectedCards();
            }
        }
    }
}