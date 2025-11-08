using System.Collections.ObjectModel;
using DuszaVerseny2025.Engine;
using DuszaVerseny2025.Engine.Cards;
using DuszaVerseny2025.ViewModels;
using DuszaVerseny2025.Pages;
using System.Linq;

namespace DuszaVerseny2025
{
    public partial class MainPage : ContentPage
    {
        public static MainPage Current { get; private set; }

        public ObservableCollection<CardViewModel> AvailableCards { get; } = new();
        public ObservableCollection<CardViewModel> SelectedCards { get; } = new();

        private readonly int _maxSelectable = 2;
        public GameEngine engine;
        
        public Command DungeonButtonCommand { get; }

        public MainPage()
        {
            InitializeComponent();
            Current = this;
            BindingContext = this;
            
            var dungeons = new List<DungeonTemplate>();

            var templates = new List<CardTemplate>();
            var arin = new CardTemplate(2, 5, "Arin", CardTemplate.Type.Earth);
            var liora = new CardTemplate(2, 4, "Liora", CardTemplate.Type.Air);
            var nerun = new CardTemplate(3, 3, "Nerum", CardTemplate.Type.Fire);
            var selia = new CardTemplate(2, 6, "Selia", CardTemplate.Type.Water);
            var torak = new CardTemplate(3, 4, "Torak", CardTemplate.Type.Earth);
            var emera = new CardTemplate(2, 5, "Emera", CardTemplate.Type.Air);
            var vorn = new CardTemplate(2, 7, "Vorn", CardTemplate.Type.Water);
            var kael = new CardTemplate(3, 5, "Kael", CardTemplate.Type.Fire);
            var myra = new CardTemplate(2, 6, "Myra", CardTemplate.Type.Earth);
            var thalen = new CardTemplate(3, 5, "Thalen", CardTemplate.Type.Air);
            var isara = new CardTemplate(2, 6, "Isara", CardTemplate.Type.Water);
            
            templates.Add(arin);
            templates.Add(liora);
            templates.Add(nerun);
            templates.Add(selia);
            templates.Add(torak);
            templates.Add(emera);
            templates.Add(vorn);
            templates.Add(kael);
            templates.Add(myra);
            templates.Add(thalen);
            templates.Add(isara);
            var torakTemplate = new CardTemplate(5, 10, "Torak", CardTemplate.Type.Fire, "Lord Torak", Card.Attribute.Health);
            templates.Add(torakTemplate);

            var seliaTemplate = new CardTemplate(6, 12, "Selia", CardTemplate.Type.Water, "Priestess Selia", Card.Attribute.Damage);
            templates.Add(seliaTemplate);
            
            var smallCollection = new Collection(new List<CardTemplate> { selia });
            var smallReward = new DungeonTemplate.AttributeReward(Card.Attribute.Health);
            var smallDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Small, "Barlangi portya", smallCollection, smallReward);
            dungeons.Add(smallDungeon);

            var mediumCollection = new Collection(new List<CardTemplate> { arin, torak, isara });
            var mediumReward = new DungeonTemplate.AttributeReward(Card.Attribute.Damage);
            var mediumDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Medium, "Ősi Szentély", mediumCollection, torakTemplate, mediumReward);
            dungeons.Add(mediumDungeon);

            var bigCollection = new Collection(new List<CardTemplate> { arin, torak, isara, thalen, emera });
            var bigReward = new DungeonTemplate.CardReward(bigCollection.Cards.ToArray());
            var bigDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Big, "A mélység királynője", bigCollection, seliaTemplate, bigReward);
            dungeons.Add(bigDungeon);
            
            var inventory = new PlayerCollection();
            inventory.AddToCollection(arin);
            inventory.AddToCollection(liora);

            engine = new GameEngine(templates, dungeons, inventory);

            MessagingCenter.Subscribe<CardView, CardViewModel>(this, "CardTapped", OnCardTapped);
            MessagingCenter.Subscribe<GamePage>(this, "DungeonWon", (sender) => RefreshAvailableCards());

            RefreshAvailableCards();
            UpdateSelectionLabel();
        }

        private void RefreshAvailableCards()
        {
            AvailableCards.Clear();
            int index = 0;
            foreach (var template in engine.CardTemplates)
            {
                var vm = new CardViewModel(template)
                {
                    IsInteractable = engine.PlayerInventory.Has(template),
                    OriginalIndex = index++
                };
                AvailableCards.Add(vm);
            }
        }

        private async void OnCardTapped(CardView sender, CardViewModel vm)
        {
            if (!vm.IsInteractable) return;

            if (vm.IsSelected)
            {
                vm.IsSelected = false;
                vm.Order = 0;
                SelectedCards.Remove(vm);

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
                if (SelectedCards.Count >= _maxSelectable)
                {
                    await DisplayAlert("Limit", $"Max {_maxSelectable} kártya!", "OK");
                    return;
                }

                int originalIndex = AvailableCards.IndexOf(vm);
                AvailableCards.Remove(vm);
                vm.OriginalIndex = originalIndex;

                SelectedCards.Add(vm);
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
            SelectionLabel.Text = $"Selected: {SelectedCards.Count} / {_maxSelectable}";
        }

        private void OnUnlockNext(object sender, EventArgs e)
        {
            var locked = engine.CardTemplates.FirstOrDefault(t => !engine.PlayerInventory.Has(t));
            if (locked != null)
            {
                engine.PlayerInventory.AddToCollection(locked);
                RefreshAvailableCards();
                ReorderSelectedCards();
            }
        }

        private async void OnStartGameClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new GamePage(SelectedCards.ToList()));
        }

        private async void OnButtonClicked(object sender, EventArgs e)
        {
            if (sender is Button button)
            {
                switch (button.StyleId)
                {
                    case "EgyszeruKazamata":
                        await DisplayAlert("Dungeon Selected", "You chose: Barlangi portya", "OK");
                        break;
                    case "KicsiKazamata":
                        await DisplayAlert("Dungeon Selected", "You chose: Ősi Szentély", "OK");
                        break;
                    case "NagyKazamata":
                        await DisplayAlert("Dungeon Selected", "You chose: A mélység királynője", "OK");
                        break;
                }
            }
        }
        
        private async void OnDungeonSelected(string dungeonName)
        {
            if (SelectedCards.Count < _maxSelectable)
            {
                await DisplayAlert("Hiba", "Válassz ki legalább 2 kártyát!", "OK");
                return;
            }

            var dungeonTemplate = engine.GameWorld.Dungeons.FirstOrDefault(d => d.name == dungeonName);
            if (dungeonTemplate == null)
            {
                await DisplayAlert("Hiba", "Kazamata nem található!", "OK");
                return;
            }

            await Navigation.PushAsync(new GamePage(SelectedCards.ToList(), dungeonTemplate));
        }

        protected override void OnDisappearing()
        {
            MessagingCenter.Unsubscribe<CardView, CardViewModel>(this, "CardTapped");
            base.OnDisappearing();
        }
    }
}