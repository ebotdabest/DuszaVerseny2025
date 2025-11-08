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

        public MainPage()
        {
            InitializeComponent();
            Current = this;
            BindingContext = this;

            var templates = new List<CardTemplate>();
            var argorn = new CardTemplate(2, 5, "Argorn", CardTemplate.Type.Fire);
            var luna = new CardTemplate(3, 6, "Luna", CardTemplate.Type.Water);
            var drake = new CardTemplate(4, 7, "Drake", CardTemplate.Type.Air);
            templates.Add(argorn);
            templates.Add(luna);
            templates.Add(drake);

            var dungeons = new List<DungeonTemplate>();
            var inventory = new PlayerCollection();
            inventory.AddToCollection(argorn);
            inventory.AddToCollection(luna);

            engine = new GameEngine(templates, dungeons, inventory);

            MessagingCenter.Subscribe<CardView, CardViewModel>(this, "CardTapped", OnCardTapped);

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

        protected override void OnDisappearing()
        {
            MessagingCenter.Unsubscribe<CardView, CardViewModel>(this, "CardTapped");
            base.OnDisappearing();
        }
    }
}