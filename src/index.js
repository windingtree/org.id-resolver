const Ajv = require('ajv');
const expect = require('./utils/expect');
const { createContract } = require('./utils/contracts');
const { makeHash } = require('./utils/document');
const httpFetchMethod = require('./http');
const { getDnsData, ResourceRecordTypes } = require('./dns');
const didDocumentSchema = require('@windingtree/org.json-schema');
const { OrgIdContract } = require('@windingtree/org.id');

// Errors definitions
const errors = {
    'CORE_ERROR': 'Core error',
    'FETCHER_ERROR': 'URI fetcher error',
    'DID_SYNTAX_ERROR': 'DID syntax error',
    'DID_DOCUMENT_ERROR': 'DID document error',
    'TRUST_ASSERTION_ERROR': 'Trust error',
    'ORG_ID_ERROR': 'ORG.ID error'
};

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

        this.methodName = 'orgid';
        this.fetchMethods = {};
        this.web3 = options.web3;
        this.orgIdAddress = options.orgId;
        this.cache = {};
        this.reset();
    }

    reset() {
        this.validator = new Ajv();
        this.resolutionStart = null;
        this.resultTemplate = {
            didDocument: null,
            errors: [],
            lifDeposit: null,
            resolverMetadata: {
                retrieved: null,
                duration: null
            }
        };
        this.cache = {};
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

        try {
            this.result.id = await this.validateDidSyntax(did);
            this.result.didDocument =
                await this.getDidDocumentUri(this.result.id);
            await this.validateDidDocument(this.result.didDocument);
            await this.verifyTrustRecords(this.result.didDocument);
        } catch(err) {

            this.addErrorMessage({
                type: 'CORE_ERROR',
                pointer: 'resolving flow termination',
                detail: `Resolving flow has been terminated due to serious error: ${err.message}`
            });
        }
        
        this.result.resolverMetadata.retrieved = new Date().toISOString();
        this.result.resolverMetadata.duration =
            Date.now() - this.resolutionStart;

        return this.result;
    }

    async validateDidSyntax(did) {
        expect.all({ did }, {
            did: {
                type: 'string'
            }
        });

        const parts = did.split(':');

        if (parts[0] !== 'did') {

            this.addErrorMessage({
                type: 'DID_SYNTAX_ERROR',
                pointer: did,
                detail: `Invalid DID prefix: ${parts[0]}`,
                throw: true
            });
        }

        if (parts[1] !== this.methodName) {

            this.addErrorMessage({
                type: 'DID_SYNTAX_ERROR',
                pointer: did,
                detail: `Unsupported DID method: ${parts[1]}`,
                throw: true
            });
        }

        // Split paths, method parameters and queries
        const subParts = parts[2].split(/(?:#|;|\?)/);

        if (!new RegExp('^0x[a-fA-F0-9]{64}$').test(subParts[0])) {

            this.addErrorMessage({
                type: 'DID_SYNTAX_ERROR',
                pointer: did,
                detail: `Invalid method specific Id: ${subParts[0]}`,
                throw: true
            });
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
            
            this.validator.errors.map(detail => this.addErrorMessage({
                type: 'DID_DOCUMENT_ERROR',
                pointer: 'document schema',
                detail
            }));
        }

        return result;
    }

    async verifyTrustRecords(didDocument) {

        if (!didDocument.trust || !Array.isArray(didDocument.trust.assertions)) {
            // Nothing to verify
            return;
        }

        let assertion;

        for (let i = 0; i < didDocument.trust.assertions.length; i++) {
            assertion = didDocument.trust.assertions[i];
            let assertionContent;
            let proofFound = false;

            switch (assertion.type) {
                case 'dns':
                    
                    if (!ResourceRecordTypes[assertion.proof]) {

                        this.addErrorMessage({
                            type: 'TRUST_ASSERTION_ERROR',
                            pointer: `trust.assertions[${i}]`,
                            detail: `proof value "${assertion.proof}" not in the range of [${Object.keys(ResourceRecordTypes).join(',')}]`
                        });
                        break;
                    }

                    try {
                        assertionContent = await getDnsData(assertion.claim, assertion.proof);
                        
                        if (assertionContent.length === 0) {

                            this.addErrorMessage({
                                type: 'TRUST_ASSERTION_ERROR',
                                pointer: `trust.assertions[${i}]`,
                                detail: 'proof not found'
                            });
                            break;
                        }

                        for (const record of assertionContent) {

                            if (RegExp(didDocument.id, 'g').test(record.data)) {
                                proofFound = true;
                                break;
                            }
                        }

                        if (!proofFound) {

                            this.addErrorMessage({
                                type: 'TRUST_ASSERTION_ERROR',
                                pointer: `trust.assertions[${i}]`,
                                detail: 'proof not found'
                            });
                        }

                    } catch (err) {

                        this.addErrorMessage({
                            type: 'TRUST_ASSERTION_ERROR',
                            pointer: `trust.assertions[${i}]`,
                            detail: 'cannot get the proof'
                        });
                        break;
                    }

                    break;

                case 'social':
                case 'domain':
                    // Validate assertion.proof record
                    // should be in the assertion.claim namespace
                    
                    if (!RegExp(`(^http://|https://)${assertion.claim}`)
                        .test(assertion.proof)) {
                        
                        this.addErrorMessage({
                            type: 'TRUST_ASSERTION_ERROR',
                            pointer: `trust.assertions[${i}]`,
                            detail: 'claim is not in the domain namespace'
                        });
                        break;
                    }

                    // Fetch file by uri
                    try {
                        assertionContent = await this.fetchFileByUri(assertion.proof);
                        assertionContent = typeof assertionContent === 'object'
                            ? JSON.stringify(assertionContent)
                            : assertionContent;
                    } catch (err) {

                        this.addErrorMessage({
                            type: 'TRUST_ASSERTION_ERROR',
                            pointer: `trust.assertions[${i}]`,
                            detail: 'cannot get the proof'
                        });
                        break;
                    }

                    // Look for did inside the file obtained
                    if (!RegExp(didDocument.id, 'g').test(assertionContent)) {
                        
                        this.addErrorMessage({
                            type: 'TRUST_ASSERTION_ERROR',
                            pointer: `trust.assertions[${i}]`,
                            detail: 'DID not found in the claim'
                        });
                        break;
                    }

                    break;

                default:

                    this.addErrorMessage({
                        type: 'TRUST_ASSERTION_ERROR',
                        pointer: `trust.assertions[${i}]`,
                        detail: `unknown assertion type: ${assertion.type}`
                    });
            }
        }
    }

    async fetchFileByUri(uri) {
        expect.all({ uri }, {
            uri: {
                type: 'string'
            }
        });

        let fetch;

        if (Object.keys(this.fetchMethods).length === 0) {

            this.addErrorMessage({
                type: 'FETCHER_ERROR',
                pointer: 'incomplete configuration',
                detail: 'at least one fetching method should be registered',
                throw: true
            });
        }

        for (const f in this.fetchMethods) {

            if (RegExp(this.fetchMethods[f].pattern).test(uri)) {
                fetch = this.fetchMethods[f].fetch;
                break;
            }
        }

        if (!fetch) {

            this.addErrorMessage({
                type: 'FETCHER_ERROR',
                pointer: 'incomplete configuration',
                detail: `unable to determine the fetching method for URI: ${uri}`,
                throw: true
            });
        }

        const document = await fetch(uri);

        if (!document) {

            this.addErrorMessage({
                type: 'FETCHER_ERROR',
                pointer: uri,
                detail: 'file not found by the given URI',
                throw: true
            });
        }

        return  document;
    }

    async getDidDocumentUri(id) {
        expect.all({ id }, {
            id: {
                type: 'string'
            }
        });

        const organization = await this.getOrganization(id);
        const didDocument = await this.fetchFileByUri(organization.orgJsonUri);

        if (makeHash(didDocument, this.web3) !== organization.orgJsonHash) {
            
            this.addErrorMessage({
                type: 'DID_DOCUMENT_ERROR',
                pointer: 'DID document hash',
                detail: 'Invalid DID Document hash',
                throw: true
            });
        }

        const didObject = typeof didDocument === 'string'
            ? JSON.parse(didDocument)
            : didDocument;

        if (`did:${this.methodName}:${id}` !== didObject.id) {

            this.addErrorMessage({
                type: 'DID_DOCUMENT_ERROR',
                pointer: 'DID document id',
                detail: `Invalid DID Document id. Expected to be: ${id}, but actual is: ${didObject.id}`,
                throw: true
            });
        }

        return didObject;
    }

    async getLifStakeStatus(id) {
        expect.all({ id }, {
            id: {
                type: 'string'
            }
        });

        let deposit = 0;
        let withdrawalRequest = null;

        try {
            const organization = await this.getOrganization(id);
            deposit = organization.deposit;
            const orgId = await this.getOrgIdContract();
            withdrawalRequest = await orgId
                .methods['getWithdrawalRequest(bytes32)'].call(id);
        } catch (err) {

            if (!RegExp('Withdrawal request not found').test(err.message)) {
                
                this.addErrorMessage({
                    type: 'ORG_ID_ERROR',
                    pointer: 'withdrawal request information',
                    detail: err.message
                });
            }
        }
        
        return {
            deposit,
            withdrawalRequest
        };
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

    async getOrgIdContract() {

        if (this.cache.orgIdContract) {
            return this.cache.orgIdContract;
        }

        const contract = createContract(OrgIdContract, this.web3);
        this.cache.orgIdContract = await contract.at(this.orgIdAddress);
        return this.cache.orgIdContract;
    }

    async getOrganization(id) {
        expect.all({ id }, {
            id: {
                type: 'string'
            }
        });

        if (this.cache.organization) {
            return this.cache.organization;
        }

        const orgId = await this.getOrgIdContract();
        this.cache.organization = await orgId
            .methods['getOrganization(bytes32)'].call(id);
        return this.cache.organization;
    }

    addErrorMessage(options) {
        expect.all(options, {
            type: {
                type: 'enum',
                values: Object.keys(errors)
            },
            pointer: {
                type: 'string'
            },
            detail: {
                type: 'string',
                required: false
            },
            throw: {
                type: 'boolen',
                required: false
            }
        });

        this.result.errors.push({
            title: errors[options.type],
            source: {
                pointer: options.pointer
            },
            detail: options.detail
        });

        if (options.throw) {
            throw new Error(
                `${errors[options.type]}: ${options.pointer}; ${options.detail}`
            );
        }
    }
}

module.exports.OrgIdResolver = OrgIdResolver;
module.exports.httpFetchMethod = httpFetchMethod;
module.exports.errorsDefinitions = Object.assign({}, errors);
