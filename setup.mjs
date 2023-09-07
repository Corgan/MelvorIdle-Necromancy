export async function setup({ characterStorage, gameData, patch, loadTemplates, loadModule, onInterfaceAvailable, onCharacterLoaded }) {
    for(let id in combatTriangle) {
        combatTriangle[id].damageModifier.melee.necro = 1;
        combatTriangle[id].damageModifier.ranged.necro = 1;
        combatTriangle[id].damageModifier.magic.necro = 1;
        combatTriangle[id].damageModifier.necro = { melee: 1, ranged: 1, magic: 1, necro: 1 };

        combatTriangle[id].reductionModifier.melee.necro = 1;
        combatTriangle[id].reductionModifier.ranged.necro = 1;
        combatTriangle[id].reductionModifier.magic.necro = 1;
        combatTriangle[id].reductionModifier.necro = { melee: 1, ranged: 1, magic: 1, necro: 1 };
    };
    
    equipStatKeys.push('necroAttackBonus', 'necroStrengthBonus', 'necroDefenceBonus');
    loadedLangJson['EQUIPMENT_STAT_necroAttackBonus'] = '${statValue} Necromancy Attack Bonus';
    loadedLangJson['EQUIPMENT_STAT_necroStrengthBonus'] = '${statValue} Necromancy Strength Bonus';
    loadedLangJson['EQUIPMENT_STAT_necroDefenceBonus'] = '${statValue} Necromancy Defence Bonus';

    modifierData['increasedFlatNecromancyAttackBonus'] = {
        get langDescription() {
            return getLangString('MODIFIER_DATA_increasedFlatNecromancyAttackBonus');
        },
        description: '+${value} Necromancy Attack Bonus',
        isSkill: false,
        isNegative: false,
        tags: ['combat'],
    }
    modifierData['increasedNecromancyStrengthBonus'] = {
        get langDescription() {
            return getLangString('MODIFIER_DATA_increasedNecromancyStrengthBonus');
        },
        description: '+${value}% Necromancy Strength Bonus from Equipment',
        isSkill: false,
        isNegative: false,
        tags: ['combat'],
    }

    console.log("Loading Necromancy Templates");
    await loadTemplates("templates.html"); // Add templates
  
    console.log("Loading Necromancy Module");
    const { Necromancy } = await loadModule('src/necromancy.mjs');

    game.necromancy = game.registerSkill(game.registeredNamespaces.getNamespace('necromancy'), Necromancy); // Register skill

    game.pages.getObjectByID('melvorD:Combat').skills.push(game.necromancy);

    rollData['MaxHitModAccuracy'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} max hit`,
    }

    rollData['MinHitModAccuracy'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} min hit`,
    }

    const _getDamageRoll = getDamageRoll;
    getDamageRoll = function(character, type, percent, damageDealt=0) {
        let value = 0;
        if(type === 'MaxHitModAccuracy' || type === 'MinHitModAccuracy') {
            let damageMod = 1;
            if(character.manager.fightInProgress) {
                const targetEvasion = character.target.stats.evasion[character.attackType];
                const accuracy = character.stats.accuracy;
                if (accuracy < targetEvasion) {
                    damageMod = ((0.5 * accuracy) / targetEvasion);
                } else {
                    damageMod = (1 - (0.5 * targetEvasion) / accuracy);
                }
            }

            if(type === 'MaxHitModAccuracy') {
                value = Math.floor(character.stats.maxHit * damageMod);
            } else if (type === 'MinHitModAccuracy') {
                value = Math.floor(character.stats.minHit * damageMod);
            }
        } else {
            return _getDamageRoll(character, type, percent, damageDealt);
        }
        return Math.floor((value * percent) / 100);
    }

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

    patch(CombatModifiers, 'getProtectionValue').replace(function(o, type) {
        if(type === 'necro') {
            return 0;
        } else {
            return o(type);
        }
    });

    patch(CombatModifiers, 'getCritChance').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = 0;
            //totalBonus += this.increasedNecroMaxHit;
            //totalBonus -= this.decreasedNecroMaxHit;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    patch(CombatModifiers, 'getMaxHitModifier').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.increasedMaxHitPercent - this.decreasedMaxHitPercent;
            //totalBonus += this.increasedNecroMaxHit;
            //totalBonus -= this.decreasedNecroMaxHit;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    patch(CombatModifiers, 'getMaxHitFlatModifier').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.increasedMaxHitFlat - this.decreasedMaxHitFlat;
            //totalBonus += this.increasedNecroMaxHitFlat;
            //totalBonus -= this.decreasedNecroMaxHitFlat;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    patch(CombatModifiers, 'getAccuracyModifier').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.increasedGlobalAccuracy - this.decreasedGlobalAccuracy;
            //totalBonus += this.increasedNecromancyAccuracyBonus;
            //totalBonus -= this.decreasedNecromancyAccuracyBonus;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    patch(CombatModifiers, 'getEvasionModifier').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.increasedGlobalEvasion - this.decreasedGlobalEvasion;
            //totalBonus += this.increasedNecromancyEvasion;
            //totalBonus -= this.decreasedNecromancyEvasion;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    patch(CombatModifiers, 'getLifesteal').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.increasedLifesteal - this.decreasedLifesteal;
            if (this.increasedLifestealBasedOnHPRegenEffectiveness > 0) {
                totalBonus += (this.increasedLifestealBasedOnHPRegenEffectiveness / 100) * (this.increasedHitpointRegeneration - this.decreasedHitpointRegeneration);
            }
            //totalBonus += this.increasedNecromancyEvasion;
            //totalBonus -= this.decreasedNecromancyEvasion;
            return totalBonus;
        } else {
            return o(type);
        }
    });

    //patch(Character, 'computeHitchance').after(function() {
    //    if(this.attackType === 'necro') {
    //        const protection = this.target.modifiers.getProtectionValue(this.attackType);
    //        this.hitchance = protection !== 0 ? 100 - protection : 100;
    //    }
    //});

    Character.prototype.computeNecroMaxHit = function() {
        let necroBonus = this.equipmentStats.necroStrengthBonus// + this.modifiers.increasedFlatNecroStrengthBonus;
        //const modifier = this.modifiers.necroStrengthBonusModifier;
        //necroBonus = applyModifier(necroBonus, modifier);

        return Character.calculateStandardMaxHit(this.levels.Necromancy, necroBonus);
    }

    patch(Character, 'rollToHit').replace(function(o, target, attack) {
        if(attack.cantMiss && attack.minAccuracy > 0 && attack.minAccuracy <= 1) {
            return this.hitchance >= (attack.minAccuracy * 100);
        } else {
            return o(target, attack);
        }
    });
    
    patch(Character, 'computeMinHit').replace(function(o) {
        if(this.attackType === 'necro') {
            let minHit = this.computeNecroMaxHit();
            minHit = Math.floor(this.modifyMinHit(minHit) * 0.9);
            this.stats.minHit = minHit;
        } else {
            return o();
        }
    });
    
    patch(Character, 'computeMaxHit').replace(function(o) {
        if(this.attackType === 'necro') {
            let maxHit = this.computeNecroMaxHit();
            maxHit = Math.ceil(this.modifyMaxHit(maxHit) * 1.1);
            this.stats.maxHit = maxHit;
        } else {
            return o();
        }
    });

    Character.prototype.getNecroDefenceBonus = function() {
        return this.equipmentStats.necroDefenceBonus;
    }

    patch(Character, 'modifyEvasion').after(function(ret, evasion) {
        let evasionNecroModifier = this.modifiers.getEvasionModifier('necro');
        if (this.modifiers.decreasedEvasionBasedOnDR > 0) {
            const baseDR = this.equipmentStats.damageReduction;
            evasionNecroModifier -= Math.floor((baseDR / 2) * this.modifiers.decreasedEvasionBasedOnDR);
        }
        if (this.manager.fightInProgress) {
            let globalBonus = 0;
            if(this.target.attackType === 'necro') {
                //globalBonus += this.modifiers.increasedEvasionAgainstNecro;
            }
            evasionNecroModifier += globalBonus;
        }
        evasion.necro = applyModifier(evasion.necro, evasionNecroModifier);
        if (this.modifiers.globalEvasionHPScaling > 0) {
            const modifier = (this.modifiers.globalEvasionHPScaling * this.hitpointsPercent) / 100;
            evasion.necro = Math.floor(evasion.necro * modifier);
        }
    });

    patch(Character, 'computeEvasion').after(function() {
        const evasion = {
            necro: Character.calculateStandardStat({
                effectiveLevel: this.levels.Necromancy,
                bonus: this.getNecroDefenceBonus(),
            }),
        };
        this.modifyEvasion(evasion);
        this.stats.evasion.necro = evasion.necro;
    });

    patch(Character, 'renderStats').after(function() {
        if(this.statElements.evasion.necro !== undefined)
            this.statElements.evasion.necro.forEach((elem)=>(elem.textContent = formatNumber(this.stats.evasion.necro)));
    });

    patch(Enemy, 'renderNoStats').after(function() {
        if(this.statElements.evasion.necro !== undefined) {
            this.statElements.evasion.necro.forEach((elem)=>(elem.textContent = '-'));
        }
    });

    patch(Enemy, 'computeLevels').after(function() {
        this.levels.Necromancy = this.monster !== undefined && this.monster.levels.Necromancy !== undefined ? this.monster.levels.Necromancy : 1;
    });

    patch(Player, 'attackStyle').get(function(o) {
        if(this.attackType === 'necro') {
            return this.game.attackStyles.find((style)=>style.attackType === 'necro');
        } else {
            return o();
        }
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

    patch(Player, 'computeLevels').after(function() {
        const getEffectiveLevel = (skill)=>{
            return skill.level + this.modifiers.getHiddenSkillLevels(skill);
        };
        this.levels.Necromancy = getEffectiveLevel(this.game.necromancy);
    });

    patch(Player, 'getAccuracyValues').replace(function(o) {
        let effectiveLevel = 0;
        let accuracyBonus = 0;
        if(this.attackType === 'necro') {
            effectiveLevel = this.levels.Necromancy;
            accuracyBonus = this.equipmentStats.necroAttackBonus// + this.modifiers.increasedFlatNecroAttackBonus;
            //accuracyBonus += (this.modifiers.increasedFlatRangedAccuracyBonusPerAttackInterval - this.modifiers.decreasedFlatRangedAccuracyBonusPerAttackInterval) * Math.floor(this.stats.attackInterval / 100) * twoHandModifier;
            return {
                effectiveLevel: effectiveLevel,
                bonus: accuracyBonus,
            }
        } else {
            return o();
        }
    });

    patch(Game, 'onLoad').before(function() {
        enemyHTMLElements.levels.Necromancy = [document.getElementById('combat-enemy-necromancy-level')];
        enemyHTMLElements.evasion.necro = [document.getElementById('combat-enemy-necro-evasion')];
        
        playerHTMLElements.evasion.necro = [document.getElementById('combat-player-defence-bonus-necro')];
    });


    console.log("Registering Necromancy Data");
    await gameData.addPackage('data.json'); // Add skill data (page + sidebar, skillData)

    console.log('Registered Necromancy Data.');

    onInterfaceAvailable(() => {
        let itemViewCurrentOffence = document.getElementById('item-view-current-magicDamageBonus').nextSibling;
        itemViewCurrentOffence.after(
            createElement('br'),
            createElement('img', {
                classList: ['skill-icon-xs'],
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
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-current-necroAttackBonus'
            }),
            createElement('br'),
            createElement('img', {
                classList: ['skill-icon-xs'],
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
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-current-necroStrengthBonus'
            }),
        )

        let itemViewCurrentDefence = document.getElementById('item-view-current-magicDefenceBonus');
        itemViewCurrentDefence.after(
            createElement('br'),
            createElement('img', {
                classList: ['skill-icon-xs'],
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
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-current-necroDefenceBonus'
            }),
        )
        let itemViewDifOffence = document.getElementById('item-view-dif-magicDamageBonus').nextSibling;
        itemViewDifOffence.after(
            createElement('br'),
            createElement('img', {
                classList: ['skill-icon-xs'],
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
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-necroAttackBonus'
            }),
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-dif-necroAttackBonus'
            }),
            createElement('br'),
            createElement('img', {
                classList: ['skill-icon-xs'],
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
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-necroStrengthBonus'
            }),
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-dif-necroStrengthBonus'
            }),
        )

        let itemViewDifDefence = document.getElementById('item-view-dif-magicDefenceBonus').nextSibling;
        itemViewDifDefence.after(
            createElement('br'),
            createElement('img', {
                classList: ['skill-icon-xs'],
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
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-necroDefenceBonus'
            }),
            document.createTextNode(' '),
            createElement('span', {
                id: 'item-view-dif-necroDefenceBonus'
            }),
        )

        document.getElementById('combat-player-defence-bonus-magic').nextElementSibling.remove();
        document.getElementById('combat-player-defence-bonus-magic').parentElement.after(
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('h5', {
                        classList: ['font-w400', 'font-size-sm', 'text-combat-smoke', 'm-1'],
                        children: [
                            createElement('img', {
                                classList: ['skill-icon-xxs', 'm-0', 'mr-2', 'necro-icon'],
                                attributes: [
                                    ['src', game.necromancy.media]
                                ]
                            }),
                            document.createTextNode(' '),
                            createElement('lang-string', {
                                attributes: [
                                    ['lang-id', 'COMBAT_MISC_15']
                                ],
                                text: 'Evasion'
                            }),
                        ]
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('h5', {
                        id: 'combat-player-defence-bonus-necro',
                        classList: ['font-w600', 'font-size-sm', 'text-combat-smoke', 'text-right',  'm-1'],
                    }),
                    createElement('br')
                ]
            }),
        )
        document.getElementById('combat-enemy-magic-evasion').parentElement.parentElement.after(
            createElement('div', {
                classList: ['col-8'],
                children: [
                    createElement('h5', {
                        classList: ['font-w400', 'font-size-sm', 'text-combat-smoke', 'm-1'],
                        children: [
                            createElement('img', {
                                classList: ['skill-icon-xxs', 'mr-2', 'necro-icon'],
                                attributes: [
                                    ['src', game.necromancy.media]
                                ]
                            }),
                            document.createTextNode(' '),
                            createElement('lang-string', {
                                attributes: [
                                    ['lang-id', 'COMBAT_MISC_15']
                                ],
                                text: 'Evasion'
                            }),
                        ]
                    })
                ]
            }),
            createElement('div', {
                classList: ['col-4'],
                children: [
                    createElement('h5', {
                        classList: ['font-w600', 'font-size-sm', 'text-combat-smoke', 'text-right', 'm-1'],
                        children: [
                            createElement('span', {
                                id: 'combat-enemy-necro-evasion',
                                text: '-'
                            })
                        ]
                    }),
                    createElement('br')
                ]
            }),
        )

        document.getElementById('combat-enemy-magic-level').parentElement
        .parentElement.parentElement.after(createElement('div', {
            classList: ['col-12', 'p-0'],
            children: [
                createElement('div', {
                    classList: ['media', 'd-flex', 'align-items-center', 'mb-3'],
                    children: [
                        createElement('div', {
                            classList: ['mr-1'],
                            children: [
                                createElement('img', {
                                    classList: ['skill-icon-xs'],
                                    attributes: [
                                        ['src', game.necromancy.media]
                                    ]
                                })
                            ]
                        }),
                        createElement('div', {
                            classList: ['mr-1'],
                            children: [
                                createElement('small', {
                                    id: 'combat-enemy-necromancy-level',
                                    text: '-'
                                })
                            ]
                        })
                    ]
                })
            ]
        }));
        document.getElementById('magic-attack-style-buttons').after(createElement('div', {
            id: `necro-attack-style-buttons`,
            classList: ['row', 'gutters-tiny']
        }));
        document.getElementById('combat-skill-progress-menu').firstElementChild.append(createElement('tbody', {
            children: [
                createElement('tr', {
                    children: [
                        createElement('th', {
                            classList: ['text-center'],
                            attributes: [
                                ['scope', 'row']
                            ],
                            children: [createElement('img', {
                                classList: ['skill-icon-xs'],
                                attributes: [
                                    ['src', game.necromancy.media]
                                ]
                            })]
                        }),
                        createElement('td', {
                            classList: ['font-w600', 'font-size-sm'],
                            children: [createElement('small', {
                                id: `skill-progress-level-${game.necromancy.id}`,
                                text: '69 / 99'
                            })]
                        }),
                        createElement('td', {
                            classList: ['font-w600', 'font-size-sm'],
                            children: [createElement('small', {
                                id: `skill-progress-percent-${game.necromancy.id}`,
                                text: '69%'
                            })]
                        }),
                        createElement('td', {
                            classList: ['font-w600', 'font-size-sm', 'd-none', 'd-md-table-cell'],
                            children: [createElement('small', {
                                id: `skill-progress-xp-${game.necromancy.id}`,
                                text: '690 / 6,900 XP'
                            })]
                        }),
                        createElement('td', {
                            children: [
                                createElement('div', {
                                    id: `skill-progress-xp-tooltip-${game.necromancy.id}`,
                                    classList: ['progress', 'active'],
                                    attributes: [
                                        ['style', 'height: 8px']
                                    ],
                                    children: [createElement('div', {
                                        id: `skill-progress-bar-${game.necromancy.id}`,
                                        attributes: [
                                            ['role', 'progressbar'],
                                            ['style', 'width: 69%;'],
                                            ['aria-valuenow', '0'],
                                            ['aria-valuemin', '0'],
                                            ['aria-valuemax', '100']
                                        ],
                                        classList: ['progress-bar', 'bg-info'],
                                    })]
                                }),
                            ]
                        }),
                    ]
                })
            ]
        }))
    });
}