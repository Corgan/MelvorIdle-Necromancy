const { loadModule } = mod.getContext(import.meta);


const { NecromancyAttackSpellTooltipElement } = await loadModule('src/components/necromancy-attack-spell-tooltip.mjs');
const { NecromancyAugurySpellTooltipElement } = await loadModule('src/components/necromancy-augury-spell-tooltip.mjs');
const { NecromancyConjurationSpellTooltipElement } = await loadModule('src/components/necromancy-conjuration-spell-tooltip.mjs');
const { NecromancyIncantationSpellTooltipElement } = await loadModule('src/components/necromancy-incantation-spell-tooltip.mjs');
const { NecromancyLockedSpellTooltipElement } = await loadModule('src/components/necromancy-locked-spell-tooltip.mjs');

export class NecromancySpellButtonElement extends HTMLElement {
    constructor() {
        super();
        this._content = new DocumentFragment();
        this._content.append(getTemplateNode('necromancy-spell-button-template'));
        this.link = getElementFromFragment(this._content, 'link', 'a');
        this.spellImage = getElementFromFragment(this._content, 'spell-image', 'img');
    }
    connectedCallback() {
        this.appendChild(this._content);
        this.tooltip = tippy(this.link, {
            content: '',
            placement: 'bottom',
            allowHTML: true,
            interactive: false,
            animation: false,
        });
    }
    disconnectedCallback() {
        if (this.tooltip !== undefined) {
            this.tooltip.destroy();
            this.tooltip = undefined;
        }
    }
    setAttackSpell(spell) {
        this.spellImage.src = spell.media;
        const tooltip = createElement('necromancy-attack-spell-tooltip');
        tooltip.setSpell(spell);
        if(this.tooltip !== undefined)
            this.tooltip.setContent(tooltip);
    }
    setAugurySpell(spell) {
        this.spellImage.src = spell.media;
        const tooltip = createElement('necromancy-augury-spell-tooltip');
        tooltip.setSpell(spell);
        if(this.tooltip !== undefined)
            this.tooltip.setContent(tooltip);
    }
    setConjurationSpell(spell) {
        this.spellImage.src = spell.media;
        const tooltip = createElement('necromancy-conjuration-spell-tooltip');
        tooltip.setSpell(spell);
        if(this.tooltip !== undefined)
            this.tooltip.setContent(tooltip);
    }
    setIncantationSpell(spell) {
        this.spellImage.src = spell.media;
        const tooltip = createElement('necromancy-incantation-spell-tooltip');
        tooltip.setSpell(spell);
        if(this.tooltip !== undefined)
            this.tooltip.setContent(tooltip);
    }
    setLockedSpell(spell, ignoreReqs) {
        this.spellImage.src = assets.getURI("assets/media/main/question.svg");
        const tooltip = createElement('necromancy-locked-spell-tooltip');
        tooltip.setSpell(spell, ignoreReqs);
        if(this.tooltip !== undefined)
            this.tooltip.setContent(tooltip);
    }
    setCallback(callback) {
        this.link.onclick = callback;
        this.link.classList.add('pointer-enabled');
    }
    removeCallback() {
        this.link.onclick = null;
        this.link.classList.remove('pointer-enabled');
    }
    highlight() {
        this.link.classList.add(...NecromancySpellButtonElement.borderClasses);
    }
    unhighlight() {
        this.link.classList.remove(...NecromancySpellButtonElement.borderClasses);
    }
}
NecromancySpellButtonElement.borderClasses = ['border-success', 'border-2x', 'spell-selected'];
window.customElements.define('necromancy-spell-button', NecromancySpellButtonElement);