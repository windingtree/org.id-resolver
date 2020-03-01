const packageJson = require('../package.json');
const didDocumentSchema = require('@windingtree/org.json-schema');
const { OrgIdContract } = require('@windingtree/org.id');
const Ajv = require('ajv');

// Utilities
const expect = require('./utils/expect');
const { createContract } = require('./utils/contracts');
const { makeHash } = require('./utils/document');

// Modules
const httpFetchMethod = require('./http');
const { getDnsData, ResourceRecordTypes } = require('./dns');

// Errors types definitions
const errors = {
    'CORE_ERROR': 'Core error',
    'FETCHER_ERROR': 'URI fetcher error',
    'DID_SYNTAX_ERROR': 'DID syntax error',
    'DID_DOCUMENT_ERROR': 'DID document error',
    'TRUST_ASSERTION_ERROR': 'Trust error',
    'ORG_ID_ERROR': 'ORG.ID error'
};

/**
 * ORG.ID resolver class
 * @class OrgIdResolver
 */
class OrgIdResolver {

    /**
     * Creates an instance of OrgIdResolver.
     * @param {Obejct} options Contructor parameters
     * @memberof OrgIdResolver
     */
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

        this.validator = null;
        this.resolutionStart = null;
        this.resultTemplate = null;
        this.cache = null;
        this.result = null;

        this.reset();
    }

    /**
     * Sets defaults
     * @memberof OrgIdResolver
     */
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

    /**
     * Resolvs DID into its document
     * and makes proper validations and verifications
     * @memberof OrgIdResolver
     * @param {string} did DID
     * @returns {Promise<{Object}>} Resolving result
     */
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
            this.result.lifDeposit =
                await this.getLifStakeStatus(this.result.id);
        } catch(err) {

            this.addErrorMessage({
                type: 'CORE_ERROR',
                pointer: 'resolving flow termination',
                detail: `Resolving flow has been terminated due to serious error: ${err.message}`
            });
        }
        
        this.result.resolverMetadata.version = packageJson.version;
        this.result.resolverMetadata.retrieved = new Date().toISOString();
        this.result.resolverMetadata.duration =
            Date.now() - this.resolutionStart;

        return this.result;
    }

    /**
     * Validates the given DID syntax
     * @memberof OrgIdResolver
     * @param {string} did DID
     * @returns {Promise<{string}>} Organization Id
     */
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

    /**
     * Validates the given DID document
     * @memberof OrgIdResolver
     * @param {Object} didDocument DID document
     * @returns {Promise<{boolean}>} Validation result
     */
    async validateDidDocument(didDocument) {
        expect.all({ didDocument }, {
            didDocument: {
                type: 'object'
            }
        });

        // Use the Ajv validator
        // didDocumentSchema is obtained from @windingtree/org.json-schema
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

    /**
     * Verifies trust objects from the DID document
     * @memberof OrgIdResolver
     * @param {Object} didDocument DID document
     * @returns {Promise}
     */
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

                // For proof records that placed into DNS textual records
                // HINFO,SPF,TXT records types are supported
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
                
                // These types are used for handle proofs that related to
                // web sites and social accounts
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

                    // Fetch file by URI
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

                    // For cases where unknown assertion type has been provided
                    this.addErrorMessage({
                        type: 'TRUST_ASSERTION_ERROR',
                        pointer: `trust.assertions[${i}]`,
                        detail: `unknown assertion type: ${assertion.type}`
                    });
            }
        }
    }

    /**
     * Fetch a file by the given URI
     * @memberof OrgIdResolver
     * @param {string} uri The file URI
     * @returns {Promise<{Object|string}>} Fetched file
     */
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

        // Choosing of the proper fetching method
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

        // Trying to fetch the file
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

    /**
     * Fetch a DID document by the given Id
     * @memberof OrgIdResolver
     * @param {string} id The organization Id
     * @returns {Promise<{Object}>} DID document
     */
    async getDidDocumentUri(id) {
        expect.all({ id }, {
            id: {
                type: 'string'
            }
        });

        const organization = await this.getOrganization(id);
        const didDocument = await this.fetchFileByUri(organization.orgJsonUri);

        // Comparing of the stored and actual hash
        if (makeHash(didDocument, this.web3) !== organization.orgJsonHash) {
            
            this.addErrorMessage({
                type: 'DID_DOCUMENT_ERROR',
                pointer: 'DID document hash',
                detail: 'Invalid DID Document hash',
                throw: true
            });
        }

        const didObject = JSON.parse(didDocument);

        // DID document should containing a proper DID
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

    /**
     * Gets a status of the Lif deposit
     * @memberof OrgIdResolver
     * @param {string} id The organization Id
     * @returns {Promise<{Object}>} Lif deposit status
     */
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
            deposit = organization.deposit.toString();
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

    /**
     * Register a fetching method
     * @memberof OrgIdResolver
     * @param {Object} methodConfig The fetching method configuration config
     * @returns {Promise}
     */
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

    /**
     * Get the OrgId contract instance
     * @memberof OrgIdResolver
     * @returns {Promise<Object>} The OrgId contract instance
     */
    async getOrgIdContract() {

        if (this.cache.orgIdContract) {
            return this.cache.orgIdContract;
        }

        const contract = createContract(OrgIdContract, this.web3);
        this.cache.orgIdContract = await contract.at(this.orgIdAddress);
        return this.cache.orgIdContract;
    }

    /**
     * Get the organization data
     * @memberof OrgIdResolver
     * @param {string} id The organization Id
     * @returns {Promise<Object>} The OrgId contract instance
     */
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

    /**
     * Get the list of registered fetching methods names
     * @memberof OrgIdResolver
     * @returns {string[]} Registered fetching nethods names
     */
    getFetchMethods() {
        return Object.keys(this.fetchMethods);
    }

    /**
     * Adds the error message to the errors set
     * and throws a error if this behaviour is set in the options
     * @memberof OrgIdResolver
     * @returns {string[]} Registered fetching nethods names
     */
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
