/**
 * Built for Cookie Clicker version 2.031
 * @author Daniel Matthies <dmatthies.dev@gmail.com>
 */
autoCookieClickerFn = () => {
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
autoCookieClicker = setInterval(autoCookieClickerFn, 1)

autoGameLoop = () => {
	// Look for golden cookies to click
	if (Game.shimmers.length) {
		for (let i=0; i<Game.shimmers.length; i++) Game.shimmers[i].l.click();
	}
	
	// Check if there is an upgrade available that's safe to auto-buy
	const upgrade = Game.UpgradesInStore.find((upgrade) => {
		// Limit purchases to regular upgrades and cookies (lest the Grandmas become restless)
		return ['', 'cookie'].includes(upgrade.pool) && upgrade.canBuy();
	});
	if (upgrade) {
		console.log(`Buying upgrade "${upgrade.name}"`);
		return upgrade.buy();
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
autoPlayer = setInterval(autoGameLoop, 100);
