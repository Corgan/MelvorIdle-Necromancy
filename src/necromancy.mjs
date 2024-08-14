const { loadModule, version, getResourceUrl } = mod.getContext(import.meta);

const { NecromancyRecipe } = await loadModule('src/necromancy-recipe.mjs');
const { NecromancySpell } = await loadModule('src/necromancy-spell.mjs');
const { NecromancyAugury } = await loadModule('src/necromancy-augury.mjs');
const { NecromancyConjuration } = await loadModule('src/necromancy-conjuration.mjs');
const { NecromancyIncantation } = await loadModule('src/necromancy-incantation.mjs');
const { NecromancyConjuredEntity } = await loadModule('src/necromancy-conjured-entity.mjs');

const { NecromancyPageElement } = await loadModule('src/components/necromancy-page.mjs');

const { NecromancyArtisanMenuElement } = await loadModule('src/components/necromancy-artisan-menu.mjs');

const { NecromancyNecronomiconElement } = await loadModule('src/components/necromancy-necronomicon.mjs');

class NecromancyRenderQueue extends ArtisanSkillRenderQueue {
    constructor() {
        super();
        this.conjureBar = false;
        this.attackSpellSelection = false;
        this.augurySpellSelection = false;
        this.conjurationSpellSelection = false;
        this.incantationSpellSelection = false;
    }
}

export class Necromancy extends ArtisanSkill {
    constructor(namespace, game) {
        super(namespace, 'Necromancy', game);
        this._media = 'assets/necromancy.png';
        this.renderQueue = new NecromancyRenderQueue();
        this.version = parseInt(version.split('.')[1]);
        this.saveVersion = -1;
        this.baseInterval = 10000;
        this.minHitPercent = 25;

        this.skillingPets = [];

        this.setAltRecipes = new Map();

        this.categories = new NamespaceRegistry(game.registeredNamespaces);
        this.actions = new NamespaceRegistry(game.registeredNamespaces);
        
        this.spells = new NamespaceRegistry(game.registeredNamespaces);
        this.auguries = new NamespaceRegistry(game.registeredNamespaces);
        this.conjurations = new NamespaceRegistry(game.registeredNamespaces);
        this.incantations = new NamespaceRegistry(game.registeredNamespaces);

        this.savedAttackSpells = new Map();
        this.savedAugurySpells = new Map();
        this.savedConjurationSpells = new Map();
        this.savedIncantationSpells = new Map();
        
        this.canUseConjuration = false;
        this.canUseIncantation = false;
        this.auguryTurnOffset = 0;

        this.conjuredEntity = new NecromancyConjuredEntity();

        this.selectionTabs = new Map();

        this.page = createElement('necromancy-page', {
            id: 'necromancy-container',
            classList: ['content', 'd-none']
        });
    }

    get name() { return "Necromancy"; }
    get isCombat() { return true; }

    canUseCombatSpell(spell, ignoreReqs) {
        return this.level >= spell.level;
    }

    get selectedAttackSpell() {
        let attackSpell = this.savedAttackSpells.get(game.combat.player.selectedEquipmentSet);
        if(attackSpell === undefined) {
            attackSpell = this.spells.firstObject;
            this.savedAttackSpells.set(game.combat.player.selectedEquipmentSet, attackSpell);
        }
        return attackSpell;
    }
    set selectedAttackSpell(spell) {
        this.savedAttackSpells.set(game.combat.player.selectedEquipmentSet, spell);
    }

    get selectedAugurySpell() {
        return this.savedAugurySpells.get(game.combat.player.selectedEquipmentSet);
    }
    set selectedAugurySpell(spell) {
        if(spell === undefined) {
            this.savedAugurySpells.delete(game.combat.player.selectedEquipmentSet)
        } else {
            this.savedAugurySpells.set(game.combat.player.selectedEquipmentSet, spell);
        }
    }

    get selectedConjurationSpell() {
        return this.savedConjurationSpells.get(game.combat.player.selectedEquipmentSet);
    }
    set selectedConjurationSpell(spell) {
        if(spell === undefined) {
            this.savedConjurationSpells.delete(game.combat.player.selectedEquipmentSet)
        } else {
            this.savedConjurationSpells.set(game.combat.player.selectedEquipmentSet, spell);
        }
    }

    get selectedIncantationSpell() {
        return this.savedIncantationSpells.get(game.combat.player.selectedEquipmentSet);
    }
    set selectedIncantationSpell(spell   ) {
        if(spell === undefined) {
            this.savedIncantationSpells.delete(game.combat.player.selectedEquipmentSet)
        } else {
            this.savedIncantationSpells.set(game.combat.player.selectedEquipmentSet, spell);
        }
    }

    selectAttackSpell(spell) {
        if(this.selectedAttackSpell === spell)
            return;
        this.selectedAttackSpell = spell;
        this.updateAttackSpell();
    }
    
    selectAugurySpell(spell) {
        if(this.selectedAugurySpell === spell) {
            this.selectedAugurySpell = undefined;
        } else {
            this.selectedAugurySpell = spell;
        }
        this.updateAugurySpell();
    }

    selectConjurationSpell(spell) {
        let lastSpell = this.selectedConjurationSpell;
        if(this.selectedConjurationSpell === spell) {
            this.selectedConjurationSpell = undefined;
        } else {
            this.selectedConjurationSpell = spell;
        }
        this.updateConjurationSpell(lastSpell);
    }

    selectIncantationSpell(spell) {
        if(this.selectedIncantationSpell === spell) {
            this.selectedIncantationSpell = undefined;
        } else {
            this.selectedIncantationSpell = spell;
        }
        this.updateIncantationSpell();
    }

    updateAttackSpell() {
        this.computeProvidedStats(true);
        this.renderQueue.attackSpellSelection = true;
    }

