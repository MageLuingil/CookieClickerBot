var CookieClickerBot = (function () {
    function CookieClickerBot() {
        var _this = this;
        this.actions = [];
        this.actionPools = {};
        this.options = {
            appeaseElders: true,
            researchLevelMax: 4
        };
        this.researchUpgrades = [
            'Bingo center/Research facility',
            'Specialized chocolate chips',
            'Designer cocoa beans',
            'Ritual rolling pins',
            'Underworld ovens',
            'One mind',
            'Exotic nuts',
            'Communal brainsweep',
            'Arcane sugar',
            'Elder Pact',
            'Sacrificial rolling pins'
        ];
        this.switches = {
            'Elder Pledge': function () {
                return _this.options.appeaseElders &&
                    !Game.UpgradesInStore.find(function (u) { return u.name == 'Elder Covenant'; });
            },
            'Elder Covenant': function () {
                return _this.options.appeaseElders;
            },
            'Revoke Elder Covenant': function () {
                return !_this.options.appeaseElders;
            }
        };
        this.actions.push(CookieClickerBot.clickCookie, CookieClickerBot.clickShimmers, CookieClickerBot.popWrinklers, CookieClickerBot.flipSwitches, CookieClickerBot.buyUpgrades, CookieClickerBot.buyBuildings);
        this.play();
    }
    CookieClickerBot.prototype.play = function () {
        this.autoPlayerId = setInterval(this.doTick.bind(this), 1);
    };
    CookieClickerBot.prototype.pause = function () {
        clearInterval(this.autoPlayerId);
    };
    CookieClickerBot.prototype.doTick = function () {
        var _this = this;
        if (Game.OnAscend)
            return;
        var now = Date.now();
        this.actions.forEach(function (action) {
            var _a;
            if (!action.interval ||
                (((_a = action.lastRun) === null || _a === void 0 ? void 0 : _a.getMilliseconds()) || 0) + action.interval > now) {
                return;
            }
            var actionPool = _this.getActionPool(action);
            if (actionPool.lastSuccess.getMilliseconds() > now) {
                return;
            }
            action.lastRun = new Date;
            var actionResult = action.apply(_this);
            if (actionResult.success) {
                actionPool.lastSuccess = action.lastRun;
            }
        });
    };
    CookieClickerBot.prototype.getActionPool = function (action) {
        if (!this.actionPools[action.pool || '']) {
            if (!action.pool) {
                action.pool = action.name || "action".concat(++CookieClickerBot.poolIncrementor);
            }
            this.actionPools[action.pool] = {
                id: action.pool,
                lastSuccess: new Date(0)
            };
        }
        return this.actionPools[action.pool];
    };
    CookieClickerBot.poolIncrementor = 0;
    CookieClickerBot.clickCookie = Object.assign(function clickCookie() {
        Game.playCookieClickSound = CookieClickerBot.clickCookie.noop;
        Game.ClickCookie();
        Game.playCookieClickSound = CookieClickerBot.clickCookie.origPlayCookieSound;
        return { success: true, result: undefined };
    }, {
        interval: 1000 / 50,
        noop: function () { },
        origPlayCookieSound: Game.playCookieClickSound
    });
    CookieClickerBot.clickShimmers = Object.assign(function clickShimmers() {
        var shimmers = Game.shimmers.filter(function (s) { return !s.wrath; }).map(function (s) { return s.l.click(); });
        return { success: true, result: shimmers };
    }, {
        interval: 100
    });
    CookieClickerBot.popWrinklers = Object.assign(function popWrinklers() {
        if (Game.wrinklers.filter(function (w) { return w.close; }).length == Game.getWrinklersMax()) {
            var result = Game.PopRandomWrinkler();
            return { success: true, result: result };
        }
        return { success: true, result: undefined };
    }, {
        interval: 1000 * 10
    });
    CookieClickerBot.flipSwitches = Object.assign(function flipSwitches() {
        var _this = this;
        console.debug('Checking switches');
        var toggleSwitch = Game.UpgradesInStore.find(function (upgrade) {
            return upgrade.pool == 'toggle' &&
                _this.switches[upgrade.name] &&
                upgrade.canBuy() &&
                _this.switches[upgrade.name].call(_this);
        });
        if (toggleSwitch) {
            toggleSwitch.buy(0);
            return { success: true, result: toggleSwitch };
        }
        return { success: false, result: undefined };
    }, {
        interval: 1000 * 10,
        pool: 'buy'
    });
    CookieClickerBot.buyUpgrades = Object.assign(function buyUpgrades() {
        var _this = this;
        var upgrade = Game.UpgradesInStore.find(function (upgrade) {
            if (upgrade.pool == 'tech' && _this.researchUpgrades.includes(upgrade.name)) {
                return _this.researchUpgrades.indexOf(upgrade.name) <= _this.options.researchLevelMax;
            }
            return ['', 'cookie'].includes(upgrade.pool);
        });
        if (upgrade && upgrade.canBuy()) {
            console.log("Buying upgrade \"".concat(upgrade.name, "\""));
            var bypass = (upgrade.pool == 'tech' && upgrade.clickFunction) ? 1 : 0;
            upgrade.buy(bypass);
            return { success: true, result: upgrade };
        }
        return { success: false, result: undefined };
    }, {
        interval: 100,
        pool: 'buy'
    });
    CookieClickerBot.buyBuildings = Object.assign(function buyBuildings() {
        var buildings = Game.ObjectsById;
        var building = buildings.reduceRight(function (nextBestBuilding, building) {
            if (building.locked)
                return nextBestBuilding;
            var thisCostEfficacy = building.storedCps / building.price;
            var nextCostEfficacy = nextBestBuilding ? (nextBestBuilding.storedCps / nextBestBuilding.price) : 0;
            return thisCostEfficacy > nextCostEfficacy ? building : nextBestBuilding;
        }, null);
        if (building && building.price < Game.cookies) {
            console.log("Buying ".concat(building.name));
            building.buy(1);
            return { success: true, result: building };
        }
        return { success: false, result: undefined };
    }, {
        interval: 100,
        pool: 'buy'
    });
    return CookieClickerBot;
}());
Game.registerMod("mageluingil cookie clicker bot", {
    init: function () {
        new CookieClickerBot;
    }
});
