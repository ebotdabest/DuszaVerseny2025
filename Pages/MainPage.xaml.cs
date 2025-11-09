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

        public GameEngine engine;

        public Command DungeonButtonCommand { get; }

        List<CardTemplate> deckBuilder = new List<CardTemplate>();

        List<CardTemplate> CreateCards()
        {
            List<CardTemplate> templates = new List<CardTemplate>();
            var torak = new CardTemplate(3, 4, "Torak", CardTemplate.Type.Earth);
            var selia = new CardTemplate(2, 6, "Selia", CardTemplate.Type.Water);
            templates.Add(new CardTemplate(2, 7, "Arin", CardTemplate.Type.Earth));
            templates.Add(new CardTemplate(2, 4, "Liora", CardTemplate.Type.Air));
            templates.Add(new CardTemplate(3, 3, "Nerum", CardTemplate.Type.Fire));
            templates.Add(selia);
            templates.Add(torak);
            templates.Add(new CardTemplate(2, 5, "Emera", CardTemplate.Type.Air));
            templates.Add(new CardTemplate(2, 7, "Vorn", CardTemplate.Type.Water));
            templates.Add(new CardTemplate(3, 5, "Kael", CardTemplate.Type.Fire));
            templates.Add(new CardTemplate(2, 6, "Myra", CardTemplate.Type.Earth));
            templates.Add(new CardTemplate(3, 5, "Thalen", CardTemplate.Type.Air));
            templates.Add(new CardTemplate(2, 6, "Isara", CardTemplate.Type.Water));
            templates.Add(selia.ToBoss("Priestess Selia", Card.Attribute.Health));
            templates.Add(torak.ToBoss("Lord Torak", Card.Attribute.Health));
            return templates;
        }

        CardTemplate findTemplate(List<CardTemplate> templates, string name)
        {
            return templates.Where(t => t.name.ToLower() == name.ToLower()).First();
        }

        public MainPage()
        {
            InitializeComponent();
            Current = this;
            BindingContext = this;

            var dungeons = new List<DungeonTemplate>();

            var templates = CreateCards();

            var smallCollection = new Collection(new List<CardTemplate> { findTemplate(templates, "selia") });
            var smallReward = new DungeonTemplate.AttributeReward(Card.Attribute.Health);
            var smallDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Small, "Barlangi Portya", smallCollection, smallReward);
            dungeons.Add(smallDungeon);

            var mediumCollection = new Collection(new List<CardTemplate> {
                findTemplate(templates, "arin"),
                findTemplate(templates, "torak"),
                findTemplate(templates, "isara")
            });

            var mediumReward = new DungeonTemplate.AttributeReward(Card.Attribute.Damage);
            var mediumDungeon = new DungeonTemplate(
                DungeonTemplate.DungeonType.Medium,
                "Osi Szentely", mediumCollection, findTemplate(templates, "lord torak"), mediumReward);
            dungeons.Add(mediumDungeon);

            var bigCollection = new Collection(new List<CardTemplate> {
                findTemplate(templates, "arin"),
                findTemplate(templates, "torak"),
                findTemplate(templates, "isara"),
                findTemplate(templates, "thalen"),
                findTemplate(templates, "emera")
            });
            var bigReward = new DungeonTemplate.CardReward(bigCollection.Cards.ToArray());
            var bigDungeon = new DungeonTemplate(DungeonTemplate.DungeonType.Big, "A mélység királynője", bigCollection, findTemplate(templates, "priestess selia"), bigReward);
            dungeons.Add(bigDungeon);

            var inventory = new PlayerCollection();
            inventory.AddToCollection(findTemplate(templates, "arin"));
            inventory.AddToCollection(findTemplate(templates, "liora"));
            inventory.AddToCollection(findTemplate(templates, "nerum"));
            inventory.AddToCollection(findTemplate(templates, "emera"));
            inventory.AddToCollection(findTemplate(templates, "vorn"));

            engine = new GameEngine(templates, dungeons, inventory);

            MessagingCenter.Subscribe<CardView, CardViewModel>(this, "CardTapped", OnCardTapped);
            MessagingCenter.Subscribe<GamePage>(this, "DungeonWon", (sender) => RefreshAvailableCards());

            RefreshAvailableCards();
            UpdateSelectionLabel();
            ShowDungeons(dungeons);
        }

        void ShowDungeons(List<DungeonTemplate> dungeons)
        {
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
            var dungeon = engine.GameWorld.generateDungeon(dungeonTemplate);
            if (deckBuilder.Count == 0)
            {
                await DisplayAlert("Hiba", "Legyen nálad legalább 1 kártya!", "Ok");
                return;
            }

            Deck deck;
            bool isDeckBuilt = Deck.fromCollection(engine.PlayerInventory, deckBuilder, out deck);
            if (!isDeckBuilt)
            {
                await DisplayAlert("Hiba", "Valami gáz van a pakliddal", "Ok");
                return;
            }

            var parameters = new Dictionary<string, object>
            {
                ["GameEngine"] = engine,
                ["Deck"] = deck,
                ["Dungeon"] = dungeon
            };
            await Shell.Current.GoToAsync(nameof(GamePage), parameters);

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

                deckBuilder.Remove(vm.Template);
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
                if (SelectedCards.Count >= engine.PlayerInventory.CanUse)
                {
                    await DisplayAlert("Limit", $"Max {engine.PlayerInventory.CanUse} kártya!", "OK");
                    return;
                }

                int originalIndex = AvailableCards.IndexOf(vm);
                AvailableCards.Remove(vm);
                vm.OriginalIndex = originalIndex;

                SelectedCards.Add(vm);
                deckBuilder.Add(vm.Template);
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
            SelectionLabel.Text = $"Kiválásztva: {SelectedCards.Count} / {engine.PlayerInventory.CanUse}";
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
    }
}