// const axios = require('axios');
const Ajv = require('ajv');
const expect = require('./utils/expect');
const { createContract } = require('./utils/contracts');
const { makeHash } = require('./utils/document');
const didDocumentSchema = require('../assets/did.json');
const { OrgIdContract } = require('@windingtree/org.id');

// ORG.ID resolver class
class OrgIdResolver {

    constructor(options = {}) {
        expect.all(options, {
            web3: {
                type: 'object'
            },
            orgId: {
                type: 'address'
            }
        });

        this.web3 = options.web3;
        this.orgId = options.orgId;
        this.methodName = 'orgid';
        this.fetchMethods = {};
        this.reset();
    }

    reset() {
        this.validator = new Ajv();
        this.resolutionStart = null;
        this.resultTemplate = {
            didDocument: {},
            errors: [],
            resolverMetadata: {
                retrieved: null,
                duration: null
            }
        };
        this.result = Object.assign({}, this.resultTemplate);
    }

    async resolve(did) {
        expect.all({ did }, {
            did: {
                type: 'string'
            }
        });
        
        this.reset();
        this.resolutionStart = Date.now();
        const id = await this.validateDidSyntax(did);
        const didDocument = await this.getDidDocumentUri(id);
        await this.validateDidDocument(didDocument);
        await this.verifyTrustRecords(didDocument);

        // Prepare result
        this.result.didDocument = didDocument;
        this.result.resolverMetadata.retrieved = new Date().toISOString();
        this.result.resolverMetadata.duration = Date.now() - this.resolutionStart;

        return this.result;
    }

    async fetchDidDocumentByUri(uri) {
        expect.all({ uri }, {
            uri: {
                type: 'string'
            }
        });

        let fetch;

        if (Object.keys(this.fetchMethods).length === 0) {
            throw new Error('At least one fetching method should be registered');
        }

        for (const f in this.fetchMethods) {

            if (RegExp(this.fetchMethods[f].pattern).test(uri)) {
                fetch = this.fetchMethods[f].fetch;
                break;
            }
        }

        if (!fetch) {
            throw new Error(
                `Unable to determine the fetching method for uri: ${uri}`
            );
        }

        const document = await fetch(uri);

        if (!document) {
            throw new Error('DID document not found by the given uri');
        }

        return  document;
    }

    async validateDidSyntax(did) {
        expect.all({ did }, {
            did: {
                type: 'string'
            }
        });

        const parts = did.split(':');

        if (parts[0] !== 'did') {
            throw new Error(`Invalid DID prefix: ${parts[0]}`);
        }

        if (parts[1] !== this.methodName) {
            throw new Error(`Unsupported DID method: ${parts[1]}`);
        }

        // Split paths, method parameters and queries
        const subParts = parts[2].split(/(?:#|;|\?)/);

        if (!new RegExp('^0x[a-fA-F0-9]{64}$').test(subParts[0])) {
            throw new Error(`Invalid method specific id: ${subParts[0]}`);
        }

        return subParts[0];
    }

    async validateDidDocument(didDocument) {
        expect.all({ didDocument }, {
            didDocument: {
                type: 'object'
            }
        });

        const result = this.validator.validate(didDocumentSchema, didDocument);

        if (this.validator.errors !== null) {

            this.result.errors = [
                ...this.result.errors,
                ...this.validator.errors
            ];
        }

        return result;
    }

    async verifyTrustRecords(didDocument) {

    }

    async getDidDocumentUri(id) {
        const contract = createContract(OrgIdContract, this.web3);
        const orgId = await contract.at(this.orgId);
        const organization = await orgId.methods['getOrganization(bytes32)'].call(id);
        const didDocument = await this.fetchDidDocumentByUri(organization.orgJsonUri);

        if (makeHash(didDocument, this.web3) !== organization.orgJsonHash) {
            throw new Error('Invalid DID Document hash');
        }

        const didObject = JSON.parse(didDocument);

        if (`did:${this.methodName}:${id}` !== didObject.id) {
            throw new Error(
                `Invalid DID Document id. Expected to be: ${id}, but actual is: ${didObject.id}`
            );
        }

        return didObject;
    }

    async registerFetchMethod(methodConfig = {}) {
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
