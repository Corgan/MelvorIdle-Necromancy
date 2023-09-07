const { loadModule } = mod.getContext(import.meta);

//const { NecromancyPageUIComponent } = await loadModule('src/components/necromancy.mjs');

//class NecromancyRenderQueue extends SkillRenderQueue {
//    constructor() {
//        super();
//    }
//}

export class Necromancy extends CombatSkill {
    constructor(namespace, game) {
        super(namespace, 'Necromancy', game);
        this._media = 'assets/necromancy.png';
        this.renderQueue = new SkillRenderQueue();
    }

    get name() { return "Necromancy"; }

    postDataRegistration() {
        super.postDataRegistration();
        this.sortMilestones();
    }
}

