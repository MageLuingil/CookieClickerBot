/**
* Registers Cookie Clicker Bot with the Steam mod loader
*/
Game.registerMod("mageluingil cookie clicker bot", {
	init: () => {
		new CookieClickerBot;
	},
});
