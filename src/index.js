const Ajv = require('ajv');
const httpFetchMethod = require('./http');
const expect = require('./utils/expect');
const { createContract } = require('./utils/contracts');
const { makeHash } = require('./utils/document');
const didDocumentSchema = require('@windingtree/org.json-schema');
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
        this.result.didDocument = didDocument;
        await this.validateDidDocument(didDocument);
        await this.verifyTrustRecords(didDocument);
        this.result.resolverMetadata.retrieved = new Date().toISOString();
        this.result.resolverMetadata.duration = Date.now() - this.resolutionStart;

        return this.result;
    }

    async fetchFileByUri(uri) {
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
            throw new Error('File not found by the given uri');
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

        if (!didDocument.trust || !Array.isArray(didDocument.trust.assertions)) {
            return;
        }

        let assertion;

        for (let i = 0; i < didDocument.trust.assertions.length; i++) {
            assertion = didDocument.trust.assertions[i];
            let assertionContent;

            switch (assertion.type) {
                case 'dns':
                    // @todo Get dns records from the assertion.claim domain
                    // Look for did in the assertion.proof records list
                    break;

                case 'social':
                case 'domain':
                    // Validate assertion.proof record
                    // should be in the assertion.claim namespace
                    
                    if (!RegExp(`(^http://|https://)${assertion.claim}`)
                        .test(assertion.proof)) {
                        
                        this.result.errors.push(
                            `Failed assertion trust.assertions[${i}]: Clain is not in the domain namespace`
                        );
                        break;
                    }

                    // Fetch file by uri
                    try {
                        assertionContent = await this.fetchFileByUri(assertion.proof);
                        assertionContent = typeof assertionContent === 'object'
                            ? JSON.stringify(assertionContent)
                            : assertionContent;
                    } catch (err) {

                        this.result.errors.push(
                            `Failed assertion trust.assertions[${i}]: Cannot get the proof`
                        );
                        break;
                    }

                    // Look for did inside the file obtained
                    if (!RegExp(didDocument.id, 'g').test(assertionContent)) {
                        
                        this.result.errors.push(
                            `Failed assertion trust.assertions[${i}]: DID not found in the claim`
                        );
                        break;
                    }

                    break;

                default:
            }
        }
    }

    async getDidDocumentUri(id) {
        const contract = createContract(OrgIdContract, this.web3);
        const orgId = await contract.at(this.orgId);
        const organization = await orgId.methods['getOrganization(bytes32)'].call(id);
        const didDocument = await this.fetchFileByUri(organization.orgJsonUri);

        if (makeHash(didDocument, this.web3) !== organization.orgJsonHash) {
            throw new Error('Invalid DID Document hash');
        }

        const didObject = typeof didDocument === 'string'
            ? JSON.parse(didDocument)
            : didDocument;

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
module.exports.httpFetchMethod = httpFetchMethod;
