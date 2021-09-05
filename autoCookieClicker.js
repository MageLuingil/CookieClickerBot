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
    document.getElementById('bigCookie').click();
    Game.playCookieClickSound = playCookieClickSound;
  }
}
autoCookieClicker = setInterval(autoCookieClickerFn, 1)

autoGameLoop = () => {
  // Look for golden cookies to click
  if (Game.shimmers.length) {
    for (let i=0; i<Game.shimmers.length; i++) Game.shimmers[i].l.click();
  }
  
  // Check if an upgrade can be bought
  const upgrade = Game.UpgradesInStore[0];
  if (upgrade && upgrade.canBuy()) {
    console.log('Buying ' + upgrade.name);
    upgrade.buy();
    return;
  }
  
  // Calculates the cost efficiency and only buys if it's a better deal than the next level up
  for (let i=17; i>=0; i--) {
    const product = Game.ObjectsById[i];
    const costEfficacy = product.storedCps / product.price;
    if (product.locked || product.price > Game.cookies) continue;
    
    const nextProduct = Game.ObjectsById[i+1];
    const nextCostEfficacy = nextProduct ? (nextProduct.storedCps / nextProduct.price) : 0;
    
    if (costEfficacy > nextCostEfficacy) {
      console.log('Buying ' + product.name);
      product.buy(1);
      break;
    }
  }
}
autoPlayer = setInterval(autoGameLoop, 100);
