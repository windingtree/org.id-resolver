// Simulator of online resources
// Allowing to set, get and update resource
class UriSimulator {

    constructor() {
        this.ids = [];
        this.resources = {};
    }

    static get uid() {
        return Math.random().toString(36).substr(2, 9);
    }

    async set(source) {
        let uid;

        if (source === undefined) {
            throw new Error('Cannot set an undefined resource source');
        }

        while (!uid) {
            const newUid = UriSimulator.uid;

            if (!this.ids.includes(newUid)) {
                uid = newUid;
            }
        }

        this.resources[uid] = source;
        return uid;
    }

    async get(uid) {
        return this.resources[uid];
    }

    async update(uid, source) {

        if (!this.resources[uid]) {
            throw new Error(`Unknown resource: ${uid}`);
        }

        this.resources[uid] = source;
        return uid;
    }

    fetchMethod() {
        return {
            name: 'urisim',
            pattern: '^[a-zA-Z0-9]{9}$',
            fetch: uid => this.get(uid)
        };
    }
}

module.exports = new UriSimulator();
module.exports.UriSimulator = UriSimulator;
