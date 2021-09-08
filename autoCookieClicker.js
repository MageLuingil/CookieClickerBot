/**
 * Built for Cookie Clicker version 2.031
 * @author Daniel Matthies <dmatthies.dev@gmail.com>
 */
class CookieClickerBot {
	/** Research Level 
	
	/** Store the ID of the cookie clicker interval function */
	autoCookieClickerId = 0;
	
	/** Store the ID of the game loop interval function */
	autoPlayerId = 0;
	
	options = {
		popWrinklers: true,
		researchLevelMax: 4,
	};
	
	/** Use this to determine max research level option */
	researchUpgrades = [
		'Bingo center/Research facility',
		'Specialized chocolate chips',
		'Designer cocoa beans',
		'Ritual rolling pins',
		'Underworld ovens',
		'One mind', // Grandmapocalypse Level 1
		'Exotic nuts',
		'Communal brainsweep', // Grandmapocalypse Level 2
		'Arcane sugar',
		'Elder Pact', // Grandmapocalypse Level 3
		'Sacrificial rolling pins'
	];
	
	/**
	 * Runs at 250 clicks/s. Run every 1-2 ms to avoid too many missed clicks.
	 */
	autoCookieClicker() {
		// Obey the autoclick detector
		const now = Date.now();
		if (now - Game.lastClick > 1000/250) {
			// Disable cookie click sound to prevent media fetch errors from fast clicks
			const playCookieClickSound = Game.playCookieClickSound;
			Game.playCookieClickSound = () => {}
			// I'm just a regular click, I am
			document.getElementById('bigCookie').click();
			// Restore cookie click sound
			Game.playCookieClickSound = playCookieClickSound;
		}
	}
	
	/**
	 * Automates the clicking of:
	 * - Golden cookies (except for wrath cookies)
	 * - Wrinklers (pops one when the max number is reached)
	 * - Upgrades (purchased before buildings)
	 * - Buildings (Calculates the most cost-effecitve building at any time)
	 */
	autoGameLoop() {
		// Look for golden cookies to click
		Game.shimmers.filter((s) => !s.wrath).map((s) => s.l.click());
		
		// Try to keep wrinklers around a while before popping them
		if (this.options.popWrinklers &&
			Game.wrinklers.filter((w) => w.close).length == Game.getWrinklersMax()
		) {
			Game.PopRandomWrinkler();
		}
		
		// Check if there is an upgrade available that's safe to auto-buy
		const upgrade = Game.UpgradesInStore.find((upgrade) => {
			// Allow limited research upgrades (lest the Grandmas become restless)
			if (upgrade.pool == 'tech' && this.researchUpgrades.includes(upgrade.name)) {
				return this.researchUpgrades.indexOf(upgrade.name) <= this.options.researchLevelMax;
			}
			// Otherwise limit purchases to regular upgrades and cookies
			return ['', 'cookie'].includes(upgrade.pool);
		});
		if (upgrade.canBuy()) {
			console.log(`Buying upgrade "${upgrade.name}"`);
			// Allow bypassing the confirmation dialog on dangerous research upgrades
			const bypass = (upgrade.pool == 'tech' && upgrade.clickFunction) ? 1 : undefined;
			return upgrade.buy(bypass);
		}
		
		// For buildings, calculate cost efficiency and only buy if it's a better deal than the next one
		const building = Game.ObjectsById.reduceRight((nextBestBuilding, building) => {
			if (building.locked) return nextBestBuilding;
			
			const thisCostEfficacy = building.storedCps / building.price;
			const nextCostEfficacy = nextBestBuilding ? (nextBestBuilding.storedCps / nextBestBuilding.price) : 0;
			return thisCostEfficacy > nextCostEfficacy ? building : nextBestBuilding;
		}, undefined);
		if (building.price < Game.cookies) {
			console.log(`Buying ${building.name}`);
			building.buy(1);
		}
	}
	
	start() {
		this.autoCookieClickerId = setInterval(this.autoCookieClicker.bind(this), 1);
		this.autoPlayerId = setInterval(this.autoGameLoop.bind(this), 100);
	}
	
	stop() {
		clearInterval(this.autoCookieClickerId);
		clearInterval(this.autoPlayerId);
	}
}

player = new CookieClickerBot();
player.start();
