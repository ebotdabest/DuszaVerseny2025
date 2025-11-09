using System;
using System.Windows.Input;
using Microsoft.Maui.Controls;

namespace DuszaVerseny2025.Controls
{
        public partial class MultiLineButton : ContentView
        {
                public MultiLineButton()
                {
                        InitializeComponent();
                }

                public static readonly BindableProperty TextProperty =
                    BindableProperty.Create(nameof(Text), typeof(string), typeof(MultiLineButton), string.Empty);

                public string Text
                {
                        get => (string)GetValue(TextProperty);
                        set => SetValue(TextProperty, value);
                }

                public static readonly BindableProperty CommandProperty =
                    BindableProperty.Create(nameof(Command), typeof(ICommand), typeof(MultiLineButton), null);

                public ICommand Command
                {
                        get => (ICommand)GetValue(CommandProperty);
                        set => SetValue(CommandProperty, value);
                }

                public static readonly BindableProperty CommandParameterProperty =
                    BindableProperty.Create(nameof(CommandParameter), typeof(object), typeof(MultiLineButton), null);

                public object CommandParameter
                {
                        get => GetValue(CommandParameterProperty);
                        set => SetValue(CommandParameterProperty, value);
                }

                public static readonly BindableProperty CornerRadiusProperty =
                    BindableProperty.Create(nameof(CornerRadius), typeof(float), typeof(MultiLineButton), 8f);

                public float CornerRadius
                {
                        get => (float)GetValue(CornerRadiusProperty);
                        set => SetValue(CornerRadiusProperty, value);
                }

                public new static readonly BindableProperty BackgroundColorProperty =
                    BindableProperty.Create(nameof(BackgroundColor), typeof(Color), typeof(MultiLineButton), Colors.Black);

                public new Color BackgroundColor
                {
                        get => (Color)GetValue(BackgroundColorProperty);
                        set => SetValue(BackgroundColorProperty, value);
                }

                public static readonly BindableProperty TextColorProperty =
                    BindableProperty.Create(nameof(TextColor), typeof(Color), typeof(MultiLineButton), Colors.White);

                public Color TextColor
                {
                        get => (Color)GetValue(TextColorProperty);
                        set => SetValue(TextColorProperty, value);
                }

                public static readonly BindableProperty FontFamilyProperty =
                    BindableProperty.Create(nameof(FontFamily), typeof(string), typeof(MultiLineButton), default(string));

                public string FontFamily
                {
                        get => (string)GetValue(FontFamilyProperty);
                        set => SetValue(FontFamilyProperty, value);
                }

                public static readonly BindableProperty FontSizeProperty =
                    BindableProperty.Create(nameof(FontSize), typeof(double), typeof(MultiLineButton), 16.0);

                public double FontSize
                {
                        get => (double)GetValue(FontSizeProperty);
                        set => SetValue(FontSizeProperty, value);
                }
        }
}
