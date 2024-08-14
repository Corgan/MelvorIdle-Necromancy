export async function setup({ name, namespace, characterStorage, gameData, patch, loadTemplates, loadModule, onModsLoaded, onCharacterSelectionLoaded, onInterfaceAvailable, onCharacterLoaded, onInterfaceReady }) {
    patch(CombatManager, 'combatTriangle').get(function(o) {
        let triangle = o();
        
        triangle.damageModifier.melee.necro = 1;
        triangle.damageModifier.ranged.necro = 1;
        triangle.damageModifier.magic.necro = 1;
        triangle.damageModifier.necro = { melee: 1, ranged: 1, magic: 1, necro: 1 };

        triangle.reductionModifier.melee.necro = 1;
        triangle.reductionModifier.ranged.necro = 1;
        triangle.reductionModifier.magic.necro = 1;
        triangle.reductionModifier.necro = { melee: 1, ranged: 1, magic: 1, necro: 1 };

        return triangle;
    });
    
    equipStatKeys.push('necroAttackBonus', 'necroStrengthBonus', 'necroDefenceBonus');
    loadedLangJson['EQUIPMENT_STAT_necroAttackBonus'] = '${statValue} Necromancy Attack Bonus';
    loadedLangJson['EQUIPMENT_STAT_necroStrengthBonus'] = '${statValue} Necromancy Strength Bonus';
    loadedLangJson['EQUIPMENT_STAT_necroDefenceBonus'] = '${statValue} Necromancy Defence Bonus';
    loadedLangJson['COMBAT_MISC_necro_vs_melee'] = 'Necromancy vs. Melee';
    loadedLangJson['COMBAT_MISC_necro_vs_ranged'] = 'Necromancy vs. Ranged';
    loadedLangJson['COMBAT_MISC_necro_vs_magic'] = 'Necromancy vs. Magic';
    loadedLangJson['COMBAT_MISC_necro_vs_necro'] = 'Necromancy vs. Necromancy';

    console.log("Loading Necromancy Templates");
    await loadTemplates("templates.html"); // Add templates
  
    console.log("Loading Necromancy Module");
    const { Necromancy } = await loadModule('src/necromancy.mjs');

    game.necromancy = game.registerSkill(game.registeredNamespaces.getNamespace('necromancy'), Necromancy); // Register skill

    let skills = game.pages.getObjectByID('melvorD:Combat').skills;
    skills.splice(skills.indexOf(game.altMagic)+1, 0, game.necromancy);

    MonsterSelectTableElement.attackTypeMedia.necro = game.necromancy.media;
    
    rollData['AmplifiedMaxHit'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} max hit`,
    }
    rollData['AmplifiedMinHit'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} min hit`,
    }

    rollData['MaxHitScaledByMissingHP'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} max hit multiplied by ${name} missing hitpoints percent`,
    }
    rollData['MinHitScaledByMissingHP'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} min hit multiplied by ${name} missing hitpoints percent`,
    }

    const _getDamageRoll = getDamageRoll;
    getDamageRoll = function(character, type, percent, damageDealt=0, damageTaken=0) {
        if(character.attackType === 'necro') {
            let damageMod = 1;
            if(character.manager.fightInProgress)
                damageMod = (character.stats.hitChance / 100);

                if(type === 'AmplifiedMaxHit') {
                    let foundDamage = character.nextAttack.damage.find(d => d.maxRoll === type && d.maxPercent === percent);
                    let ampedValue = 0;
                    if(foundDamage !== undefined) {
                        let { effectID, paramName, statGroupName, amountMax, amplifyAmount } = foundDamage.amplifyEffect;
                        let effect = game.combatEffects.getObjectSafe(effectID);
                        let target = foundDamage.amplifyEffect.target === "Self" ? character : character.target;
                        let existingEffect = target.activeEffects.get(effect);
                        let stacks = 0;
                        if(existingEffect !== undefined) {
                            if(paramName !== undefined)
                                stacks = existingEffect.getParameter(paramName);
                            if(statGroupName !== undefined)
                                stacks = existingEffect.getStatGroup(statGroupName);
                            if(amountMax !== undefined)
                                stacks = Math.min(stacks, amountMax);
                        }
                        ampedValue = stacks * amplifyAmount;
                    }
                    type = 'MaxHit'
                    percent = percent + ampedValue;
                }
                if(type === 'AmplifiedMinHit') {
                    let foundDamage = character.nextAttack.damage.find(d => d.minRoll === type && d.minPercent === percent);
                    let ampedValue = 0;
                    if(foundDamage !== undefined) {
                        let { effectID, paramName, statGroupName, amountMax, amplifyAmount } = foundDamage.amplifyEffect;
                        let effect = game.combatEffects.getObjectSafe(effectID);
                        let target = foundDamage.amplifyEffect.target === "Self" ? character : character.target;
                        let existingEffect = target.activeEffects.get(effect);
                        let stacks = 0;
                        if(existingEffect !== undefined) {
                            if(paramName !== undefined)
                                stacks = existingEffect.getParameter(paramName);
                            if(statGroupName !== undefined)
                                stacks = existingEffect.getStatGroup(statGroupName);
                            if(amountMax !== undefined)
                                stacks = Math.min(stacks, amountMax);
                        }
                        ampedValue = stacks * amplifyAmount;
                    }
                    type = 'MinHit'
                    percent = percent + ampedValue;
                }
                if(type === 'MaxHitScaledByMissingHP') {
                    type = 'MaxHit';
                    percent = percent * (1 + Math.floor(character.target.hitpointsPercent / 100));
                }
                if(type === 'MinHitScaledByMissingHP') {
                    type = 'MinHit'
                    percent = percent * (1 + Math.floor(character.target.hitpointsPercent / 100));
                }
            return Math.floor(_getDamageRoll(character, type, percent, damageDealt, damageTaken) * damageMod);
        } else {
            return _getDamageRoll(character, type, percent, damageDealt, damageTaken);
        }
    }

    patch(Player, 'onHit').after(function() {
        this.nextAttack.damage.forEach(damage => {
            if(damage.maxRoll === 'AmplifiedMaxHit' || damage.minRoll === 'AmplifiedMinHit') {
                let { effectID, paramName, statGroupName, amountMax, amplifyAmount } = damage.amplifyEffect;
                let effect = game.combatEffects.getObjectSafe(effectID);
                let target = damage.amplifyEffect.target === "Self" ? this : this.target;
                let existingEffect = target.activeEffects.get(effect);
                if(existingEffect !== undefined) {
                    let stacks = 0;
                    let existingStacks = 0;

                    if(paramName !== undefined)
                        existingStacks = existingEffect.getParameter(paramName);
                    if(statGroupName !== undefined)
                        existingStacks = existingEffect.getStatGroup(statGroupName);

                    stacks += existingStacks;
                    if(amountMax !== undefined)
                        stacks = Math.min(stacks, amountMax);

                    if(stacks > 0) {
                        if(paramName !== undefined)
                            existingEffect.setParameter(paramName, Math.max(0, existingStacks - stacks));
                        if(statGroupName !== undefined)
                            existingEffect.setStats(statGroupName, Math.max(0, existingStacks - stacks));
                    }
                }
            }
        });

        let spell = game.necromancy.selectedAugurySpell;
        if(!this.isAttacking && spell !== undefined && spell.consumesEffect !== undefined && spell.specialAttacks.includes(this.nextAttack)) {
            let target = spell.consumesEffect.target === "Self" ? this : this.target;
            const existingEffect = target.activeEffects.get(spell.consumesEffect.effect);
            if(existingEffect !== undefined) {
                let stackCount = 0;
                if(spell.consumesEffect.paramName !== undefined)
                    stackCount += existingEffect.getParameter(spell.consumesEffect.paramName);
                if(spell.consumesEffect.statGroupName !== undefined)
                    stackCount += existingEffect.getStatGroup(spell.consumesEffect.statGroupName);

                let toRemove = Math.min(stackCount, spell.consumesEffect.amountMax);

                if(toRemove <= stackCount) {
                    target.removeCombatEffect(spell.consumesEffect.effect);
                } else {
                    if(spell.consumesEffect.paramName !== undefined)
                        existingEffect.setParameter(spell.consumesEffect.paramName, stackCount - toRemove);
                    if(spell.consumesEffect.statGroupName !== undefined)
                        existingEffect.getStats(spell.consumesEffect.statGroupName, stackCount - toRemove);
                }
            }
        }
    });

    patch(Enemy, 'onHit').after(function() {
        this.nextAttack.damage.forEach(damage => {
            if(damage.maxRoll === 'AmplifiedMaxHit' || damage.minRoll === 'AmplifiedMinHit') {
                let { effectID, paramName, statGroupName, amountMax, amplifyAmount } = damage.amplifyEffect;
                let effect = game.combatEffects.getObjectSafe(effectID);
                let target = damage.amplifyEffect.target === "Self" ? this : this.target;
                let existingEffect = target.activeEffects.get(effect);
                if(existingEffect !== undefined) {
                    let stacks = 0;
                    let existingStacks = 0;

                    if(paramName !== undefined)
                        existingStacks = existingEffect.getParameter(paramName);
                    if(statGroupName !== undefined)
                        existingStacks = existingEffect.getStatGroup(statGroupName);

                    stacks += existingStacks;
                    if(amountMax !== undefined)
                        stacks = Math.min(stacks, amountMax);

                    if(stacks > 0) {
                        if(paramName !== undefined)
                            existingEffect.setParameter(paramName, Math.max(0, existingStacks - stacks));
                        if(statGroupName !== undefined)
                            existingEffect.setStats(statGroupName, Math.max(0, existingStacks - stacks));
                    }
                }
            }
        });
    });

    patch(Monster, 'applyDataModification').after(function(ret, modData, game) {
        if (modData.levels !== undefined) {
            if (modData.levels.Necromancy) {
                this.levels.Necromancy = modData.levels.Necromancy;
            }
        }
    });

    patch(EquipmentStats, 'addStats').before(function(stats) {
        if(this.necroAttackBonus === undefined)
            this.necroAttackBonus = 0;
        if(this.necroStrengthBonus === undefined)
            this.necroStrengthBonus = 0;
        if(this.necroDefenceBonus === undefined)
            this.necroDefenceBonus = 0;
    });

    patch(EquipmentStats, 'resetStats').before(function() {
        this.necroAttackBonus = 0;
        this.necroStrengthBonus = 0;
        this.necroDefenceBonus = 0;
    });

    patch(CharacterModifierTable, 'getCritChance').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.critChance;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    patch(CharacterModifierTable, 'getProtectionValue').replace(function(o, type) {
        if(type === 'necro') {
            return 0;
        } else {
            return o(type);
        }
    });

    patch(CharacterModifierTable, 'getImmunity').replace(function(o, type) {
        if(type === 'necro') {
            return false;
        } else {
            return o(type);
        }
    });

    Character.prototype.computeNecroMaxHit = function() {
        let level = this.levels.Necromancy;
        if (this.damageType.id === "melvorItA:Abyssal" || this.damageType.id === "melvorItA:Eternal")
            level += this.abyssalLevels.Necromancy;
        return Character.calculateStandardMaxHit(level, this.equipmentStats.necroStrengthBonus);
    }

    Player.prototype.computeNecroMaxHit = function() {
        let strengthBonus = this.equipmentStats.necroStrengthBonus + this.modifiers.getValue('necromancy:flatNecromancyStrengthBonus', ModifierQuery.EMPTY);
        
        //let twoHandModifier = 1;
        //if (this.equipment.isWeapon2H)
        //    twoHandModifier = 2;
        //strengthBonus += this.modifiers.flatRangedStrengthBonusPerAttackInterval * Math.floor(this.stats.attackInterval / 100) * twoHandModifier;
        let modifier = this.modifiers.getValue('necromancy:necroStrengthBonus', ModifierQuery.EMPTY);
        
        //if(this.equipment.isWeapon2H)
        //    modifier += this.modifiers.rangedStrengthBonusWith2HWeapon;

        strengthBonus = applyModifier(strengthBonus, modifier);
        let necroLevel = this.levels.Necromancy;
        if (this.damageType.id === "melvorItA:Abyssal" || this.damageType.id === "melvorItA:Eternal")
            necroLevel += this.abyssalLevels.Necromancy;
        return Character.calculateStandardMaxHit(necroLevel, strengthBonus);
    }

    patch(Character, 'rollToHit').replace(function(o, target, attack) {
        if(this.attackType === 'necro') {
            return this.stats.hitChance >= game.necromancy.minHitPercent;
        } else {
            return o(target, attack);
        }
    });
    
    patch(Character, 'computeMinHit').replace(function(o) {
        if(this.attackType === 'necro') {
            let minHit = 1;
            minHit = this.modifyMinHit(minHit);
            this.stats.minHit = minHit;
        } else {
            return o();
        }
    });
    
    patch(Character, 'computeMaxHit').replace(function(o) {
        if(this.attackType === 'necro') {
            let maxHit = this.computeNecroMaxHit();
            maxHit = this.modifyMaxHit(maxHit);
            this.stats.maxHit = maxHit;
        } else {
            return o();
        }
    });

    Character.prototype.getNecroDefenceBonus = function() {
        return this.equipmentStats.necroDefenceBonus;
    }

    patch(Character, 'modifyEvasion').after(function(ret, evasion) {
        let modifiers = this.modifiers.getValue('necromancy:necroEvasion', ModifierQuery.EMPTY);

        modifiers += this.modifiers.evasion;
        modifiers += this.modifiers.evasionBasedOnCorruptionLevel * this.abyssalLevels.Corruption;

        this.modifiers.forEachDamageType("melvorD:evasionBasedOnResistance", (value, damageType) => {
            const baseResistance = this.equipmentStats.getResistance(damageType);
            modifiers += Math.floor((baseResistance / 2) * value);
        });

        if (this.manager.fightInProgress) {
            switch (this.target.attackType) {
            case 'melee':
                modifiers += this.modifiers.evasionAgainstMelee;
                break;
            case 'ranged':
                modifiers += this.modifiers.evasionAgainstRanged;
                break;
            case 'magic':
                modifiers += this.modifiers.evasionAgainstMagic;
                break;
            case 'magic':
                modifiers += this.modifiers.getValue('necromancy:evasionAgainstNecro');
                break;
            }
            modifiers += this.modifiers.getValue("melvorD:evasionAgainstDamageType", this.target.damageType.modQuery);
        }

        if(this === game.combat.player && this.equipment.isWeapon2H)
            modifiers += this.modifiers.evasionWith2HWeapon;

        evasion.necro = applyModifier(evasion.necro, modifiers);

        if(this.modifiers.globalEvasionHPScaling > 0) {
            const modifier = (this.modifiers.globalEvasionHPScaling * this.hitpointsPercent) / 100;
            evasion.necro = Math.floor(evasion.necro * modifier);
        }
    });

    patch(Character, 'computeEvasion').after(function() {
        let effectiveDefenceLevel = this.levels.Defence;
        let effectiveNecromancyLevel = this.levels.Necromancy;
        if (this.damageType.id === "melvorItA:Abyssal" || this.damageType.id === "melvorItA:Eternal") {
            effectiveDefenceLevel += this.abyssalLevels.Defence;
            effectiveNecromancyLevel += this.abyssalLevels.Necromancy;
        }
        
        const evasion = {
            necro: Character.calculateStandardStat({
                effectiveLevel: Math.floor(effectiveDefenceLevel * 0.3 + effectiveNecromancyLevel * 0.7),
                bonus: this.getNecroDefenceBonus(),
            })
        };
        this.modifyEvasion(evasion);
        this.stats.evasion.necro = evasion.necro;
    });


    patch(Player, 'renderNormalDamage').before(function(minHit, maxHit) {
        if(this.attackType === 'necro') {
            let damageMod = game.combat.fightInProgress ? (Math.max(25, this.stats.hitChance) / 100) : 100;
            let [min, max] = [minHit, maxHit];

            if(!Number.isInteger(min))
                min = parseInt(min.slice(1, -1));
            if(!Number.isInteger(max))
                max = parseInt(max.slice(1, -1));

            min = Math.floor(min * damageMod);
            max = Math.floor(max * damageMod);

            if(!isNaN(min) && !isNaN(max)) {
                if(game.combat.fightInProgress) {
                    [minHit, maxHit] = [`(${min})`,`(${max})`];
                } else {
                    [minHit, maxHit] = [min, max];
                }
            }
        }
        return [minHit, maxHit];
    });

    patch(Enemy, 'renderNormalDamage').before(function(minHit, maxHit) {
        if(this.attackType === 'necro') {
            let damageMod = game.combat.fightInProgress ? (Math.max(25, this.stats.hitChance) / 100) : 100;
            let [min, max] = [minHit, maxHit];
            
            if(!Number.isInteger(min))
                min = parseInt(min.slice(1, -1));
            if(!Number.isInteger(max))
                max = parseInt(max.slice(1, -1));

            min = Math.floor(min * damageMod);
            max = Math.floor(max * damageMod);

            if(!isNaN(min) && !isNaN(max)) {
                if(game.combat.fightInProgress) {
                    [minHit, maxHit] = [`(${min})`,`(${max})`];
                } else {
                    [minHit, maxHit] = [min, max];
                }
            }
        }
        return [minHit, maxHit];
    });

    patch(Game, 'playerNormalCombatLevel').get(function(o) {
        const base = 0.25 * (this.defence.level + this.hitpoints.level + Math.floor(this.prayer.level / 2));
        const necromancy = 0.325 * Math.floor((3 * this.necromancy.level) / 2);
        return Math.max(o(), Math.floor(base + necromancy));
    });

    patch(Monster, 'combatLevel').get(function(o) {
        const prayer = 1;
        const base = 0.25 * (this.levels.Defence + this.levels.Hitpoints + Math.floor(prayer / 2));
        const necromancy = 0.325 * Math.floor((3 * this.levels.Necromancy) / 2);
        return Math.max(o(), Math.floor(base + necromancy));
    });

    patch(Player, 'attackStyle').get(function(o) {
        if(this.attackType === 'necro' && this.attackStyles.necro === undefined)
            this.attackStyles.necro = this.game.attackStyles.find((style)=>style.attackType === 'necro');
        return o();
    });

    patch(Player, 'renderAttackStyle').after(function() {
        const container = document.getElementById(`necro-attack-style-buttons`);
        if ('necro' === this.attackType) {
            showElement(container);
        } else {
            hideElement(container);
        }
        this.game.attackStyles.namespaceMaps.get('necromancy').forEach((style)=>{
            if (style.attackType === this.attackType) {
                const button = document.getElementById(style.buttonID);
                if (this.attackStyle === style) {
                    button.classList.add('btn-secondary');
                    button.classList.remove('btn-outline-secondary');
                } else {
                    button.classList.add('btn-outline-secondary');
                    button.classList.remove('btn-secondary');
                }
            }
        }
        );
    });

    patch(Enemy, 'computeLevels').after(function() {
        this.levels.Necromancy = this.monster !== undefined && this.monster.levels.Necromancy !== undefined ? this.monster.levels.Necromancy : 1;
    });

    patch(Player, 'computeLevels').after(function() {
        const getEffectiveLevel = (skill)=>{
            return skill.level + this.modifiers.getHiddenSkillLevels(skill);
        };
        this.levels.Necromancy = getEffectiveLevel(this.game.necromancy);
    });

    patch(Enemy, 'getAccuracyValues').replace(function(o) {
        let effectiveLevel = 0;
        let accuracyBonus = 0;
        if(this.attackType === 'necro') {
            effectiveLevel = this.levels.Necromancy;
            accuracyBonus = this.equipmentStats.necroAttackBonus;
            return {
                effectiveLevel: effectiveLevel,
                bonus: accuracyBonus,
            };
        } else {
            return o();
        }
    });

    patch(Player, 'getAccuracyValues').replace(function(o) {
        let effectiveLevel = 0;
        let accuracyBonus = 0;
        let twoHandModifier = 1;
        let modifier = 0;
        if(this.equipment.isWeapon2H)
            twoHandModifier = 2;
        if(this.attackType === 'necro') {
            effectiveLevel = this.levels.Necromancy;
            if (this.damageType.id === "melvorItA:Abyssal" || this.damageType.id === "melvorItA:Eternal")
                effectiveLevel += this.abyssalLevels.Necromancy;
            accuracyBonus = this.equipmentStats.necroAttackBonus + this.modifiers.getValue("necromancy:flatNecromancyAttackBonus", ModifierQuery.EMPTY);
            //accuracyBonus += this.modifiers.flatMeleeAccuracyBonusPerAttackInterval * Math.floor(this.stats.attackInterval / 100) * twoHandModifier;
            accuracyBonus = applyModifier(accuracyBonus, modifier);
            return {
                effectiveLevel: effectiveLevel,
                bonus: accuracyBonus,
            }
        } else {
            return o();
        }
    });

    patch(Character, 'getAccuracyModifier').replace(function(o) {
        if(this.attackType === 'necro') {
            let modifier = this.modifiers.accuracyRating;
            modifier += this.modifiers.getValue("necromancy:necromancyAccuracyRating", ModifierQuery.EMPTY);
            if(this.manager.fightInProgress)
                modifier += this.modifiers.getValue("melvorD:accuracyRatingAgainstDamageType", this.target.damageType.modQuery);
            return modifier;
        }
        return o();
    });

    let _OffensiveStatsElement_getAttackTypeMedia = OffensiveStatsElement.getAttackTypeMedia;
    OffensiveStatsElement.getAttackTypeMedia = function(attackType) {
        if(attackType === 'necro')
          return game.necromancy.media;
        return _OffensiveStatsElement_getAttackTypeMedia(attackType);
    }

    patch(MonsterSelectTableElement, 'createRow').after(function(_, monster, area) {
        let lastElement = this.tableBody.lastElementChild;
        if(monster.attackType === 'necro')
            lastElement.querySelector('td img.skill-icon-xxs.mr-1').src = game.necromancy.media;
    });

    patch(Character, 'attack').replace(function(o, target, attack) {
        if(this === game.combat.player && this.attackType === 'necro' && (attack === game.necromancy.selectedAttackSpell || attack === game.normalAttack)) {
            if(game.necromancy.castAttackSpell(game.necromancy.selectedAttackSpell)) {
                return o(target, attack);
            } else {
                this.isAttacking = false;
                return 0;
            }
        } else {
            return o(target, attack);
        }
    });

    patch(Character, 'queueNextAction').after(function(_, noSpec=false, tickOffset=false) {
        if(this === game.combat.player && this.attackType === 'necro') {
            if(game.necromancy.selectedAttackSpell !== undefined) {
                if(game.necromancy.selectedAttackSpell.specialAttacks !== undefined) {
                    this.nextAttack = game.necromancy.selectedAttackSpell.specialAttacks[0];
                }
            }
            if(game.necromancy.selectedAugurySpell !== undefined) {
                let spell = game.necromancy.selectedAugurySpell;
                let start = spell.turns - 1;
                let total = start + spell.specialAttacks.length;

                let range = Array.from({length: spell.specialAttacks.length}, (v,i) => start+i)
                
                let turnsTaken = this.turnsTaken - game.necromancy.auguryTurnOffset;
                if(range.includes(turnsTaken % total)) {
                    let attackOffset = (turnsTaken % total) - start;
                    let nextAttack = spell.specialAttacks[attackOffset];
                    if((!nextAttack.usesRunesPerProc && this.attackCount > 1) || game.necromancy.castAugurySpell(spell)) {
                        this.nextAttack = nextAttack;
                        
                        if(spell.consumesEffect !== undefined) {
                            let maxAttacks = this.nextAttack.attackCount;
                            let target = spell.consumesEffect.target === "Self" ? this : this.target;
                            const existingEffect = target.activeEffects.get(spell.consumesEffect.effect);
                            if(existingEffect !== undefined && spell.consumesEffect.type === "IncreaseAttacks") {
                                if(spell.consumesEffect.paramName !== undefined)
                                    maxAttacks += existingEffect.getParameter(spell.consumesEffect.paramName);
                                if(spell.consumesEffect.statGroupName !== undefined)
                                    maxAttacks += existingEffect.getStatGroup(spell.consumesEffect.statGroupName);
                            }
                            this.isAttacking = this.attackCount > 0 && maxAttacks > 1 && this.attackCount < maxAttacks;
                        } else {
                            this.isAttacking = this.attackCount > 0 && this.nextAttack.attackCount > 1 && this.attackCount < this.nextAttack.attackCount;
                        }

                        if(!this.game.currentGamemode.enableInstantActions)
                            this.timers.act.start(this.isAttacking ? this.nextAttack.attackInterval : this.stats.attackInterval, tickOffset);
                    }
                }
            }
        }
    });

    patch(Character, 'getAttackLifestealModifier').after(function(modifier) {
        if(this.attackType === 'necro')
            modifier += this.modifiers.getValue('necromancy:necromancyLifesteal', ModifierQuery.EMPTY);
        return modifier;
    });

    patch(RuneMenuElement, 'updateHighlights').replace(function(o, spellSelection, attackSelection, useAltRunes) {
        if(game.combat.player.attackType === 'necro') {
            this.highlighted.forEach((item)=>{
                this.removeBorder(item);
            });

            if (spellSelection.curse !== undefined)
                this.addBordersForSpell(spellSelection.curse, useAltRunes);
            if (spellSelection.aurora !== undefined)
                this.addBordersForSpell(spellSelection.aurora, useAltRunes);
            
            if(game.necromancy.selectedAttackSpell !== undefined) {
                game.necromancy.selectedAttackSpell.itemsConsumed.forEach(({item}) => {
                    this.addBorder(item);
                });
            }
            if(game.necromancy.selectedAugurySpell !== undefined) {
                game.necromancy.selectedAugurySpell.itemsConsumed.forEach(({item}) => {
                    this.addBorder(item);
                });
            }
            if(game.necromancy.selectedConjurationSpell !== undefined) {
                game.necromancy.selectedConjurationSpell.itemsConsumed.forEach(({item}) => {
                    this.addBorder(item);
                });
            }
            if(game.necromancy.selectedIncantationSpell !== undefined) {
                game.necromancy.selectedIncantationSpell.itemsConsumed.forEach(({item}) => {
                    this.addBorder(item);
                });
            }
        } else {
            o(spellSelection, attackSelection, useAltRunes);
        }
    });

    function ensureEvasion(evasion) {
        if(evasion && evasion.necroIcon === undefined && evasion.necroEvasion === undefined) {
            let magicDiv = evasion.magicEvasion.parentNode;

            evasion.necroIcon = createElement('img', {
                classList: ['skill-icon-xxs', 'mr-1'],
                attributes: [
                    ['src', game.necromancy.media]
                ]
            });

            evasion.necroEvasion = createElement('span', {
                text: '-'
            });

            magicDiv.after(
                createElement('div', {
                    children: [
                        createElement('span', {
                            children: [
                                evasion.necroIcon,
                                document.createTextNode(' '),
                                createElement('lang-string', {
                                    attributes: [
                                        ['lang-id', 'COMBAT_MISC_15']
                                    ],
                                    text: 'Evasion'
                                })
                            ]
                        }),
                        evasion.necroEvasion
                    ]
                })
            );

            evasion.addTooltip(evasion.necroIcon, 'Necromancy');
        }
    }

    function ensureLevels(combatLevels) {
        if(combatLevels && combatLevels.necroIcon === undefined && combatLevels.necroLevel === undefined) {
            let magicDiv = combatLevels.magicLevel.parentNode;

            combatLevels.necroIcon = createElement('img', {
                classList: ['skill-icon-xxs'],
                attributes: [
                    ['src', game.necromancy.media]
                ]
            });

            combatLevels.necroLevel = createElement('small', {
                text: '-'
            });

            magicDiv.after(
                createElement('div', {
                    children: [
                        createElement('span', {
                            children: [
                                combatLevels.necroIcon
                            ]
                        }),
                        combatLevels.necroLevel
                    ]
                })
            );

            combatLevels.addTooltip(combatLevels.necroIcon, templateLangString('SKILL_LEVEL', {
                skillName: 'Necromancy'
            }));
        }
    }

    patch(EvasionTableElement, 'setStats').after(function(_, character) {
        ensureEvasion(this);
        if(this.necroEvasion)
            this.necroEvasion.textContent = formatNumber(character.stats.evasion.necro);
    });

    patch(EvasionTableElement, 'setEmpty').after(function() {
        ensureEvasion(this);
        if(this.necroEvasion)
            this.necroEvasion.textContent = '-';
    });

    patch(CombatLevelsElement, 'setLevels').after(function(_, character) {
        ensureLevels(this);
        if(this.necroLevel)
            this.necroLevel.textContent = formatNumber(character.levels.Necromancy);
    });

    patch(CombatLevelsElement, 'setEmpty').after(function() {
        ensureLevels(this);
        if(this.necroLevel)
            this.necroLevel.textContent = '-';
    });

    patch(Player, 'interruptAttack').after(function() {
        if (this.manager.canInteruptAttacks) {
            game.necromancy.conjuredEntity.startConjureAttack();
        }
    });

    patch(BaseManager, 'startFight').replace(function(o, tickOffset=true) {
        game.necromancy.fightStartCheck();
        o();
        game.necromancy.conjuredEntity.startConjureAttack();
    });

    patch(BaseManager, 'onCombatPageChange').before(function() {
        game.necromancy.renderQueue.conjureBar = true;
    });

    patch(BaseManager, 'renderSpellBook').replace(function(o) {
        if(this.renderQueue.spellBook) {
            combatMenus.necromancy.updateRequirements(this.ignoreSpellRequirements);
            game.combat.player.renderQueue.runesUsed = true;
        }
        o();
    });

    patch(Player, 'changeEquipmentSet').replace(function(o, setID) {
        let oldSetID = this.selectedEquipmentSet;
        o(setID);
        if(oldSetID !== setID)
            game.necromancy.changeEquipmentSet(oldSetID, setID);
    });

    patch(Player, 'setRenderAll').after(function() {
        game.necromancy.renderQueue.conjureBar = true;
    });

    patch(Player, 'initializeForCombat').before(function() {
        game.necromancy.renderQueue.conjureBar = true;
    });

    patch(Player, 'activeTick').after(function() {
        game.necromancy.conjuredEntity.conjureTimer.tick();
    });

    patch(Player, 'stopFighting').before(function() {
        game.necromancy.conjuredEntity.conjureTimer.stop();
    });

    patch(Player, 'resetActionState').after(function() {
        game.necromancy.conjuredEntity.conjureTimer.stop();
    });

    patch(Player, 'renderDamageValues').after(function() {
        game.necromancy.renderConjureMinHit();
        game.necromancy.renderConjureMaxHit();
    });

    SplashManager.splashClasses['ConjureAttack'] = 'text-purple';

    PlayerStatsElement.prototype.setConjureMinHit = function(canAttack, minHit, isFighting) {
        if(canAttack) {
            this.conjureMinHit.textContent = isFighting ? `(${numberWithCommas(minHit)})` : numberWithCommas(minHit);
            showElement(this.conjureMinHitContainer);
        } else {
            hideElement(this.conjureMinHitContainer);
        }
    }
    PlayerStatsElement.prototype.setConjureMaxHit = function(canAttack, maxHit, isFighting) {
        if(canAttack) {
            this.conjureMaxHit.textContent = isFighting ? `(${numberWithCommas(maxHit)})` : numberWithCommas(maxHit);
            showElement(this.conjureMaxHitContainer);
        } else {
            hideElement(this.conjureMaxHitContainer);
        }
    }

    class PlayerConjureAttackHitEventMatcher extends CharacterGameEventMatcher {
        constructor(options, game) {
            super(game);
            this.type = 'PlayerConjureAttackHit';
        }
        doesEventMatch(event) {
            return true;
        }
        _assignCharacterHandler(handler, combat) {
            combat.player.on('conjureAttackHit', handler);
        }
        _unassignCharacterHandler(handler, combat) {
            combat.player.off('conjureAttackHit', handler);
        }
    }

    patch(GameEventSystem, 'constructMatcher').after(function(_, data) {
        if(data.type === 'PlayerConjureAttackHit')
            return new PlayerConjureAttackHitEventMatcher(data,this.game);
    });

    patch(EquipmentSetMenu, 'getTooltipContent').after(function(mainHTML, set) {
        let setID = game.combat.player.equipmentSets.indexOf(set);
        let customHTML = `<span class="text-info">Necromancy</span><br>`;
        let savedAttack = game.necromancy.savedAttackSpells.get(setID);
        let savedAugury = game.necromancy.savedAugurySpells.get(setID);
        let savedConjuration = game.necromancy.savedConjurationSpells.get(setID);
        let savedIncantation = game.necromancy.savedIncantationSpells.get(setID);

        if (savedAttack === undefined)
            savedAttack = game.necromancy.spells.firstObject;
        customHTML += this.getTooltipRow(savedAttack.media, savedAttack.name);

        if (savedAugury !== undefined)
            customHTML += this.getTooltipRow(savedAugury.media, savedAugury.name);
        if (savedConjuration !== undefined)
            customHTML += this.getTooltipRow(savedConjuration.media, savedConjuration.name);
        if (savedIncantation !== undefined)
            customHTML += this.getTooltipRow(savedIncantation.media, savedIncantation.name);
        

        if(customHTML !== '') {
            mainHTML = mainHTML.replace(/(<div class="text-center">.*)(<\/div>)/s, `$1${customHTML}$2`);
        }
        return mainHTML;
    });

    patch(ItemUpgradeMenuElement, 'setEquipmentStats').before(function() {
        if(this.equipStats.necroAttackBonus === undefined &&
            this.equipStats.necroStrengthBonus === undefined &&
            this.equipStats.necroDefenceBonus === undefined &&
            this.equipStatDiffs.necroAttackBonus === undefined &&
            this.equipStatDiffs.necroStrengthBonus === undefined &&
            this.equipStatDiffs.necroDefenceBonus === undefined
        ) {
            let offenceContainer = this.equipStats.magicAttackBonus.parentNode.parentNode.parentNode;
            let defenceContainer = this.equipStats.magicDefenceBonus.parentNode.parentNode;

            
            this.equipStats.necroAttackBonus = createElement('span', {
                classList: ['font-w600']
            });
            this.equipStatDiffs.necroAttackBonus = createElement('span', {
                classList: ['text-success']
            });
            this.equipStats.necroStrengthBonus = createElement('span', {
                classList: ['font-w600']
            });
            this.equipStatDiffs.necroStrengthBonus = createElement('span', {
                classList: ['text-success']
            });
            this.equipStats.necroDefenceBonus = createElement('span', {
                classList: ['font-w600']
            });
            this.equipStatDiffs.necroDefenceBonus = createElement('span', {
                classList: ['text-success']
            });

            offenceContainer.append(
                createElement('div', {
                    classList: ['row', 'font-w400', 'font-size-sm', 'text-combat-smoke', 'p-2', 'pb-0', 'justify-horizontal-center'],
                    children: [
                        createElement('div', {
                            classList: ['col-8'],
                            children: [
                                createElement('img', {
                                    classList: ['skill-icon-xxs'],
                                    attributes: [
                                        ['src', game.necromancy.media]
                                    ]
                                }),
                                document.createTextNode(' '),
                                createElement('lang-string', {
                                    attributes: [
                                        ['lang-id', 'EQUIPMENT_STAT_ATTACK_BONUS']
                                    ],
                                    text: 'Attack Bonus:'
                                })
                            ]
                        }),
                        createElement('div', {
                            classList: ['col-4'],
                            children: [
                                this.equipStats.necroAttackBonus,
                                document.createTextNode(' '),
                                this.equipStatDiffs.necroAttackBonus
                            ]
                        }),
                        createElement('div', {
                            classList: ['col-8'],
                            children: [
                                createElement('img', {
                                    classList: ['skill-icon-xxs'],
                                    attributes: [
                                        ['src', game.necromancy.media]
                                    ]
                                }),
                                document.createTextNode(' '),
                                createElement('lang-string', {
                                    attributes: [
                                        ['lang-id', 'EQUIPMENT_STAT_STRENGTH_BONUS']
                                    ],
                                    text: 'Strength Bonus:'
                                })
                            ]
                        }),
                        createElement('div', {
                            classList: ['col-4'],
                            children: [
                                this.equipStats.necroStrengthBonus,
                                document.createTextNode(' '),
                                this.equipStatDiffs.necroStrengthBonus
                            ]
                        })
                    ]
                })
            );

            defenceContainer.append(
                createElement('div', {
                    classList: ['col-8'],
                    children: [
                        createElement('img', {
                            classList: ['skill-icon-xxs'],
                            attributes: [
                                ['src', game.necromancy.media]
                            ]
                        }),
                        document.createTextNode(' '),
                        createElement('lang-string', {
                            attributes: [
                                ['lang-id', 'EQUIPMENT_STAT_DEFENCE_BONUS']
                            ],
                            text: 'Defence Bonus:'
                        })
                    ]
                }),
                createElement('div', {
                    classList: ['col-4'],
                    children: [
                        this.equipStats.necroDefenceBonus,
                        document.createTextNode(' '),
                        this.equipStatDiffs.necroDefenceBonus
                    ]
                }),
            )
        }
    })


    Character.numberExprTranspiler.config.references.children.get('self').children.get('modifier').addProperties([
        'necromancyNecrosisStacks',
        'necromancyResidualSoulStacks',
        'necromancySanityStacks',
        'necromancyResidualSoulStackIncrease',
        'necromancyExtraResidualSoulStack'
    ], ExprPrimaryType.Number)

    patch(CharacterModifierTable, 'init').after(function(_, game) {
        if(game.modifierRegistry.namespaceMaps.get(namespace) !== undefined) {
            game.modifierRegistry.namespaceMaps.get(namespace).forEach((modifier) => {
                if(!modifier.hasEmptyScope || !modifier.allowEnemy)
                    return;
                const id = modifier.id;
                Object.defineProperty(this, modifier.localID, {
                    get: () => {
                        return this.getValue(id, ModifierQuery.EMPTY);
                    }
                });
            });
        }
    });

    console.log("Registering Necromancy Data");
    await gameData.addPackage('data/data.json'); // Add skill data (page + sidebar, skillData)
    
    if(cloudManager.hasAoDEntitlementAndIsEnabled)
        await gameData.addPackage('data/data-aod.json');

    console.log('Registered Necromancy Data.');

    onModsLoaded(async () => {
        await game.necromancy.onModsLoaded();

        if(cloudManager.hasAoDEntitlementAndIsEnabled) {
            const levelCapIncreases = ['necromancy:Pre99Dungeons', 'necromancy:ImpendingDarknessSet100'];

            if(cloudManager.hasTotHEntitlementAndIsEnabled) {
                levelCapIncreases.push(...['necromancy:Post99Dungeons', 'necromancy:ThroneOfTheHeraldSet120']);
            }

            const gamemodes = game.gamemodes.filter(gamemode => gamemode.defaultInitialLevelCap !== undefined && gamemode.levelCapIncreases.length > 0 && gamemode.useDefaultSkillUnlockRequirements === true && gamemode.allowSkillUnlock === false);

            await gameData.addPackage({
                $schema: '',
                namespace: 'necromancy',
                modifications: {
                    gamemodes: gamemodes.map(gamemode => ({
                        id: gamemode.id,
                        levelCapIncreases: {
                            add: levelCapIncreases
                        },
                        startingSkills: {
                            add: ['necromancy:Necromancy']
                        },
                        skillUnlockRequirements: [
                            {
                                skillID: 'necromancy:Necromancy',
                                requirements: [
                                    {
                                        type: 'SkillLevel',
                                        skillID: 'melvorD:Attack',
                                        level: 1
                                    }
                                ]
                            }
                        ]
                    }))
                }
            });
        }
    
        patch(EventManager, 'loadEvents').after(() => {
            if(game.currentGamemode.startingSkills !== undefined && game.currentGamemode.startingSkills.has(game.necromancy)) {
                game.necromancy.setUnlock(true);
            }
        });

        game.monsters.forEach(monster => {
            if(monster.attackType === "melee") {
                monster.levels.Necromancy = monster.levels.Attack;
            }
            if(monster.attackType === "ranged") {
                monster.levels.Necromancy = monster.levels.Ranged;
            }
            if(monster.attackType === "magic") {
                monster.levels.Necromancy = monster.levels.Magic;
            }
        });
    });

    onInterfaceAvailable(async () => { 
        await game.necromancy.onInterfaceAvailable();

        let itemViewCurrentOffence = document.getElementById('item-view-current-magicDamageBonus').parentNode;
        itemViewCurrentOffence.after(
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('img', {
                        classList: ['skill-icon-xxs'],
                        attributes: [
                            ['src', game.necromancy.media]
                        ]
                    }),
                    document.createTextNode(' '),
                    createElement('lang-string', {
                        attributes: [
                            ['lang-id', 'EQUIPMENT_STAT_ATTACK_BONUS']
                        ],
                        text: 'Attack Bonus:'
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('span', {
                        id: 'item-view-current-necroAttackBonus'
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('img', {
                        classList: ['skill-icon-xxs'],
                        attributes: [
                            ['src', game.necromancy.media]
                        ]
                    }),
                    document.createTextNode(' '),
                    createElement('lang-string', {
                        attributes: [
                            ['lang-id', 'EQUIPMENT_STAT_STRENGTH_BONUS']
                        ],
                        text: 'Strength Bonus:'
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('span', {
                        id: 'item-view-current-necroStrengthBonus'
                    })
                ]
            })
        )

        let itemViewCurrentDefence = document.getElementById('item-view-current-magicDefenceBonus').parentNode;
        itemViewCurrentDefence.after(
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('img', {
                        classList: ['skill-icon-xxs'],
                        attributes: [
                            ['src', game.necromancy.media]
                        ]
                    }),
                    document.createTextNode(' '),
                    createElement('lang-string', {
                        attributes: [
                            ['lang-id', 'EQUIPMENT_STAT_DEFENCE_BONUS']
                        ],
                        text: 'Defence Bonus:'
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('span', {
                        id: 'item-view-current-necroDefenceBonus'
                    })
                ]
            })
        )
        let itemViewDifOffence = document.getElementById('item-view-dif-magicDamageBonus').parentNode;
        itemViewDifOffence.after(
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('img', {
                        classList: ['skill-icon-xxs'],
                        attributes: [
                            ['src', game.necromancy.media]
                        ]
                    }),
                    document.createTextNode(' '),
                    createElement('lang-string', {
                        attributes: [
                            ['lang-id', 'EQUIPMENT_STAT_ATTACK_BONUS']
                        ],
                        text: 'Attack Bonus:'
                    }),
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('span', {
                        id: 'item-view-necroAttackBonus'
                    }),
                    document.createTextNode(' '),
                    createElement('span', {
                        id: 'item-view-dif-necroAttackBonus'
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('img', {
                        classList: ['skill-icon-xxs'],
                        attributes: [
                            ['src', game.necromancy.media]
                        ]
                    }),
                    document.createTextNode(' '),
                    createElement('lang-string', {
                        attributes: [
                            ['lang-id', 'EQUIPMENT_STAT_STRENGTH_BONUS']
                        ],
                        text: 'Strength Bonus:'
                    }),
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('span', {
                        id: 'item-view-necroStrengthBonus'
                    }),
                    document.createTextNode(' '),
                    createElement('span', {
                        id: 'item-view-dif-necroStrengthBonus'
                    }),
                ]
            })
        )

        let itemViewDifDefence = document.getElementById('item-view-dif-magicDefenceBonus').parentNode;
        itemViewDifDefence.after(
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('img', {
                        classList: ['skill-icon-xxs'],
                        attributes: [
                            ['src', game.necromancy.media]
                        ]
                    }),
                    document.createTextNode(' '),
                    createElement('lang-string', {
                        attributes: [
                            ['lang-id', 'EQUIPMENT_STAT_DEFENCE_BONUS']
                        ],
                        text: 'Defence Bonus:'
                    }),
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('span', {
                        id: 'item-view-necroDefenceBonus'
                    }),
                    document.createTextNode(' '),
                    createElement('span', {
                        id: 'item-view-dif-necroDefenceBonus'
                    }),
                ]
            })
        )

        document.getElementById('magic-attack-style-buttons').after(createElement('div', {
            id: `necro-attack-style-buttons`,
            classList: ['row', 'gutters-tiny']
        }));
    });
}