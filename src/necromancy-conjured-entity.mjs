const { loadModule, version } = mod.getContext(import.meta);


class PlayerConjureAttackHitEvent extends IntervaledGameEvent {
    constructor() {
        super();
        this.damage = 0;
        this.rawDamage = 0;
    }
}

export class NecromancyConjuredEntity {
    constructor() {
        this.conjureTimer = new Timer('Conjure', () => this.conjureAttack());
    }
    get canAttack() {
        return game.necromancy.selectedConjurationSpell !== undefined && game.necromancy.canUseConjuration
    }
    get minHit() {
        const canAttack = this.canAttack;
        let minHit = 0;
        if(canAttack) {
            let damage = game.combat.player.stats.minHit * (game.necromancy.selectedConjurationSpell.hitPercent / 100);
            damage = this.modifyConjureMinHit(damage);
            minHit = Math.floor(this.modifyConjureAttackDamage(damage, false));
        }
        return minHit;
    }
    get maxHit() {
        const canAttack = this.canAttack;
        let maxHit = 0;
        if(canAttack) {
            let damage = game.combat.player.stats.maxHit * (game.necromancy.selectedConjurationSpell.hitPercent / 100);
            damage = this.modifyConjureMaxHit(damage);
            maxHit = Math.floor(this.modifyConjureAttackDamage(damage, false));
        }
        return maxHit;
    }
    startConjureAttack(tickOffset=false) {
        if(this.canAttack) {
            this.conjureTimer.start(this.conjureAttackInterval, tickOffset);
        } else {
            this.conjureTimer.stop();
        }
        game.necromancy.renderQueue.conjureBar = true;
    }
    get conjureAttackInterval() {
        let attackInterval = game.necromancy.selectedConjurationSpell.attackInterval;
        attackInterval = this.modifyConjureAttackInterval(attackInterval);
        attackInterval = roundToTickInterval(attackInterval);
        return Math.max(attackInterval, 250);
    }
    modifyConjureAttackInterval(attackInterval) {
        let intervalMod = game.combat.player.modifiers.getValue('necromancy:conjurationAttackInterval', ModifierQuery.EMPTY);
        attackInterval = applyModifier(attackInterval, intervalMod);
        attackInterval += game.combat.player.modifiers.getValue('necromancy:flatConjurationAttackInterval', ModifierQuery.EMPTY);
        return attackInterval;
    }
    modifyConjureAttackDamage(damage) {
        damage = game.combat.player.applyTriangleToDamage(game.combat.player.target, damage);
        damage = this.applyConjureDamageModifiers(damage);
        if (game.combat.fightInProgress)
            damage *= 1 - game.combat.player.target.stats.getResistance(game.normalDamage) / 100;
        return Math.floor(damage);
    }
    modifyConjureMinHit(minHit) {
        let minHitMod = game.combat.player.modifiers.getValue('necromancy:conjurationMinHit', ModifierQuery.EMPTY);
        let flatMinHitMod = game.combat.player.modifiers.getValue('necromancy:flatConjurationMinHit', ModifierQuery.EMPTY);
        minHit = applyModifier(minHit, minHitMod);
        minHit += numberMultiplier * flatMinHitMod;
        return minHit;
    }
    modifyConjureMaxHit(maxHit) {
        let maxHitMod = game.combat.player.modifiers.getValue('necromancy:conjurationMaxHit', ModifierQuery.EMPTY);
        let flatMaxHitMod = game.combat.player.modifiers.getValue('necromancy:flatConjurationMaxHit', ModifierQuery.EMPTY);
        maxHit = applyModifier(maxHit, maxHitMod);
        maxHit += numberMultiplier * flatMaxHitMod;
        return maxHit;
    }
    applyConjureDamageModifiers(damage) {
        return Math.floor(damage);
    }
    clampConjureAttackDamage(damage, target) {
        return Math.min(damage, target.hitpoints);
    }
    conjureAttack() {
        const event = new PlayerConjureAttackHitEvent();
        const targetImmune = game.combat.player.target.isImmuneTo(game.combat.player) || this.maxHit === 0;
        if(game.combat.areaRequirementsMet && game.combat.player.stats.hitChance >= game.necromancy.minHitPercent && !targetImmune) {
            let damage = rollInteger(this.minHit, this.maxHit);
            damage = Math.floor(damage * (game.combat.player.stats.hitChance / 100));
            event.rawDamage = damage;
            damage = this.clampConjureAttackDamage(damage, game.combat.player.target);
            game.combat.player.target.damage(damage, 'ConjureAttack');
            const lifesteal = Math.floor((game.combat.player.modifiers.getValue('necromancy:conjurationLifesteal', ModifierQuery.EMPTY) / 100) * damage);
            if (lifesteal > 0)
            game.combat.player.heal(lifesteal);
            event.damage = damage;
            event.interval = this.conjureTimer.maxTicks * TICK_INTERVAL;
            game.combat.player._events.emit('conjureAttackHit', event);
        } else {
            game.combat.player.target.fireMissSplash(targetImmune);
        }
        if(this.canAttack)
            this.startConjureAttack();
    }
    encode(writer) {
        this.conjureTimer.encode(writer);
    }
    decode(reader, version) {
        this.conjureTimer.decode(reader, version);
    }
}