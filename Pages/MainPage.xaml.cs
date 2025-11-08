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
            foreach (var template in engine.CardTemplates)
            {
                if (engine.PlayerInventory.Has(template))
                {
                    AvailableCards.Add(new CardViewModel(template));
                }
            }
        }

        private async void OnCardTapped(CardView sender, CardViewModel vm)
        {   
            if (vm.IsSelected)
            {
                vm.IsSelected = false;
                vm.Order = 0;
                SelectedCards.Remove(vm);
                AvailableCards.Add(vm);
            }
            else
            {
                if (SelectedCards.Count >= _maxSelectable)
                {
                    await DisplayAlert("Limit", $"Max {_maxSelectable} cards!", "OK");
                    return;
                }

                AvailableCards.Remove(vm);
                vm.IsSelected = true;
                vm.Order = SelectedCards.Count + 1;
                SelectedCards.Add(vm);
            }

            UpdateSelectionLabel();
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