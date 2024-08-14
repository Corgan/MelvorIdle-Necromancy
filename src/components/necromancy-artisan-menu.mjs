const { loadModule } = mod.getContext(import.meta);

export class NecromancyArtisanMenuElement extends ArtisanMenuElement {
    constructor() {
        super();
    }
    get $template() {
        return 'necromancy-artisan-menu-template';
    }
    connectedCallback() {
        this.appendChild(this._content);
        this.productIcon = this.produces.addSingleProductIcon();
        this.ectoplasmIcon = this.produces.addSingleProductIcon();
    }
    setEctoplasm(item, qty) {
        this.ectoplasmIcon.setItem(item, qty);
    }
    setSelected(skill, recipe) {
        if(this.noneSelected)
            showElement(this.ectoplasmIcon);
        super.setSelected(skill, recipe);
    }
}
window.customElements.define('necromancy-artisan-menu', NecromancyArtisanMenuElement);