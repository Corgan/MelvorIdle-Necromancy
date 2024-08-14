const { loadModule } = mod.getContext(import.meta);

export class NecromancyConjurationSpellTooltipElement extends HTMLElement {
    constructor() {
        super();
        this._content = new DocumentFragment();
        this._content.append(getTemplateNode('necromancy-conjuration-spell-tooltip-template'));
        this.spellName = getElementFromFragment(this._content, 'spell-name', 'span');
        this.spellDescription = getElementFromFragment(this._content, 'spell-description', 'span');
        this.itemsConsumed = getElementFromFragment(this._content, 'items-consumed', 'span');
    }
    connectedCallback() {
        this.appendChild(this._content);
    }
    setSpell(spell) {
        this.spellName.textContent = spell.name;
        this.spellDescription.innerHTML = spell.description;
        this.itemsConsumed.innerHTML = '';
        spell.itemsConsumed.forEach(({item, quantity})=>{
            this.itemsConsumed.append(`${quantity}`, createElement('img', {
                className: 'skill-icon-sm',
                attributes: [['src', item.media]]
            }));
        });
    }
}
window.customElements.define('necromancy-conjuration-spell-tooltip', NecromancyConjurationSpellTooltipElement);