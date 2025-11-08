using DuszaVerseny2025.Engine.Cards;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace DuszaVerseny2025.ViewModels
{
    public class CardViewModel : INotifyPropertyChanged
    {
        public CardTemplate Template { get; }
        private bool _isSelected;
        private int _order;

        public bool IsSelected
        {
            get => _isSelected;
            set
            {
                _isSelected = value;
                OnPropertyChanged(nameof(IsSelected));
            }
        }
        
        public bool IsInteractable
        {
            get => _isInteractable;
            set
            {
                if (_isInteractable != value)
                {
                    _isInteractable = value;
                    OnPropertyChanged();
                }
            }
        }
        private bool _isInteractable = true;
        
        public int OriginalIndex
        {
            get => _originalIndex;
            set { _originalIndex = value; OnPropertyChanged(); }
        }
        private int _originalIndex = -1;
        
        public int Order
        {
            get => _order;
            set
            {
                _order = value;
                OnPropertyChanged(nameof(Order));
            }
        }

        public CardViewModel(CardTemplate template)
        {
            Template = template;
            OriginalIndex = -1;
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}