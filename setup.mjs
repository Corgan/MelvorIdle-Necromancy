export async function setup({ name, characterStorage, gameData, patch, loadTemplates, loadModule, onModsLoaded, onCharacterSelectionLoaded, onInterfaceAvailable, onCharacterLoaded, onInterfaceReady }) {
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

    console.log("Loading Necromancy Templates");
    await loadTemplates("templates.html"); // Add templates
  
    console.log("Loading Necromancy Module");
    const { Necromancy } = await loadModule('src/necromancy.mjs');

    game.necromancy = game.registerSkill(game.registeredNamespaces.getNamespace('necromancy'), Necromancy); // Register skill

    let skills = game.pages.getObjectByID('melvorD:Combat').skills;
    skills.splice(skills.indexOf(game.altMagic)+1, 0, game.necromancy);
    
    rollData['MaxHitModAccuracy'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} max hit`,
    }

    rollData['MinHitModAccuracy'] = {
        formatPercent: (value)=>`\${${value}}%`,
        formatName: (name)=>` of ${name} min hit`,
    }

    const _getDamageRoll = getDamageRoll;
    getDamageRoll = function(character, type, percent, damageDealt=0, damageTaken=0) {
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

    patch(CharacterModifierTable, 'getCritChance').replace(function(o, type) {
        if(type === 'necro') {
            let totalBonus = this.critChance;
            //totalBonus += this.increasedNecroMaxHit;
            //totalBonus -= this.decreasedNecroMaxHit;
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
        let necroBonus = this.equipmentStats.necroStrengthBonus// + this.modifiers.increasedFlatNecroStrengthBonus;
        //const modifier = this.modifiers.necroStrengthBonusModifier;
        //necroBonus = applyModifier(necroBonus, modifier);

        return Character.calculateStandardMaxHit(this.levels.Necromancy, necroBonus);
    }

    patch(Character, 'rollToHit').replace(function(o, target, attack) {
        if(this.attackType === 'necro' && attack.cantMiss && attack.minAccuracy > 0 && attack.minAccuracy <= 1) {
            return this.stats.accuracy >= (attack.minAccuracy * 100);
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
        let evasionNecroModifier = 0;//this.modifiers.getValue('necromancy:necroEvasion');
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
        //if(this.statElements.evasion.necro !== undefined)
            //this.statElements.evasion.necro.forEach((elem)=>(elem.textContent = formatNumber(this.stats.evasion.necro)));
    });

    patch(Enemy, 'renderNoStats').after(function() {
        //if(this.statElements.evasion.necro !== undefined)
            //this.statElements.evasion.necro.forEach((elem)=>(elem.textContent = '-'));
    });

    patch(Enemy, 'computeLevels').after(function() {
        this.levels.Necromancy = this.monster !== undefined && this.monster.levels.Necromancy !== undefined ? this.monster.levels.Necromancy : 1;
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
        //if(!COMBAT_LEVEL_KEYS.includes('Necromancy'))
        //    COMBAT_LEVEL_KEYS.push('Necromancy');
        //enemyHTMLElements.levels.Necromancy = [document.getElementById('combat-enemy-necromancy-level')];
        //enemyHTMLElements.levelContainers.Necromancy = [];
        //enemyHTMLElements.evasion.necro = [document.getElementById('combat-enemy-necro-evasion')];
        
        //playerHTMLElements.evasion.necro = [document.getElementById('combat-player-defence-bonus-necro')];
    });


    console.log("Registering Necromancy Data");
    await gameData.addPackage('data/data.json'); // Add skill data (page + sidebar, skillData)
    
    if(cloudManager.hasAoDEntitlementAndIsEnabled)
        await gameData.addPackage('data/data-aod.json');

    console.log('Registered Necromancy Data.');

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

    onModsLoaded(async () => {
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

    onInterfaceAvailable(() => { 
        game.necromancy.component.mount(document.getElementById('main-container')); // Add skill container

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