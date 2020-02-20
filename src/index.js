const axios = require('axios');
const expect = require('./utils/expect');
const { createContract } = require('./utils/contracts');
const { makeHash } = require('./utils/document');
const OrganizationSchema = require('../build/Organization.json');// should be updated after wt-contracts package will be fixed

// ORG.ID resolver class
class OrgIdResolver {

    constructor(options = {}) {
        expect.all(options, {
            web3: {
                type: 'object'
            }
        });

        this.web3 = web3;
        this.methodName = 'orgid';
        this.fetchMethods = {};
        this.resolutionStart = null;
        this.resultTemplate = {
            didDocument: {},
            resolverMetadata: {
                driverId: 'did:orgid',
                retrieved: null,
                duration: null
            }
        };
    }

    async resolve(did) {
        expect.all({ did }, {
            web3: {
                type: 'string'
            }
        });

        this.resolutionStart = Date.now();
        const id = this.validateDidSyntax(did);
        const didDocument = await this.getDidDocumentUri(id);
        this.validateDidDocument(didDocument);
        this.verifyTrustRecords(didDocument);

        // Prepare result
        const result = Object.assign({}, this.resultTemplate);
        result.didDocument = didDocument;
        result.resolverMetadata.retrieved = new Date().toISOString();
        result.resolverMetadata.duration = Date.now() - this.resolutionStart;

        return result;
    }

    async fetchDidDocumentByUri(uri) {
        let fetch;

        for (const f of this.fetchMethods) {

            if (RegExp(f.pattern).test(uri)) {
                fetch = f.fetch;
                break;
            }
        }

        if (!fetch) {
            throw new Error(
                `Unable to determine the fetching method for uri: ${uri}`
            );
        }

        return await fetch(uri);
    }

    validateDidSyntax(did) {
        const parts = did.split(':');

        if (parts[0] !== 'did') {
            throw new Error('Invalid DID prefix');
        }

        if (parts[1] !== this.methodName) {
            throw new Error('Unsupported DID method');
        }

        // Split paths, method parameters and queries
        const subParts = parts[2].split(/(?:#|;|\?)/);

        if (!new RegExp('^0x[a-fA-F0-9]{40}$').test(subParts[0])) {
            throw new Error('Invalid method specific id');
        }

        return subParts[0];
    }

    validateDidDocument(didDocument) {

    }

    async verifyTrustRecords(didDocument) {

    }

    async getDidDocumentUri(id) {
        const contract = createContract(OrganizationSchema, this.web3);
        const organization = await contract.at(id);
        const uri = await organization.methods['getOrgJsonUri()'].call();
        const hash = await organization.methods['getOrgJsonHash()'].call();
        const didDocument = await this.fetchDidDocumentByUri(uri);

        if (makeHash(JSON.stringify(didDocument)) !== hash) {
            throw new Error('Invalid DID Document hash');
        }

        return didDocument;
    }

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