    updateAugurySpell() {
        if(this.selectedAugurySpell !== undefined) {
            if(game.combat.fightInProgress) {
                this.auguryTurnOffset = game.combat.player.turnsTaken;
                this.computeProvidedStats(true);
            } else {
                this.auguryTurnOffset = 0;
                this.computeProvidedStats(true);
            }
        } else {
            this.computeProvidedStats(true);
        }
        this.renderQueue.augurySpellSelection = true;
    }

    updateConjurationSpell(lastSpell) {
        if(this.selectedConjurationSpell !== undefined) {
            this.clearConjurationEffects(lastSpell);
            if(game.combat.fightInProgress) {
                this.castConjurationSpell(this.selectedConjurationSpell);
            } else {
                this.canUseConjuration = true;
                this.computeProvidedStats(true);
            }
        } else {
            this.clearConjurationEffects(lastSpell);
            this.computeProvidedStats(true);
        }
        if(game.combat.fightInProgress)
            this.conjuredEntity.startConjureAttack();
        this.renderQueue.conjurationSpellSelection = true;
        game.combat.player.renderQueue.damageValues = true;
        this.renderQueue.conjureBar = true;
    }

    updateIncantationSpell() {
        if(this.selectedIncantationSpell !== undefined) {
            if(game.combat.fightInProgress) {
                this.castIncantationSpell(this.selectedIncantationSpell);
            } else {
                this.canUseIncantation = true;
                this.computeProvidedStats(true);
            }
        } else {
            this.computeProvidedStats(true);
        }
        this.renderQueue.incantationSpellSelection = true;
        game.combat.player.renderQueue.damageValues = true;
    }

    changeEquipmentSet(oldSetID, setID) {
        this.updateAttackSpell();
        this.updateAugurySpell();
        let lastConjurationSpell = this.savedConjurationSpells.get(oldSetID);
        this.updateConjurationSpell(lastConjurationSpell);
        this.updateIncantationSpell();
    }

    fightStartCheck() {
        if(this.selectedConjurationSpell !== undefined)
            this.castConjurationSpell(this.selectedConjurationSpell);
        if(this.selectedIncantationSpell !== undefined)
            this.castIncantationSpell(this.selectedIncantationSpell);
        this.auguryTurnOffset = 0;
    }
    
