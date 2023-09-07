const { loadModule } = mod.getContext(import.meta);

const { UIComponent } = await loadModule('src/components/ui-component.mjs');

export class NecromancyPageUIComponent extends UIComponent {
    constructor() {
        super('necromancy-page-component');

        this.page = getElementFromFragment(this.$fragment, 'page', 'div');
    }
}