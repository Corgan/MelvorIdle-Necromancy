const { loadModule } = mod.getContext(import.meta);

export class NecromancyLockedSpellTooltipElement extends HTMLElement {
    constructor() {
        super();
        this.requirements = [];
        this._content = new DocumentFragment();
        this._content.append(getTemplateNode('necromancy-locked-spell-tooltip-template'));
        this.levelRequired = getElementFromFragment(this._content, 'level-required', 'span');
    }
    connectedCallback() {
        this.appendChild(this._content);
    }
    setSpell(spell, ignoreReqs) {
        if(!ignoreReqs) {
            this.levelRequired.textContent = templateLangString('MENU_TEXT_SKILLNAME_LEVEL', {
                skillName: game.necromancy.name,
                level: `${spell.level}`,
            });
            toggleDangerSuccess(this.levelRequired, game.necromancy.level >= spell.level);
        } else {
            hideElement(this.levelRequired);
        }
    }
}
window.customElements.define('necromancy-locked-spell-tooltip', NecromancyLockedSpellTooltipElement);