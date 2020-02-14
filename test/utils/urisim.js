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

    set(source) {
        let uid;

        while (!uid) {
            const newUid = UriSimulator.uid;

            if (!this.ids.includes(newUid)) {
                uid = newUid;
            }
        }

        this.resources[uid] = source;
        return uid;
    }

    get(uid) {
        return this.resources[uid];
    }

    update(uid, source) {

        if (!this.resources[uid]) {
            throw new Error(`Unknown resource: ${uid}`);
        }

        this.resources[uid] = source;
        return uid;
    }
}

module.exports = new UriSimulator();
