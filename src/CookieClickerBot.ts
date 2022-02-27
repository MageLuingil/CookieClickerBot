/**
 * Built for Cookie Clicker version 2.043
 * @author Daniel Matthies <dmatthies.dev@gmail.com>
 */

/**
 * Encapsulates the response and success status of an action
 */
type ActionResult = {
	success: boolean,
	result: any
}

/**
 * Represents a group of common actions. Only one action can successfully run
 * per pool per tick
 */
type ActionPool = {
	id: string,
	lastSuccess: Date
}

/**
 * Actions are run in the main game tick loop, based on a set interval
 */
type Action = {
	(): ActionResult,
	name: string,
	interval: number,
	lastRun?: Date,
	pool?: string
}

class CookieClickerBot {
	static poolIncrementor = 0;
	
	/** Store the ID of the game loop interval function */
	autoPlayerId: number;
	actions: Array<Action> = [];
	actionPools: { [index: string]: ActionPool } = {};
	
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
	switches: { [index: string]: () => boolean } = {
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
	
	constructor() {
		this.actions.push(
			CookieClickerBot.clickCookie,
			CookieClickerBot.clickShimmers,
			CookieClickerBot.popWrinklers,
			CookieClickerBot.flipSwitches,
			CookieClickerBot.buyUpgrades,
			CookieClickerBot.buyBuildings
		);
		this.play();
	}
	
	play() {
		this.autoPlayerId = setInterval(this.doTick.bind(this), 1);
	}
	
	pause() {
		clearInterval(this.autoPlayerId);
	}
	
	doTick() {
		if (Game.OnAscend) return;
		
		const now = Date.now();
		this.actions.forEach(action => {
			// Check if this action should try to run this tick
			if (!action.interval || 
				(action.lastRun?.getMilliseconds() || 0) + action.interval > now
			) {
				return;
			}
			
			// Check if this action pool should run this tick
			const actionPool = this.getActionPool(action);
			if (actionPool.lastSuccess.getMilliseconds() > now) {
				return;
			}
			
			// Run the current action
			action.lastRun = new Date;
			const actionResult: ActionResult = action.apply(this);
			if (actionResult.success) {
				actionPool.lastSuccess = action.lastRun;
			}
		});
	}
	
	/**
	 * Returns an action pool for the given action, creating it if needed
	 */
	getActionPool(action: Action): ActionPool {
		if (!this.actionPools[action.pool || '']) {
			// Assign a pool ID if one isn't defined
			if (!action.pool) {
				action.pool = action.name || `action${++CookieClickerBot.poolIncrementor}`;
			}
			this.actionPools[action.pool] = {
				id: action.pool,
				lastSuccess: new Date(0)
			};
		}
		return this.actionPools[action.pool as string];
	}
	
	/**
	 * Click the big cookie
	 *
	 * @type Action
	 * @prop interval 50/sec (internal game rate limit)
	 */
	static clickCookie: Action & { noop: () => void, origPlayCookieSound: () => void } = Object.assign(
		function clickCookie(): ActionResult {
			// Disable cookie click sound to prevent media fetch errors from fast clicks
			Game.playCookieClickSound = CookieClickerBot.clickCookie.noop;
			// Directly invoking ClickCookie bypasses artificial click event detection
			Game.ClickCookie();
			// Restore cookie click sound
			Game.playCookieClickSound = CookieClickerBot.clickCookie.origPlayCookieSound;
			
			return { success: true, result: undefined };
		},
		{
			interval: 1000 / 50, // Obey the autoclick detector
			noop: () => {},
			origPlayCookieSound: Game.playCookieClickSound
		}
	);
	
	/**
	 * Click any available golden cookies (ignoring wrath cookies)
	 *
	 * @type Action
	 * @prop interval 10/sec
	 */
	static clickShimmers: Action = Object.assign(
		function clickShimmers(): ActionResult {
			const shimmers = Game.shimmers.filter(
				(s: Game.shimmer<string, {}> & { wrath?: 0|1 }) => !s.wrath
			).map((s) => s.l.click());
			return { success: true, result: shimmers };
		},
		{
			interval: 100
		}
	);
	
	/**
	 * Pop a wrinkler only once the maximum number is reached
	 *
	 * @type Action
	 * @prop interval every 10 sec
	 */
	static popWrinklers: Action = Object.assign(
		function popWrinklers(): ActionResult {
			if (Game.wrinklers.filter((w) => w.close).length == Game.getWrinklersMax()) {
				const result = Game.PopRandomWrinkler();
				return { success: true, result: result };
			}
			return { success: true, result: undefined };
		},
		{
			interval: 1000 * 10
		}
	);
	
	/**
	 * Auto-flip switches based on test functions defined in the `switches` config
	 *
	 * @type Action
	 * @prop interval every 10 sec
	 * @prop pool     buy
	 */
	static flipSwitches: Action = Object.assign(
		function flipSwitches(this: CookieClickerBot): ActionResult {
			console.debug('Checking switches');
			const toggleSwitch = Game.UpgradesInStore.find((upgrade) => {
				return upgrade.pool == 'toggle' &&
					this.switches[upgrade.name] &&
					upgrade.canBuy() &&
					this.switches[upgrade.name].call(this);
			});
			if (toggleSwitch) {
				toggleSwitch.buy(0);
				return { success: true, result: toggleSwitch };
			}
			return { success: false, result: undefined };
		},
		{
			interval: 1000 * 10,
			pool: 'buy'
		}
	);
	
	/**
	 * Check if there's an upgrade that's safe to auto-buy, and purchase it
	 * 
	 * @type Action
	 * @prop interval 10/sec
	 * @prop pool     buy
	 */
	static buyUpgrades: Action = Object.assign(
		function buyUpgrades(this: CookieClickerBot): ActionResult {
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
				const bypass = (upgrade.pool == 'tech' && upgrade.clickFunction) ? 1 : 0;
				upgrade.buy(bypass);
				return { success: true, result: upgrade };
			}
			
			return { success: false, result: undefined };
		},
		{
			interval: 100,
			pool: 'buy'
		}
	);
	
	/**
	 * Calculates the cost effeciency of all currently-available buildings, and
	 * buys the moste cost-effective one if it's available
	 *
	 * @type Action
	 * @prop interval 10/sec
	 * @prop pool     buy
	 */
	static buyBuildings: Action = Object.assign(
		function buyBuildings(): ActionResult {
			const buildings: Array<Game.Object> = Game.ObjectsById as any;
			
			// For buildings, calculate cost efficiency and only buy if it's a better deal than the next one
			const building = buildings.reduceRight(
				(nextBestBuilding: Game.Object | null, building) => {
					if (building.locked) return nextBestBuilding;
					
					const thisCostEfficacy = building.storedCps / building.price;
					const nextCostEfficacy = nextBestBuilding ? (nextBestBuilding.storedCps / nextBestBuilding.price) : 0;
					return thisCostEfficacy > nextCostEfficacy ? building : nextBestBuilding;
				},
				null
			);
			
			if (building && building.price < Game.cookies) {
				console.log(`Buying ${building.name}`);
				building.buy(1);
				return { success: true, result: building };
			}
			
			return { success: false, result: undefined };
		},
		{
			interval: 100,
			pool: 'buy'
		}
	);
}
