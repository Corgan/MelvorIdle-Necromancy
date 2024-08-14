const { loadModule } = mod.getContext(import.meta);

const { NecromancySpellButtonElement } = await loadModule('src/components/necromancy-spell-button.mjs');

export class NecromancyIncantationSpellMenuElement extends HTMLElement {
    constructor() {
        super();
        this.requirements = [];
        this.spells = [];
        this.spellMap = new Map();
        this._content = new DocumentFragment();
        this._content.append(getTemplateNode('necromancy-incantation-spell-menu-template'));
        this.spellContainer = getElementFromFragment(this._content, 'spell-container', 'div');
        this.bookName = getElementFromFragment(this._content, 'book-name', 'span');
    }
    connectedCallback() {
        this.appendChild(this._content);
    }
    init() {
        this.setSpells(game.necromancy.incantations.allObjects.sort((a,b)=>a.level - b.level));
    }
    getToggleCallback(spell) {
        return ()=>game.necromancy.selectIncantationSpell(spell);
    }
    setSpellButton(spell, spellElem) {
        spellElem.setIncantationSpell(spell);
    }
    updateForUnlock(ignoreReqs) {
        this.spellMap.forEach((spellElem,spell)=>{
            const isUnlocked = game.necromancy.canUseCombatSpell(spell, ignoreReqs);
            if (isUnlocked) {
                this.setSpellButton(spell, spellElem);
                spellElem.setCallback(this.getToggleCallback(spell,));
            } else {
                spellElem.setLockedSpell(spell, ignoreReqs);
                spellElem.removeCallback();
            }
        });
    }
    setMenuCallbacks() {
        this.spellMap.forEach((spellElem,spell)=>{
            spellElem.setCallback(this.getToggleCallback(spell));
        });
    }
    setSpells(spells) {
        while(this.spells.length < spells.length) {
            const spellElem = createElement('necromancy-spell-button', {
                className: 'col-4 col-md-3'
            });
            this.spellContainer.append(spellElem);
            this.spells.push(spellElem);
        }
        this.spellMap.clear();
        spells.forEach((spell,i)=>{
            const spellElem = this.spells[i];
            this.setSpellButton(spell, spellElem);
            this.spellMap.set(spell, spellElem);
            showElement(spellElem);
        });
        for (let i = spells.length; i < this.spells.length; i++) {
            hideElement(this.spells[i]);
        }
    }
    highlightSpell(spell) {
        if (this.highlightedSpell !== undefined)
            this.highlightedSpell.unhighlight();
        if (spell === undefined) {
            this.highlightedSpell = undefined;
        } else {
            const spellElem = this.spellMap.get(spell);
            if (spellElem !== undefined)
                spellElem.highlight();
            this.highlightedSpell = spellElem;
        }
    }
}
window.customElements.define('necromancy-incantation-spell-menu', NecromancyIncantationSpellMenuElement);