    castAttackSpell(spell) {
        if(game.combat.player.attackType !== 'necro') {
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You must be using a necromancy weapon.", 'danger'],
            });
            return false;
        }
        const runeCosts = this.getSpellCosts(spell);
        if(game.bank.checkForItems(runeCosts)) {
            game.combat.player.consumeRunes(runeCosts);
            return true;
        } else {
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You need more runes to cast your selected Necromancy spell.", 'danger'],
            });
            return false;
        }
    }
    
    castAugurySpell(spell) {
        if(game.combat.player.attackType !== 'necro') {
            this.selectAugurySpell();
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You must be using a necromancy weapon.", 'danger'],
            });
            return false;
        }
        const runeCosts = this.getSpellCosts(spell);
        if(game.bank.checkForItems(runeCosts)) {
            game.combat.player.consumeRunes(runeCosts);
            return true;
        } else {
            this.selectAugurySpell();
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You need more runes to cast your selected Augury spell.", 'danger'],
            });
            return false;
        }
    }
    
    clearConjurationEffects(lastSpell) {
        if(lastSpell !== undefined) {
            lastSpell.stats.combatEffects.forEach(applicator => {
                let target = (applicator.effect.target === "Self" ? game.combat.player : game.combat.enemy);
                target.removeCombatEffect(applicator.effect);
            });
        }
    }

    castConjurationSpell(spell) {
        if(game.combat.player.attackType !== 'necro') {
            this.selectConjurationSpell();
            this.canUseConjuration = false;
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You must be using a necromancy weapon.", 'danger'],
            });
            return false;
        }
        const runeCosts = this.getSpellCosts(spell);
        if(game.bank.checkForItems(runeCosts)) {
            game.combat.player.consumeRunes(runeCosts);

            this.canUseConjuration = true;
            this.computeProvidedStats(true);
        } else {
            this.selectConjurationSpell();
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You need more runes to cast your selected Conjuration.", 'danger'],
            });

            this.canUseConjuration = false;
            this.computeProvidedStats(true);
        }
    }

    castIncantationSpell(spell) {
        if(game.combat.player.attackType !== 'necro') {
            this.selectIncantationSpell();
            this.canUseIncantation = false;
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You must be using a necromancy weapon.", 'danger'],
            });
            return false;
        }
        const runeCosts = this.getSpellCosts(spell);
        if(game.bank.checkForItems(runeCosts)) {
            game.combat.player.consumeRunes(runeCosts);

            this.canUseIncantation = true;
            this.computeProvidedStats(true);
        } else {
            this.selectIncantationSpell();
            game.combat.notifications.add({
                type: 'Player',
                args: [game.necromancy, "You need more runes to cast your selected Incantation.", 'danger'],
            });

            this.canUseIncantation = false;
            this.computeProvidedStats(true);
        }
    }

    getSpellCosts(spell) {
        let runeCost = spell.itemsConsumed;
        /*const spellCost = [];
        let flatModifier = 0;
        runeCost.forEach((cost)=>{
            var _a;
            let modifiedQuantity = cost.quantity - ((_a = this.runesProvided.get(cost.item)) !== null && _a !== void 0 ? _a : 0) + flatModifier;
            modifiedQuantity += this.modifiers.getValue("melvorD:flatSpellRuneCost", cost.item.modQuery);
            modifiedQuantity = Math.max(1, modifiedQuantity);
            spellCost.push({
                item: cost.item,
                quantity: modifiedQuantity,
            });
        });*/
        return runeCost;
    }

    get conjureBar() {
        return combatMenus.progressBars.playerConjure;
    }
    get conjureMinibar() {
        return combatMenus.progressBars.playerConjureMinibar;
    }

    addProvidedStats() {
        super.addProvidedStats();
        if(game.combat.player.attackType === 'necro' && this.selectedAttackSpell !== undefined)
            this.providedStats.addStatObject(this.selectedAttackSpell, this.selectedAttackSpell.stats);
        if(game.combat.player.attackType === 'necro' && this.selectedConjurationSpell !== undefined && this.canUseConjuration)
            this.providedStats.addStatObject(this.selectedConjurationSpell, this.selectedConjurationSpell.stats);
        if(game.combat.player.attackType === 'necro' && this.selectedIncantationSpell !== undefined && this.canUseIncantation)
            this.providedStats.addStatObject(this.selectedIncantationSpell, this.selectedIncantationSpell.stats);
    }


    get menu() { return this.page.artisanMenu; }
    get categoryMenu() { return this.page.categoryMenu; }
    isMasteryActionUnlocked(action) {
        return this.isBasicSkillRecipeUnlocked(action);
    }
    get noCostsMessage() {
        return "You don't have the required materials to make that.";
    }
    get actionItem() {
        return this.activeRecipe.product;
    }
    get unmodifiedActionQuantity() {
        return this.activeRecipe.baseQuantity;
    }
    get activeRecipe() {
        if (this.selectedRecipe === undefined)
            throw new Error('Tried to access active recipe, but none is selected.');
        return this.selectedRecipe;
    }
    get actionInterval() {
        let baseInterval = this.baseInterval;
        if(this.activeRecipe.baseInterval !== undefined)
            baseInterval = this.activeRecipe.baseInterval;
        return this.modifyInterval(baseInterval, this.activeRecipe);
    }
    get masteryAction() {
        return this.activeRecipe;
    }
    get masteryModifiedInterval() {
        return this.baseInterval;
    }

    get selectedAltRecipe() {
        let activeRecipe = this.setAltRecipes.get(this.activeRecipe);
        if(activeRecipe === undefined)
            activeRecipe = 0;
        return activeRecipe;
    }

    get unmodifiedActionQuantity() {
        const recipe = this.activeRecipe;
        let baseQuantity = recipe.baseQuantity;
        if (recipe.alternativeCosts !== undefined) {
            baseQuantity *= recipe.alternativeCosts[this.selectedAltRecipe].quantityMultiplier;
        }
        return baseQuantity;
    }

    selectAltRecipeOnClick(altID) {
        if (altID !== this.selectedAltRecipe && this.isActive && !this.stop())
            return;
        this.setAltRecipes.set(this.activeRecipe, altID);
        this.renderQueue.selectedRecipe = true;
        this.render();
    }

    getRecipeCosts(recipe) {
        const costs = super.getRecipeCosts(recipe);
        if(recipe.alternativeCosts !== undefined) {
            let altID = this.setAltRecipes.get(recipe);
            if(altID === undefined)
                altID = 0;
            const altCosts = recipe.alternativeCosts[altID];
            altCosts.itemCosts.forEach(({item, quantity}) => {
                costs.addItem(item, this.modifyItemCost(item, quantity, recipe));
            });
        }
        return costs;
    }

    preAction() {}
    get actionRewards() {
        const rewards = new Rewards(game);
        const recipe = this.activeRecipe;
        rewards.setActionInterval(this.actionInterval);
        //const actionEvent = new SmithingActionEvent(this,recipe);
        const item = recipe.product;
        const qtyToAdd = this.modifyPrimaryProductQuantity(item, this.unmodifiedActionQuantity, recipe);
        rewards.addItem(item, qtyToAdd);
        this.addCurrencyFromPrimaryProductGain(rewards, item, qtyToAdd, recipe);
        let ectoplasmQty = 1;
        if(rollPercentage(game.modifiers.getValue("necromancy:necromancyExtraEctoplasmChance", ModifierQuery.EMPTY)))
            ectoplasmQty += 1;
        rewards.addItemByID("necromancy:Ectoplasm", ectoplasmQty);
        //actionEvent.productQuantity = qtyToAdd;
        //this.game.stats.Smithing.add(this.isMakingBar ? SmithingStats.TotalBarsSmelted : SmithingStats.TotalItemsSmithed, qtyToAdd);
        rewards.addXP(this, this.actionXP, recipe);
        rewards.addAbyssalXP(this, this.actionAbyssalXP, recipe);

        //this.addCommonRewards(rewards, recipe);

        this.rollForRareDrops(this.actionLevel, rewards, recipe);
        this.rollForAdditionalItems(rewards, this.currentActionInterval, recipe);
        this.addMasteryXPReward();
        if (recipe !== undefined) {
            this.rollForMasteryTokens(rewards, recipe.realm);
            this.rollForAncientRelics(this.actionLevel, recipe.realm);
        }
        this.rollForSkillingPets(this.currentActionInterval, recipe);
        eventManager.rollForEventRewards(this.currentActionInterval, this, rewards);
        game.summoning.rollMarksForSkill(this, this.masteryModifiedInterval, recipe === null || recipe === void 0 ? void 0 : recipe.realm);


        //actionEvent.interval = this.currentActionInterval;
        //this._events.emit('action', actionEvent);
        return rewards;
    }
    postAction() {
        //this.game.stats.Smithing.inc(this.isMakingBar ? SmithingStats.SmeltingActions : SmithingStats.SmithingActions);
        //this.game.stats.Smithing.add(SmithingStats.TimeSpent, this.currentActionInterval);
        this.renderQueue.recipeInfo = true;
        this.renderQueue.quantities = true;
    }

    rollForSkillingPets(interval, action) {
        this.skillingPets.forEach((pet)=>{
            if(action === undefined || pet.isCorrectRealmForPetDrop(action.realm)) {
                if(pet.scaleChanceWithMasteryPool)
                    interval *= 1 + this.getMasteryPoolProgress(game.defaultRealm) / 100;
                game.petManager.rollForSkillPet(pet, interval, this);
            }
        });
    }

    render() {
        super.render();
        if(this.renderQueue.conjureBar)
            this.renderConjureBar();
        this.renderAttackSpellSelection();
        this.renderAugurySpellSelection();
        this.renderConjurationSpellSelection();
        this.renderIncantationSpellSelection();
    }
    renderConjureBar() {
        this.renderQueue.conjureBar = false;
        if (!this.conjuredEntity.conjureTimer.isActive) {
            this.conjureBar.stopAnimation();
            this.conjureMinibar.stopAnimation();
            return;
        }
        this.conjureBar.animateProgressFromTimer(this.conjuredEntity.conjureTimer);
        this.conjureMinibar.animateProgressFromTimer(this.conjuredEntity.conjureTimer);
    }
    renderConjureMinHit() {
        combatMenus.playerStats.setConjureMinHit(this.conjuredEntity.canAttack, this.conjuredEntity.minHit, game.combat.fightInProgress);
        if(this.conjuredEntity.canAttack) {
            $('.conjure-combat-bar').removeClass('invisible');
        } else {
            $('.conjure-combat-bar').addClass('invisible');
        }
    }
    renderConjureMaxHit() {
        combatMenus.playerStats.setConjureMaxHit(this.conjuredEntity.canAttack, this.conjuredEntity.maxHit, game.combat.fightInProgress);
        if(this.conjuredEntity.canAttack) {
            $('.conjure-combat-bar').removeClass('invisible');
        } else {
            $('.conjure-combat-bar').addClass('invisible');
        }
    }

    renderAttackSpellSelection() {
        if (!this.renderQueue.attackSpellSelection)
            return;
        combatMenus.necromancy.attackSpellMenu.highlightSpell(this.selectedAttackSpell);
        this.renderQueue.attackSpellSelection = false;
    }
    renderAugurySpellSelection() {
        if (!this.renderQueue.augurySpellSelection)
            return;
        combatMenus.necromancy.augurySpellMenu.highlightSpell(this.selectedAugurySpell);
        this.renderQueue.augurySpellSelection = false;
    }
    renderConjurationSpellSelection() {
        if (!this.renderQueue.conjurationSpellSelection)
            return;
        combatMenus.necromancy.conjurationSpellMenu.highlightSpell(this.selectedConjurationSpell);
        this.renderQueue.conjurationSpellSelection = false;
    }
    renderIncantationSpellSelection() {
        if (!this.renderQueue.incantationSpellSelection)
            return;
        combatMenus.necromancy.incantationSpellMenu.highlightSpell(this.selectedIncantationSpell);
        this.renderQueue.incantationSpellSelection = false;
    }

    renderSelectedRecipe() {
        if (!this.renderQueue.selectedRecipe)
            return;
        if (this.selectedRecipe !== undefined) {
            if(this.activeRecipe.alternativeCosts !== undefined) {
                this.menu.setRecipeDropdown(this.activeRecipe.alternativeCosts.map((cost) => {
                    return {
                        items: cost.itemCosts,
                        currencies: []
                    };
                }), (recipeID) => () => this.selectAltRecipeOnClick(recipeID));
                this.menu.showRecipeDropdown();
            } else {
                this.menu.hideRecipeDropdown();
            }
            this.menu.setEctoplasm(game.items.getObjectByID('necromancy:Ectoplasm'), 1);
        } else {
            this.menu.hideRecipeDropdown();
        }
        super.renderSelectedRecipe();
    }

    onLoad() {
        console.log("Necromancy onLoad");
        super.onLoad();
        if(this.selectedAttackSpell === undefined)
            this.selectedAttackSpell = this.spells.firstObject;
    }

    onAnyLevelUp() {
        super.onAnyLevelUp();
        game.combat.computeAllStats();
    }

    postDataRegistration() {
        super.postDataRegistration();
        this.sortedMasteryActions = sortRecipesByCategoryAndLevel(this.actions.allObjects, this.categories.allObjects);
        this.actions.forEach((action)=>{
            if (action.abyssalLevel > 0)
                this.abyssalMilestones.push(action);
            else
                this.milestones.push(action);
        });
        this.sortMilestones();
    }

    registerData(namespace, data) {
        if(data.skillingPets !== undefined) {
            data.skillingPets.forEach((petID)=>{
                const pet = game.pets.getObjectByID(petID);
                if (pet === undefined)
                    throw new Error(`Error registering data for ${this.id}. Pet with id: ${petID} is not registered.`);
                this.skillingPets.push(pet);
            });
        }

        if(data.categories !== undefined) {
            console.log(`Registering ${data.categories.length} Categories`);
            data.categories.forEach(data => {
                this.categories.registerObject(new SkillCategory(namespace, data, this, game));
            });
        }

        if(data.recipes !== undefined) {
            console.log(`Registering ${data.recipes.length} Recipes`);
            data.recipes.forEach(data => {
                this.actions.registerObject(new NecromancyRecipe(namespace, data, this, game));
            });
        }

        if(data.spells !== undefined) {
            console.log(`Registering ${data.spells.length} Spells`);
            data.spells.forEach(data => {
                this.spells.registerObject(new NecromancySpell(namespace, data));
            });
        }

        if(data.auguries !== undefined) {
            console.log(`Registering ${data.auguries.length} Auguries`);
            data.auguries.forEach(data => {
                this.auguries.registerObject(new NecromancyAugury(namespace, data));
            });
        }

        if(data.conjurations !== undefined) {
            console.log(`Registering ${data.conjurations.length} Conjurations`);
            data.conjurations.forEach(data => {
                this.conjurations.registerObject(new NecromancyConjuration(namespace, data));
            });
        }

        if(data.incantations !== undefined) {
            console.log(`Registering ${data.incantations.length} Incantations`);
            data.incantations.forEach(data => {
                this.incantations.registerObject(new NecromancyIncantation(namespace, data));
            });
        }

        super.registerData(namespace, data);
    }


    setDocumentImageSources(elem) {
        const images = elem.querySelectorAll(`img[data-necro-src]:not([src])`);
        images.forEach((image)=>{
            const baseURI = image.getAttribute('data-necro-src');
            image.src = getResourceUrl(baseURI);
        });
    }
    setImageSources() {
        this.setDocumentImageSources(document);
        const templates = document.querySelectorAll('template:not([data-image-init])');
        templates.forEach((template)=>{
            this.setDocumentImageSources(template.content);
            template.setAttribute('data-image-init', 'true');
        });
    }

    onModsLoaded() {
        this.setImageSources();
        game.combat.player.on('conjureAttackHit', (e) => game.combat.player.onEffectApplicatorTrigger('PlayerConjureAttackHit', {
            type: 'Other',
            damageDealt: e.rawDamage
        }));
    }

    onInterfaceAvailable() {
        document.getElementById('main-container').append(this.page);

        this.setImageSources();
    }

    initMenus() {
        super.initMenus();
        this.page.categoryMenu.addOptions(game.necromancy.categories.allObjects, "Select Necromancy Category", switchToCategory(this.selectionTabs));

        this.page.artisanMenu.init(game.necromancy);

        game.necromancy.categories.forEach((category)=>{
            const recipes = game.necromancy.actions.filter((r)=>r.category === category);
            recipes.sort(BasicSkillRecipe.sortByLevels);
            const tab = createElement('recipe-selection-tab', {
                className: 'col-12 col-lg-8 d-none',
                attributes: [['data-option-tag-name', 'necromancy-recipe-option']],
                parent: this.page.categoryContainer,
            });
            tab.setRecipes(recipes, game.necromancy);
            this.selectionTabs.set(category, tab);
        });



        document.getElementById('combat-progress-attack-summoning').before(createElement('progress-bar', {
            classList: ['progress-height-6', 'mb-1', 'conjure-combat-bar'],
            id: 'combat-progress-attack-conjure'
        }));
        tippy('#combat-progress-attack-conjure', {
            content: `<h5 class="font-w400 font-size-sm mb-1 text-center">Conjure Attack Interval Bar</h5>`,
            placement: 'top',
            allowHTML: true,
            interactive: false,
            animation: false,
        });

        document.getElementById('combat-progress-attack-summoning-1').before(createElement('progress-bar', {
            classList: ['progress-height-3', 'mx-2', 'mt-0', 'mb-2', 'conjure-combat-bar'],
            id: 'combat-progress-attack-conjure-1'
        }));
        tippy('#combat-progress-attack-conjure-1', {
            content: `<h5 class="font-w400 font-size-sm mb-1 text-center">Conjure Attack Interval Bar</h5>`,
            placement: 'top',
            allowHTML: true,
            interactive: false,
            animation: false,
        });

        combatMenus.progressBars.playerConjure = document.getElementById('combat-progress-attack-conjure');
        combatMenus.progressBars.playerConjureMinibar = document.getElementById('combat-progress-attack-conjure-1');
        combatMenus.progressBars.playerConjure.setStyle('bg-purple');
        combatMenus.progressBars.playerConjureMinibar.setStyle('bg-purple');

        combatMenus.playerStats.conjureMinIcon = createElement('img', {
            classList: ['skill-icon-xxs', 'm-0', 'mr-1'],
            attributes: [['src', getResourceUrl('assets/conjuration.png')]]
        });
        combatMenus.playerStats.conjureMinHit = createElement('span');

        combatMenus.playerStats.conjureMinHitContainer = createElement('div', {
            children: [
                createElement('span', {
                    children: [
                        combatMenus.playerStats.conjureMinIcon,
                        createElement('lang-string', {
                            attributes: [['lang-id', 'MINIMUM_HIT']]
                        })
                    ]
                }),
                createElement('span', {
                    children: [
                        createElement('img', {
                            classList: ['skill-icon-xxs', 'm-0', 'mr-2', 'd-none'],
                            id: 'max-hit-triangle-icon-4',
                            attributes: [['data-src', assets.getURI('assets/media/main/cb_triangle_icon.svg')]]
                        }),
                        combatMenus.playerStats.conjureMinHit
                    ]
                })
            ]
        });

        combatMenus.playerStats.conjureMaxIcon = createElement('img', {
            classList: ['skill-icon-xxs', 'm-0', 'mr-1'],
            attributes: [['src', getResourceUrl('assets/conjuration.png')]]
        });
        combatMenus.playerStats.conjureMaxHit = createElement('span');

        combatMenus.playerStats.conjureMaxHitContainer = createElement('div', {
            children: [
                createElement('span', {
                    children: [
                        combatMenus.playerStats.conjureMaxIcon,
                        createElement('lang-string', {
                            attributes: [['lang-id', 'GAME_GUIDE_30']]
                        })
                    ]
                }),
                createElement('span', {
                    children: [
                        createElement('img', {
                            classList: ['skill-icon-xxs', 'm-0', 'mr-2', 'd-none'],
                            id: 'max-hit-triangle-icon-5',
                            attributes: [['data-src', assets.getURI('assets/media/main/cb_triangle_icon.svg')]]
                        }),
                        combatMenus.playerStats.conjureMaxHit
                    ]
                })
            ]
        });

        combatMenus.playerStats.summoningMaxHitContainer.before(combatMenus.playerStats.conjureMinHitContainer, combatMenus.playerStats.conjureMaxHitContainer);


        this.combatMenuIndex = combatMenus.menuTabs.length;
        document.getElementById('combat-player-container').append(createElement('div', {
            classList: ['d-none'],
            id: `combat-menu-${this.combatMenuIndex}`,
            children: [
                createElement('necromancy-necronomicon-menu', {
                    id: 'combat-necromancy-menu'
                })
            ]
        }));
        document.getElementById('combat-menu-item-1').after(document.createTextNode(' '), createElement('img', {
            classList: ['combat-menu-img', 'border-rounded-equip', 'p-1', 'm-1', 'pointer-enabled'],
            id: `combat-menu-item-${this.combatMenuIndex}`,
            attributes: [
                ['src', getResourceUrl('assets/necronomicon.png')],
                ['onclick', `changeCombatMenu(${this.combatMenuIndex});`]
            ]
        }));
        tippy(`#combat-menu-item-${this.combatMenuIndex}`, {
            content: "<div class='text-center'>View Necronomicon</div>",
            placement: 'bottom',
            allowHTML: true,
            interactive: false,
            animation: false,
        });
        
        combatMenus.menuTabs.push(document.getElementById(`combat-menu-item-${this.combatMenuIndex}`));
        combatMenus.menuPanels.push(document.getElementById(`combat-menu-${this.combatMenuIndex}`));

        combatMenus.necromancy = document.getElementById('combat-necromancy-menu');
        combatMenus.necromancy.init();

        this.renderQueue.attackSpellSelection = true;
        this.renderQueue.augurySpellSelection = true;
        this.renderQueue.conjurationSpellSelection = true;
        this.renderQueue.incantationSpellSelection = true;
    }

    encode(writer) {
        let start = writer.byteOffset;
        super.encode(writer); // Encode default skill data
        writer.writeUint32(this.version); // Store current skill version

        writer.writeBoolean(game.combat.player.attackStyles.necro !== undefined);
        if(game.combat.player.attackStyles.necro)
            writer.writeNamespacedObject(game.combat.player.attackStyles.necro);

        writer.writeUint32(this.auguryTurnOffset);

        writer.writeComplexMap(this.savedAttackSpells, (key, value, writer) => {
            writer.writeUint16(key);
            writer.writeNamespacedObject(value);
        });
        writer.writeComplexMap(this.savedAugurySpells, (key, value, writer) => {
            writer.writeUint16(key);
            writer.writeNamespacedObject(value);
        });
        writer.writeComplexMap(this.savedConjurationSpells, (key, value, writer) => {
            writer.writeUint16(key);
            writer.writeNamespacedObject(value);
        });
        writer.writeComplexMap(this.savedIncantationSpells, (key, value, writer) => {
            writer.writeUint16(key);
            writer.writeNamespacedObject(value);
        });

        this.conjuredEntity.encode(writer);


        writer.writeMap(this.setAltRecipes, writeNamespaced, (altId, writer)=>{
            writer.writeUint16(altId);
        });

        let end = writer.byteOffset;
        console.log(`Wrote ${end-start} bytes for Necromancy save`);
        return writer;
    }

    decode(reader, version) {
        //console.log("Adventuring save decoding");
        let start = reader.byteOffset;
        reader.byteOffset -= Uint32Array.BYTES_PER_ELEMENT; // Let's back up a minute and get the size of our skill data
        let skillDataSize = reader.getUint32();

        try {
            super.decode(reader, version);
            this.saveVersion = reader.getUint32(); // Read save version

            if (reader.getBoolean()) {
                const style = reader.getNamespacedObject(game.attackStyles);
                if (typeof style === 'string')
                    game.combat.player.attackStyles.necro = game.attackStyles.find((style)=>style.attackType === 'necro');
                else
                    game.combat.player.attackStyles.necro = style;
            }

            this.auguryTurnOffset = reader.getUint32();

            reader.getComplexMap((reader) => {
                let key = reader.getUint16();
                let value = reader.getNamespacedObject(this.spells);
                if(typeof value !== 'string')
                    this.savedAttackSpells.set(key, value);
            });
            reader.getComplexMap((reader) => {
                let key = reader.getUint16();
                let value = reader.getNamespacedObject(this.auguries);
                if(typeof value !== 'string')
                    this.savedAugurySpells.set(key, value);
            });
            reader.getComplexMap((reader) => {
                let key = reader.getUint16();
                let value = reader.getNamespacedObject(this.conjurations);
                if(typeof value !== 'string')
                    this.savedConjurationSpells.set(key, value);
            });
            reader.getComplexMap((reader) => {
                let key = reader.getUint16();
                let value = reader.getNamespacedObject(this.incantations);
                if(typeof value !== 'string')
                    this.savedIncantationSpells.set(key, value);
            });
            
            this.conjuredEntity.decode(reader, version);

            this.setAltRecipes = reader.getMap(readNamespacedReject(this.actions), (reader)=>reader.getUint16());

        } catch(e) { // Something's fucky, dump all progress and skip past the trash save data
            console.log(e);
            reader.byteOffset = start;
            reader.getFixedLengthBuffer(skillDataSize);
        }

        let end = reader.byteOffset;
        console.log(`Read ${end-start} bytes for Necromancy save, expected ${skillDataSize}`);

        if(end-start !== skillDataSize) {
            reader.byteOffset = start;
            reader.getFixedLengthBuffer(skillDataSize);
        }
    }

    generateEquipmentCSV() {
        let a = ``;
        a += `Namespace\tId\tName\tslot\tdefence\tattack\tranged\tmagic\tnecromancy\tattackSpeed\tstabAttackBonus\tslashAttackBonus\tblockAttackBonus\trangedAttackBonus\tmagicAttackBonus\tnecroAttackBonus\tmeleeStrengthBonus\trangedStrengthBonus\tmagicDamageBonus\tnecroStrengthBonus\tmeleeDefenceBonus\trangedDefenceBonus\tmagicDefenceBonus\tnecroDefenceBonus\tsummoningMaxhit\tdamageReduction\tabyssalResistance\n`;
        game.items.equipment.forEach((item)=>{
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
            a += `${item.id.split(':')[0]}\t`;
            a += `${item.id.split(':')[1]}\t`;
            a += `${item.name}\t`;
            a += `${(_b = (_a = item.validSlots[0]) === null || _a === void 0 ? void 0 : _a) !== null && _b !== void 0 ? _b.id : ''}\t`;
            a += `${(_b = (_a = item.equipRequirements.find(r => r.type==='SkillLevel' && r.skill===game.defence)) === null || _a === void 0 ? void 0 : _a) !== null && _b !== void 0 ? _b.level : ''}\t`;
            a += `${(_b = (_a = item.equipRequirements.find(r => r.type==='SkillLevel' && r.skill===game.attack)) === null || _a === void 0 ? void 0 : _a) !== null && _b !== void 0 ? _b.level : ''}\t`;
            a += `${(_b = (_a = item.equipRequirements.find(r => r.type==='SkillLevel' && r.skill===game.ranged)) === null || _a === void 0 ? void 0 : _a) !== null && _b !== void 0 ? _b.level : ''}\t`;
            a += `${(_b = (_a = item.equipRequirements.find(r => r.type==='SkillLevel' && r.skill===game.altMagic)) === null || _a === void 0 ? void 0 : _a) !== null && _b !== void 0 ? _b.level : ''}\t`;
            a += `${(_b = (_a = item.equipRequirements.find(r => r.type==='SkillLevel' && r.skill===game.necromancy)) === null || _a === void 0 ? void 0 : _a) !== null && _b !== void 0 ? _b.level : ''}\t`;
            a += `${(_b = (_a = item.equipmentStats.find((stat)=>stat.key === 'attackSpeed')) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''}\t`;
            a += `${(_d = (_c = item.equipmentStats.find((stat)=>stat.key === 'stabAttackBonus')) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : ''}\t`;
            a += `${(_f = (_e = item.equipmentStats.find((stat)=>stat.key === 'slashAttackBonus')) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : ''}\t`;
            a += `${(_h = (_g = item.equipmentStats.find((stat)=>stat.key === 'blockAttackBonus')) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : ''}\t`;
            a += `${(_k = (_j = item.equipmentStats.find((stat)=>stat.key === 'rangedAttackBonus')) === null || _j === void 0 ? void 0 : _j.value) !== null && _k !== void 0 ? _k : ''}\t`;
            a += `${(_m = (_l = item.equipmentStats.find((stat)=>stat.key === 'magicAttackBonus')) === null || _l === void 0 ? void 0 : _l.value) !== null && _m !== void 0 ? _m : ''}\t`;
            a += `${(_o = (_m = item.equipmentStats.find((stat)=>stat.key === 'necroAttackBonus')) === null || _m === void 0 ? void 0 : _m.value) !== null && _o !== void 0 ? _o : ''}\t`;
            a += `${(_p = (_o = item.equipmentStats.find((stat)=>stat.key === 'meleeStrengthBonus')) === null || _o === void 0 ? void 0 : _o.value) !== null && _p !== void 0 ? _p : ''}\t`;
            a += `${(_r = (_q = item.equipmentStats.find((stat)=>stat.key === 'rangedStrengthBonus')) === null || _q === void 0 ? void 0 : _q.value) !== null && _r !== void 0 ? _r : ''}\t`;
            a += `${(_t = (_s = item.equipmentStats.find((stat)=>stat.key === 'magicDamageBonus')) === null || _s === void 0 ? void 0 : _s.value) !== null && _t !== void 0 ? _t : ''}\t`;
            a += `${(_s = (_r = item.equipmentStats.find((stat)=>stat.key === 'necroStrengthBonus')) === null || _r === void 0 ? void 0 : _r.value) !== null && _s !== void 0 ? _s : ''}\t`;
            a += `${(_v = (_u = item.equipmentStats.find((stat)=>stat.key === 'meleeDefenceBonus')) === null || _u === void 0 ? void 0 : _u.value) !== null && _v !== void 0 ? _v : ''}\t`;
            a += `${(_x = (_w = item.equipmentStats.find((stat)=>stat.key === 'rangedDefenceBonus')) === null || _w === void 0 ? void 0 : _w.value) !== null && _x !== void 0 ? _x : ''}\t`;
            a += `${(_z = (_y = item.equipmentStats.find((stat)=>stat.key === 'magicDefenceBonus')) === null || _y === void 0 ? void 0 : _y.value) !== null && _z !== void 0 ? _z : ''}\t`;
            a += `${(_0 = (_z = item.equipmentStats.find((stat)=>stat.key === 'necroDefenceBonus')) === null || _z === void 0 ? void 0 : _z.value) !== null && _0 !== void 0 ? _0 : ''}\t`;
            a += `${(_1 = (_0 = item.equipmentStats.find((stat)=>stat.key === 'summoningMaxhit')) === null || _0 === void 0 ? void 0 : _0.value) !== null && _1 !== void 0 ? _1 : ''}\t`;
            a += `${(_2 = item.equipmentStats.find((stat)=>stat.key === 'resistance' && stat.damageType.id === "melvorD:Normal")) !== null && _2 !== void 0 ? _2.value : ''}\t`;
            a += `${(_3 = item.equipmentStats.find((stat)=>stat.key === 'resistance' && stat.damageType.id === "melvorItA:Abyssal")) !== null && _3 !== void 0 ? _3.value : ''}\t`;
            a += `\n`;
        });
        console.log(a);
    }

    generateMonsterCSV() {
        let a = ``;
        a += `Namespace\tId\tName\tIs Dungeon\tIs Boss\tCan Slayer\tAttack Type\tCombat Level\tHP Level\tAttack Level\tStrength Level\tDefence Level\tRanged Level\tMagic Level\tNecromancy Level\tCorruption Level\tAttack Speed\tStab Bonus\tSlash Bonus\tBlock Bonus\tRanged Attack Bonus\tMagic Attack Bonus\tNecro Attack Bonus\tMelee Strength Bonus\tRanged Strength Bonus\tMagic Damage Bonus\tNecro Strength Bonus\tMelee Defence Bonus\tRanged Defence Bonus\tMagic Defence Bonus\tNecro Defence Bonus\tDamage Reduction\tAbyssal Resistance\tMax Hit\tDesired Max Hit\tAccuracy\tMelee Evasion\tRanged Evasion\tMagic Evasion\tNecro Evasion\t\n`;
        game.monsters.forEach((monster)=>{
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
            a += `${monster.id.split(':')[0]}\t`;
            a += `${monster.id.split(':')[1]}\t`;
            a += `${monster.name}\t`;
            a += `${game.dungeons.find(dungeon => dungeon.monsters.includes(monster)) !== undefined}\t`;
            a += `${monster.isBoss}\t`;
            a += `${monster.canSlayer}\t`;
            a += `${monster.attackType}\t`;
            a += `${monster.combatLevel}\t`;
            a += `${monster.levels.Hitpoints}\t`;
            a += `${monster.levels.Attack}\t`;
            a += `${monster.levels.Strength}\t`;
            a += `${monster.levels.Defence}\t`;
            a += `${monster.levels.Ranged}\t`;
            a += `${monster.levels.Magic}\t`;
            a += `${monster.levels.Necromancy}\t`;
            a += `${(_a = monster.levels.Corruption) !== null && _a !== void 0 ? _a : 0}\t`;
            a += `${(_c = (_b = monster.equipmentStats.find((stat)=>stat.key === 'attackSpeed')) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : ''}\t`;
            a += `${(_e = (_d = monster.equipmentStats.find((stat)=>stat.key === 'stabAttackBonus')) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : ''}\t`;
            a += `${(_g = (_f = monster.equipmentStats.find((stat)=>stat.key === 'slashAttackBonus')) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : ''}\t`;
            a += `${(_j = (_h = monster.equipmentStats.find((stat)=>stat.key === 'blockAttackBonus')) === null || _h === void 0 ? void 0 : _h.value) !== null && _j !== void 0 ? _j : ''}\t`;
            a += `${(_l = (_k = monster.equipmentStats.find((stat)=>stat.key === 'rangedAttackBonus')) === null || _k === void 0 ? void 0 : _k.value) !== null && _l !== void 0 ? _l : ''}\t`;
            a += `${(_o = (_m = monster.equipmentStats.find((stat)=>stat.key === 'magicAttackBonus')) === null || _m === void 0 ? void 0 : _m.value) !== null && _o !== void 0 ? _o : ''}\t`;
            a += `${(_o = (_m = monster.equipmentStats.find((stat)=>stat.key === 'necroAttackBonus')) === null || _m === void 0 ? void 0 : _m.value) !== null && _o !== void 0 ? _o : ''}\t`;
            a += `${(_q = (_p = monster.equipmentStats.find((stat)=>stat.key === 'meleeStrengthBonus')) === null || _p === void 0 ? void 0 : _p.value) !== null && _q !== void 0 ? _q : ''}\t`;
            a += `${(_s = (_r = monster.equipmentStats.find((stat)=>stat.key === 'rangedStrengthBonus')) === null || _r === void 0 ? void 0 : _r.value) !== null && _s !== void 0 ? _s : ''}\t`;
            a += `${(_u = (_t = monster.equipmentStats.find((stat)=>stat.key === 'magicDamageBonus')) === null || _t === void 0 ? void 0 : _t.value) !== null && _u !== void 0 ? _u : ''}\t`;
            a += `${(_s = (_r = monster.equipmentStats.find((stat)=>stat.key === 'necroStrengthBonus')) === null || _r === void 0 ? void 0 : _r.value) !== null && _s !== void 0 ? _s : ''}\t`;
            a += `${(_w = (_v = monster.equipmentStats.find((stat)=>stat.key === 'meleeDefenceBonus')) === null || _v === void 0 ? void 0 : _v.value) !== null && _w !== void 0 ? _w : ''}\t`;
            a += `${(_y = (_x = monster.equipmentStats.find((stat)=>stat.key === 'rangedDefenceBonus')) === null || _x === void 0 ? void 0 : _x.value) !== null && _y !== void 0 ? _y : ''}\t`;
            a += `${(_0 = (_z = monster.equipmentStats.find((stat)=>stat.key === 'magicDefenceBonus')) === null || _z === void 0 ? void 0 : _z.value) !== null && _0 !== void 0 ? _0 : ''}\t`;
            a += `${(_0 = (_z = monster.equipmentStats.find((stat)=>stat.key === 'necroDefenceBonus')) === null || _z === void 0 ? void 0 : _z.value) !== null && _0 !== void 0 ? _0 : ''}\t`;
            a += `${(_1 = monster.equipmentStats.find((stat)=>stat.key === 'resistance' && stat.damageType.id === "melvorD:Normal")) !== null && _1 !== void 0 ? _1.value : ''}\t`;
            a += `${(_2 = monster.equipmentStats.find((stat)=>stat.key === 'resistance' && stat.damageType.id === "melvorItA:Abyssal")) !== null && _2 !== void 0 ? _2.value : ''}\t`;
            const e = new Enemy(game.combat,game);
            e.modifiers.init(game);
            e.setNewMonster(monster);
            a += `${e.stats.maxHit}\t`;
            a += `${e.stats.maxHit}\t`;
            a += `${e.stats.accuracy}\t`;
            a += `${e.stats.evasion.melee}\t`;
            a += `${e.stats.evasion.ranged}\t`;
            a += `${e.stats.evasion.magic}\t`;
            a += `${e.stats.evasion.necro}\t`;
            a += `\n`;
        });
        console.log(a);
    }
}

