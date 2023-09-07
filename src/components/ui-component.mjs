export class UIComponent {
    constructor(template) {
        this.$fragment = new DocumentFragment();
        this.$fragment.append(getTemplateNode(template));

        this.$elements = [...this.$fragment.children];
    }

    show() {
        this.$elements.forEach($el => $el.classList.remove('d-none'));
    }

    hide() {
        this.$elements.forEach($el => $el.classList.add('d-none'));
    }

    mount(parent) {
        parent.append(...this.$elements);
    }

    unmount() {
        this.$elements.forEach($el => $el.remove());
    }
}