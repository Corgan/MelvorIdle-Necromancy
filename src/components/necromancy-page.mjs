const { loadModule } = mod.getContext(import.meta);

export class NecromancyPageElement extends HTMLElement  {
    constructor() {
        super();
        this._content = new DocumentFragment();
        this._content.append(getTemplateNode('necromancy-page-template'));
        this.categoryContainer = getElementFromFragment(this._content, 'necromancy-category-container', 'div');
        this.categoryMenu = getElementFromFragment(this._content, 'necromancy-category-menu', 'realmed-category-menu');
        this.artisanMenu = getElementFromFragment(this._content, 'necromancy-artisan-menu', 'necromancy-artisan-menu');
    }

    connectedCallback() {
        this.appendChild(this._content);
    }
}
window.customElements.define('necromancy-page', NecromancyPageElement);