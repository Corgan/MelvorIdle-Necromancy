const { loadModule } = mod.getContext(import.meta);

const { NecromancyPageUIComponent } = await loadModule('src/components/necromancy.mjs');

class NecromancyRenderQueue extends SkillRenderQueue {
    constructor() {
        super();
    }
}

export class Necromancy extends CombatSkill {
    constructor(namespace, game) {
        super(namespace, 'Necromancy', game);
        this._media = 'assets/necromancy.png';
        this.renderQueue = new NecromancyRenderQueue();
        this.component = new NecromancyPageUIComponent();
        this.version = 1;
    }

    get name() { return "Necromancy"; }

    postDataRegistration() {
        super.postDataRegistration();
        this.sortMilestones();
    }

    encode(writer) {
        let start = writer.byteOffset;
        super.encode(writer); // Encode default skill data
        writer.writeUint32(this.version); // Store current skill version

        writer.writeBoolean(game.combat.player.attackStyles.necro !== undefined);
        if(game.combat.player.attackStyles.necro)
            writer.writeNamespacedObject(game.combat.player.attackStyles.necro);

        let end = writer.byteOffset;
        console.log(`Wrote ${end-start} bytes for Necromancy save`);
        return writer;

    }

    decode(reader, version) {
        //console.log("Adventuring save decoding");
        let start = reader.byteOffset;
        reader.byteOffset -= Uint32Array.BYTES_PER_ELEMENT; // Let's back up a minute and get the size of our skill data
        let skillDataSize = reader.getUint32();

        try {
            super.decode(reader, version);
            this.saveVersion = reader.getUint32(); // Read save version

            if (reader.getBoolean()) {
                const style = reader.getNamespacedObject(game.attackStyles);
                if (typeof style === 'string')
                    game.combat.player.attackStyles.necro = game.attackStyles.find((style)=>style.attackType === 'necro');
                else
                    game.combat.player.attackStyles.necro = style;
            }
        } catch(e) { // Something's fucky, dump all progress and skip past the trash save data
            console.log(e);
            reader.byteOffset = start;
            reader.getFixedLengthBuffer(skillDataSize);
        }

        let end = reader.byteOffset;
        console.log(`Read ${end-start} bytes for Necromancy save, expected ${skillDataSize}`);

        if(end-start !== skillDataSize) {
            reader.byteOffset = start;
            reader.getFixedLengthBuffer(skillDataSize);
        }
    }
}

