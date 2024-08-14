const { loadModule, version } = mod.getContext(import.meta);

export class NecromancyAugury extends NamespacedObject {
    constructor(namespace, data) {
        super(namespace, data.id);
        if(data.customDescription)
            this.customDescription = data.customDescription;
        try {
            this._name = data.name;
            this._media = data.media;
            this.level = data.level;
            this.abyssalLevel = data.abyssalLevel !== undefined ? data.abyssalLevel : 0;
            this.itemsConsumed = game.items.getQuantities(data.itemsConsumed);
            this.turns = data.turns;
            if(data.specialAttacks !== undefined)
                this.specialAttacks = data.specialAttacks.map(specialAttack => game.specialAttacks.getObjectSafe(specialAttack));
        
            game.queueForSoftDependencyReg(data, this);
        } catch (e) {
            throw new DataConstructionError(NecromancyAugury.name, e, this.id);
        }
    }
    registerSoftDependencies(data, game) {
        try {
            if(data.consumesEffect !== undefined) {
                const consumes = data.consumesEffect;
                const effect = game.combatEffects.getObjectSafe(consumes.effectID);
                if(consumes.paramName !== undefined && effect.parameters[consumes.paramName] === undefined)
                    throw new Error(`Attack defines effect consumption refering to parameter: ${consumes.paramName}, but parameter does not exist on CombatEffect.`);
                if(consumes.statGroupName !== undefined && effect.statGroups[consumes.statGroupName] === undefined)
                    throw new Error(`Attack defines effect consumption refering to statGroup: ${consumes.statGroupName}, but statGroup does not exist on CombatEffect.`);
                
                this.consumesEffect = {
                    effect,
                    type: consumes.type,
                    target: consumes.target,
                    amountMax: consumes.amountMax
                };

                if(consumes.paramName !== undefined)
                    this.consumesEffect.paramName = consumes.paramName;
                if(consumes.statGroupName !== undefined)
                    this.consumesEffect.statGroupName = consumes.statGroupName;
            }
        } catch (e) {
            throw new DataConstructionError(NecromancyAugury.name, e, this.id);
        }
    }
    get name() {
        return this._name;
    }
    get media() {
        return this.getMediaURL(this._media);
    }
    get description() {
        if(this.customDescription !== undefined)
            return this.customDescription;
        return joinAsLineBreakList(this.specialAttacks.map(attack => attack.modifiedDescription));
    }
}