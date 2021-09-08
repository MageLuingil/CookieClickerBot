/**
 * Built for Cookie Clicker version 2.031
 * @author Daniel Matthies <dmatthies.dev@gmail.com>
 */
class CookieClickerBot {
	/** Store the ID of the cookie clicker interval function */
	autoCookieClickerId = 0;
	
	/** Store the ID of the game loop interval function */
	autoPlayerId = 0;
	
	gameLoopActions = [
		{ name: 'shimmers', enabled: true, run: 'doClickShimmers' },
		{ name: 'wrinklers', enabled: true, run: 'doPopWrinklers' },
		{ name: 'switches', enabled: false, run: 'doFlipSwitches', mutex: true },
		{ name: 'upgrades', enabled: true, run: 'doBuyUpgrades', mutex: true },
		{ name: 'buildings', enabled: true, run: 'doBuyBuildings', mutex: true },
	];
	
	options = {
		appeaseElders: true,
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
	 * Map of functions which determine whether a switch should be auto-flipped.
	 * Can be modified at runtime for semi-custom scriptability.
	 * Run in the context of the CookieClickerBot instance.
	 */
	switches = {
		'Elder Pledge': () => {
			return this.options.appeaseElders && 
				!Game.UpgradesInStore.find((u) => u.name == 'Elder Covenant');
		},
		'Elder Covenant': () => {
			return this.options.appeaseElders;
		},
		'Revoke Elder Covenant': () => {
			return !this.options.appeaseElders;
		}
	};
	
	/**
	 * Click the cookie.
	 * Runs at 250 clicks/sec on a separate interval from the main game loop.
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
	 * Run all enabled game loop actions.
	 * Only one action with the `mutex` option set may be run in a single game loop.
	 * Runs at 10 actions/sec
	 */
	autoGameLoop() {
		let mutexFlag = false;
		
		// Run all enabled game loop actions
		this.gameLoopActions.filter((action) => action.enabled).map((action) => {
			if (action.mutex && mutexFlag) return;
			
			const callback = this[action.run] || action.run;
			if (typeof callback == 'function') {
				const result = callback.call(this);
				mutexFlag &= !!result;
			}
		});
	}
	
	/**
	 * Click any available golden cookies (ignoring wrath cookies)
	 */
	doClickShimmers() {
		Game.shimmers.filter((s) => !s.wrath).map((s) => s.l.click());
	}
	
	/**
	 * Pop a wrinkler only once the maximum number is reached
	 */
	doPopWrinklers() {
		if (Game.wrinklers.filter((w) => w.close).length == Game.getWrinklersMax()) {
			Game.PopRandomWrinkler();
			return true;
		}
	}
	
	/**
	 * Auto-flip switches based on test functions defined in the `switches` config
	 */
	doFlipSwitches() {
		const toggleSwitch = Game.UpgradesInStore.find((upgrade) => {
			return upgrade.pool == 'toggle' &&
				this.switches[upgrade.name] &&
				upgrade.canBuy() &&
				this.switches[upgrade.name].call(this);
		});
		if (toggleSwitch) {
			toggleSwitch.buy();
			return true;
		}
	}
	
	/**
	 * Check if there's an upgrade that's safe to auto-buy, and purchase it
	 */
	doBuyUpgrades() {
		// Check if there is an upgrade available that's safe to auto-buy
		const upgrade = Game.UpgradesInStore.find((upgrade) => {
			// Allow limited research upgrades (lest the Grandmas become restless)
			if (upgrade.pool == 'tech' && this.researchUpgrades.includes(upgrade.name)) {
				return this.researchUpgrades.indexOf(upgrade.name) <= this.options.researchLevelMax;
			}
			// Otherwise limit purchases to regular upgrades and cookies
			return ['', 'cookie'].includes(upgrade.pool);
		});
		if (upgrade && upgrade.canBuy()) {
			console.log(`Buying upgrade "${upgrade.name}"`);
			// Allow bypassing the confirmation dialog on dangerous research upgrades
			const bypass = (upgrade.pool == 'tech' && upgrade.clickFunction) ? 1 : undefined;
			upgrade.buy(bypass);
			return true;
		}
	}
	
	/**
	 * Calculates the cost effeciency of all currently-available buildings, and
	 * buys the moste cost-effective one if it's available
	 */
	doBuyBuildings() {
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
			return true;
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
