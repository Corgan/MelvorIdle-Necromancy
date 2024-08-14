const { loadModule, version } = mod.getContext(import.meta);

export class NecromancyIncantation extends NamespacedObject {
    constructor(namespace, data) {
        super(namespace, data.id);
        if(data.customDescription)
            this.customDescription = data.customDescription;
        try {
            this._name = data.name;
            this._media = data.media;
            this.level = data.level;
            this.abyssalLevel = data.abyssalLevel !== undefined ? data.abyssalLevel : 0;
            this.itemsConsumed = game.items.getQuantities(data.itemsConsumed);
            this.stats = new StatObject(data, game, `${NecromancyIncantation.name} with id "${this.id}"`);
        } catch (e) {
            throw new DataConstructionError(NecromancyIncantation.name, e, this.id);
        }
    }
    get name() {
        return this._name;
    }
    get media() {
        return this.getMediaURL(this._media);
    }
    get description() {
        if(this.customDescription !== undefined)
            return this.customDescription;
        return this.stats.describeAsSpanHTML();
    }
}