namespace DuszaVerseny2025;

public partial class App : Application
{
	public App()
	{
#if WINDOWS
		var userDataFolder = Path.Combine(FileSystem.AppDataDirectory, "WebView2");
		Environment.SetEnvironmentVariable("WEBVIEW2_USER_DATA_FOLDER", userDataFolder);
#endif

		InitializeComponent();
		Routing.RegisterRoute(nameof(GamePage), typeof(GamePage));
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		return new Window(new AppShell());
	}
}