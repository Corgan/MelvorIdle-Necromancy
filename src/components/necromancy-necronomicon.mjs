const { loadModule } = mod.getContext(import.meta);

const { NecromancyAttackSpellMenuElement } = await loadModule('src/components/necromancy-attack-spell-menu.mjs');
const { NecromancyAugurySpellMenuElement } = await loadModule('src/components/necromancy-augury-spell-menu.mjs');
const { NecromancyConjurationSpellMenuElement } = await loadModule('src/components/necromancy-conjuration-spell-menu.mjs');
const { NecromancyIncantationSpellMenuElement } = await loadModule('src/components/necromancy-incantation-spell-menu.mjs');

export class NecromancyNecronomiconElement extends HTMLElement {
    constructor() {
        super();
        this.tooltips = [];
        this._content = new DocumentFragment();
        this._content.append(getTemplateNode('necromancy-necronomicon-menu-template'));
        this.weaponNotice = getElementFromFragment(this._content, 'weapon-notice', 'small');
        this.necromancyButtonGroup = getElementFromFragment(this._content, 'necromancy-button-group', 'div');

        this.attackButton = getElementFromFragment(this._content, 'necromancy-attack-button', 'button');
        this.auguryButton = getElementFromFragment(this._content, 'necromancy-augury-button', 'button');
        this.conjurationButton = getElementFromFragment(this._content, 'necromancy-conjuration-button', 'button');
        this.incantationButton = getElementFromFragment(this._content, 'necromancy-incantation-button', 'button');

        this.attackSpellMenu = getElementFromFragment(this._content, 'necromancy-attack-spell-menu', 'necromancy-attack-spell-menu');
        this.augurySpellMenu = getElementFromFragment(this._content, 'necromancy-augury-spell-menu', 'necromancy-augury-spell-menu');
        this.conjurationSpellMenu = getElementFromFragment(this._content, 'necromancy-conjuration-spell-menu', 'necromancy-conjuration-spell-menu');
        this.incantationSpellMenu = getElementFromFragment(this._content, 'necromancy-incantation-spell-menu', 'necromancy-incantation-spell-menu');
    }
    connectedCallback() {
        this.appendChild(this._content);
    }
    disconnectedCallback() {
        this.tooltips.forEach((tt)=>tt.destroy());
        this.tooltips = [];
    }

    init() {
        this.attackSpellMenu.init();
        this.augurySpellMenu.init();
        this.conjurationSpellMenu.init();
        this.incantationSpellMenu.init();
        
        this.attackButton.onclick = ()=>this.selectMenu(this.attackSpellMenu, this.attackButton);
        this.addTooltip(this.attackButton, 'Necromancy');
        this.auguryButton.onclick = ()=>this.selectMenu(this.augurySpellMenu, this.auguryButton);
        this.addTooltip(this.auguryButton, 'Augury');
        this.conjurationButton.onclick = ()=>this.selectMenu(this.conjurationSpellMenu, this.conjurationButton);
        this.addTooltip(this.conjurationButton, 'Conjuration');
        this.incantationButton.onclick = ()=>this.selectMenu(this.incantationSpellMenu, this.incantationButton);
        this.addTooltip(this.incantationButton, 'Incantation');

        this.selectMenu(this.attackSpellMenu, this.attackButton)
    }
    updateRequirements(ignoreReqs) {
        if (game.combat.player.attackType === 'necro') {
            hideElement(this.weaponNotice);
        } else {
            showElement(this.weaponNotice);
        }
        this.selectedMenu.updateForUnlock(ignoreReqs);
    }
    selectMenu(menu, button) {
        if(this.selectedMenu === menu)
            return;
        this.changeSelectedButton(button);
        this.changeSelectedMenu(menu);
        this.onBookChange();
    }
    changeSelectedButton(button) {
        if(this.selectedButton !== undefined)
            this.selectedButton.classList.replace('btn-outline-success', 'btn-outline-secondary');
        button.classList.replace('btn-outline-secondary', 'btn-outline-success');
        this.selectedButton = button;
    }
    changeSelectedMenu(menu) {
        if(this.selectedMenu !== undefined)
            hideElement(this.selectedMenu);
        showElement(menu);
        this.selectedMenu = menu;
    }
    onBookChange() {
        this.updateRequirements(false);
    }
    addTooltip(button, bookName) {
        this.tooltips.push(tippy(button, {
            content: bookName,
            placement: 'bottom',
            interactive: false,
            animation: false,
        }));
    }
}
window.customElements.define('necromancy-necronomicon-menu', NecromancyNecronomiconElement);