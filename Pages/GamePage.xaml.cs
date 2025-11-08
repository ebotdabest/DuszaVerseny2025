using Microsoft.Maui.Controls;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using DuszaVerseny2025.ViewModels;

namespace DuszaVerseny2025
{
        public partial class GamePage : ContentPage
        {
                public List<CardViewModel> SelectedCards { get; }
                private readonly GameBoardViewModel _viewModel;

                public GamePage(List<CardViewModel> selectedCards)
                {
                        InitializeComponent();
                        SelectedCards = selectedCards ?? new List<CardViewModel>();
                        _viewModel = new GameBoardViewModel(SelectedCards);
                        BindingContext = _viewModel;

                        _viewModel.LoadInitialData();
                        SetupEventHandlers();
                }

                public GamePage()
                {
                        InitializeComponent();
                        SelectedCards = new List<CardViewModel>();
                        _viewModel = new GameBoardViewModel(SelectedCards);
                        BindingContext = _viewModel;

                        _viewModel.LoadInitialData();
                        SetupEventHandlers();
                }

                private void SetupEventHandlers()
                {
                        Device.BeginInvokeOnMainThread(async () =>
                        {
                                await Task.Delay(1000);
                                SimulateInitialLoad();
                        });
                }

                private void SimulateInitialLoad()
                {
                        _viewModel.LoadInitialData();
                        Debug.WriteLine("Game page loaded with initial data.");
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
                        _viewModel.Cards = new System.Collections.ObjectModel.ObservableCollection<CardItem>(currentItems);

                        Random rand = new Random();
                        Debug.WriteLine($"Repositioned cards. Random: X={rand.NextDouble():F2}, Y={rand.NextDouble():F2}");
                }

                protected override void OnAppearing()
                {
                        base.OnAppearing();
                        _viewModel.LoadInitialData();
                }

                protected override bool OnBackButtonPressed()
                {
                        Device.BeginInvokeOnMainThread(async () =>
                        {
                                await Shell.Current.GoToAsync("..");
                        });
                        return true;
                }
        }
}