const expect = require('./utils/expect');

// ORG.ID resolver class
class OrgIdResolver {

    constructor() {
        this.fetchMethods = {};
    }

    resolve() {}

    registerFetchMethod(methodConfig = {}) {
        expect.all(methodConfig, {
            name: {
                type: 'string'
            },
            pattern: {
                type: 'string'
            },
            fetch: {
                type: 'function'
            }
        });

        this.fetchMethods[methodConfig.name] = methodConfig;
    }

    getFetchMethods() {
        return Object.keys(this.fetchMethods);
    }
}

module.exports.OrgIdResolver = OrgIdResolver;
