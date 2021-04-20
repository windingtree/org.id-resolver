const packageJson = require('../package.json');
const { validateVc } = require('./utils/vc');
const didDocumentSchema = require('org.json-schema-0.3');
const didDocumentSchema04 = require('org.json-schema-0.4');
const { OrgIdContract } = require('@windingtree/org.id');
const { LifDepositContract } = require('@windingtree/org.id-lif-deposit');
const Ajv = require('ajv');

// Utilities
const expect = require('./utils/expect');
const { makeHash } = require('./utils/document');

// Modules
const httpFetchMethod = require('./http');
const linkedInFetchMethod = require('./linkedIn');
const twitterFetchMethod = require('./twitter');
const whoisService = require('./whois');
const { getDnsData, ResourceRecordTypes } = require('./dns');
const { zeroAddress } = require('./utils/constants');

// Errors types definitions
const checksTypes = [
    'DID_SYNTAX',
    'ORGID',
    'DID_DOCUMENT',
    'TRUST_ASSERTIONS',
    'LIF_STAKE'
];

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
    constructor (options = {}) {
        expect.all(options, {
            web3: {
                type: 'object'
            },
            orgId: {
                type: 'address'
            },
            lifDeposit: {
                type: 'address',
                required: false
            },
            authorizedTrustProofsIssuers: {
                type: 'object',
                required: false
            }
        });

        this.methodName = 'orgid';
        this.fetchSocialMethods = {};
        this.fetchMethods = {};
        this.serviceMethods = {};
        this.web3 = options.web3;
        this.orgIdAddress = options.orgId;
        this.lifDepositAddress = options.lifDeposit;
        this.authorizedTrustProofsIssuers = options.authorizedTrustProofsIssuers;

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
    reset () {
        this.validator = new Ajv();
        this.resolutionStart = null;
        this.resultTemplate = {
            didDocument: null,
            organization: null,
            checks: checksTypes.map(type => ({
                type,
                passed: ['TRUST_ASSERTIONS', 'LIF_STAKE'].includes(type)
                    ? false
                    : true
            })),
            trust: [],
            ...(
                this.lifDepositAddress
                    ? {
                        lifDeposit: null
                    }
                    : {}
            ),
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
    async resolve (did) {
        expect.all({ did }, {
            did: {
                type: 'string'
            }
        });

        this.reset();
        this.resolutionStart = Date.now();

        try {
            await this.validateDidSyntax(did);
            await this.getOrganization(this.result.id);
            await this.getDidDocument(this.result.organization);
            await this.validateDidDocument(this.result.didDocument);
            await this.verifyTrustRecords(this.result.didDocument);
            await this.verifyLifStake(this.result.id);
        } catch(error) {

            throw new Error(
                `Resolving flow has been terminated due to serious error: ${error.message}; ${error.stack}`
            );
        }

        this.result.resolverMetadata.version = packageJson.version;
        this.result.resolverMetadata.retrieved = new Date().toISOString();
        this.result.resolverMetadata.duration =
            Date.now() - this.resolutionStart;
        this.result.resolverMetadata.orgIdAddress = this.orgIdAddress;
        return this.result;
    }

    /**
     * Validates the given DID syntax
     * @memberof OrgIdResolver
     * @param {string} did DID
     * @returns {Promise<{string}>} Organization Id
     */
    async validateDidSyntax (did) {
        expect.all({ did }, {
            did: {
                type: 'string'
            }
        });

        const parts = did.split(':');

        if (parts[0] !== 'did') {

            this.addCheckResult({
                type: 'DID_SYNTAX',
                error: `Invalid DID prefix: ${parts[0]}`,
                throw: true
            });
        }

        if (parts[1] !== this.methodName) {

            this.addCheckResult({
                type: 'DID_SYNTAX',
                error: `Unsupported DID method: ${parts[1]}`,
                throw: true
            });
        }

        // Split paths, method parameters and queries
        const subParts = parts[2].split(/(?:#|;|\?)/);

        if (!new RegExp('^0x[a-fA-F0-9]{64}$').test(subParts[0])) {

            this.addCheckResult({
                type: 'DID_SYNTAX',
                error: `Invalid method specific Id: ${subParts[0]}`,
                throw: true
            });
        }

        this.result.id = subParts[0];
        return this.result.id;
    }

    /**
     * Validates the given DID document
     * @memberof OrgIdResolver
     * @param {Object} didDocument DID document
     * @returns {Promise<{boolean}>} Validation result
     */
    async validateDidDocument (didDocument) {
        expect.all({ didDocument }, {
            didDocument: {
                type: 'object'
            }
        });

        const schema = didDocument.schemaVersion && didDocument.schemaVersion.match(/^0.4/)
            ? didDocumentSchema04
            : didDocumentSchema;

        // Use the Ajv validator
        // didDocumentSchema is obtained from @windingtree/org.json-schema
        const result = this.validator.validate(schema, didDocument);

        if (this.validator.errors !== null) {

            this.validator.errors.map(detail => this.addCheckResult({
                type: 'DID_DOCUMENT',
                warning: detail
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
    async verifyTrustRecords (didDocument) {

        if (!didDocument.trust || !Array.isArray(didDocument.trust.assertions)) {
            // Nothing to verify
            return {};
        }

        // Cloned trust section
        const trust = JSON.parse(JSON.stringify(didDocument.trust));

        // Organization Id part of the DID
        const id = didDocument.id.match(/^did:orgid:(0x[a-fA-F0-9]{64}){1}$/im)[1];

        // Proofs existence flag
        let isProofsFound = false;

        // Assertions verification
        for (let i = 0; i < trust.assertions.length; i++) {
            let assertion = trust.assertions[i];
            let assertionContent;
            let proofFound = false;

            // WHOIS information about domain
            let whoisInfo;

            switch (assertion.type) {

                // For proof records that placed into DNS textual records
                // HINFO,SPF,TXT records types are supported
                case 'dns':

                    if (!ResourceRecordTypes[assertion.proof]) {

                        this.addCheckResult({
                            type: 'TRUST_ASSERTIONS',
                            error: `trust.assertions[${i}]: proof value "${assertion.proof}"
                                not in the range of [${Object.keys(ResourceRecordTypes).join(',')}]`
                        });
                        break;
                    }

                    try {
                        assertionContent = await getDnsData(assertion.claim, assertion.proof);

                        if (assertionContent.length === 0) {

                            this.addCheckResult({
                                type: 'TRUST_ASSERTIONS',
                                error: `trust.assertions[${i}]: claim source is empty`
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

                            this.addCheckResult({
                                type: 'TRUST_ASSERTIONS',
                                error: `trust.assertions[${i}]: proof not found`
                            });
                        }

                    } catch (err) {

                        this.addCheckResult({
                            type: 'TRUST_ASSERTIONS',
                            error: `trust.assertions[${i}]: cannot get the proof`
                        });
                        break;
                    }

                    break;

                // These types are used for handle proofs that related to
                // web sites and social accounts
                case 'social':
                case 'domain':

                    try {
                        // Fetch WHOIS information for domain
                        if (assertion.type === 'domain' && this.serviceMethods.whois) {
                            const rootDomain = assertion.claim.match(/[^.]+\.[^.]+$/)[0];
                            whoisInfo = await this.serviceMethods.whois.fetch(rootDomain);
                            proofFound = true;
                            break;
                        }
                    } catch (err) {
                        this.addCheckResult({
                            type: 'TRUST_ASSERTIONS',
                            error: `trust.assertions[${i}]: unable to fetch whois information`
                        });
                    }

                    // If an object provided as VC proof then
                    // we need to validate this proof as a Verifiable credential
                    if (assertion.proof.match(/^did.orgid/)) {
                        try {
                            const issuerDid = assertion.proof.split('#')[0];

                            if (this.authorizedTrustProofsIssuers && !this.authorizedTrustProofsIssuers.includes(issuerDid)) {
                                throw new Error(`Not authorized trust proof issuer: ${issuerDid}`);
                            }

                            // Use resolved DID document to avoid recursive calls
                            if (assertion.proof.match(new RegExp(`^did.orgid:${this.result.id}`))) {
                                const didDocumentResult = this.result.checks.filter(c => c.type === 'DID_DOCUMENT')[0];

                                if (!didDocumentResult || !didDocumentResult.passed) {
                                    this.addCheckResult({
                                        type: 'TRUST_ASSERTIONS',
                                        error: `trust.assertions[${i}]: VC issuer DID not pass verification`
                                    });
                                    break;
                                }

                                await validateVc(
                                    assertion.proof,
                                    didDocument.id,
                                    assertion.claim,
                                    null,
                                    this.result.didDocument
                                );
                            } else {

                                const resolver = this.spawnResolver();
                                await validateVc(
                                    assertion.proof,
                                    didDocument.id,
                                    assertion.claim,
                                    resolver
                                );
                            }

                            proofFound = true;
                            break;
                        } catch (err) {
                            console.log('###', err);

                            this.addCheckResult({
                                type: 'TRUST_ASSERTIONS',
                                error: `trust.assertions[${i}]: VC DID not pass verification`
                            });
                            break;
                        }

                    } else if (typeof assertion.proof === 'string') {
                        // Validate assertion.proof record as URL to the proof

                        // should be in the assertion.claim namespace
                        if (!RegExp(`^(http|https)://(www.){0,1}${assertion.claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
                            .test(assertion.proof)) {

                            this.addCheckResult({
                                type: 'TRUST_ASSERTIONS',
                                error: `trust.assertions[${i}]: claim is not in the domain namespace`
                            });
                            break;
                        }

                        // Fetch file with proof by URI
                        try {
                            assertionContent = await this.fetchFileByUri(assertion.proof);
                            assertionContent = typeof assertionContent === 'object'
                                ? JSON.stringify(assertionContent)
                                : assertionContent;
                        } catch (err) {

                            this.addCheckResult({
                                type: 'TRUST_ASSERTIONS',
                                error: `trust.assertions[${i}]: cannot get the proof`
                            });
                            break;
                        }

                        // Look for a did inside the file obtained
                        if (!RegExp(id, 'im').test(assertionContent)) {

                            this.addCheckResult({
                                type: 'TRUST_ASSERTIONS',
                                error: `trust.assertions[${i}]: DID not found in the claim`
                            });
                            break;
                        }

                        proofFound = true;
                    }

                    break;

                default:

                    // For cases where unknown assertion type has been provided
                    this.addCheckResult({
                        type: 'TRUST_ASSERTIONS',
                        error: `trust.assertions[${i}]: unknown assertion type "${assertion.type}"`
                    });
            }

            assertion.verified = proofFound;
            assertion = {
                ...assertion,
                ...(
                    whoisInfo
                        ? {
                            whois: whoisInfo
                        }
                        : {}
                )
            };
            trust.assertions[i] = assertion;

            if (proofFound) {
                isProofsFound = true;
            }
        }

        if (isProofsFound) {
            // Just mark as passed
            this.addCheckResult({
                type: 'TRUST_ASSERTIONS'
            });
        }

        this.result.trust = trust;
        return this.result.trust;
    }

    /**
     * Get the organization data
     * @memberof OrgIdResolver
     * @param {string} id The organization Id
     * @returns {Promise}
     */
    async verifyLifStake (id) {
        if (!this.lifDepositAddress) {
            return;
        }

        expect.all({ id }, {
            id: {
                type: 'string'
            }
        });

        let deposit = 0;
        let withdrawalRequest = null;
        const lifDepositContract = new this.web3.eth.Contract(
            LifDepositContract.abi,
            this.lifDepositAddress
        );

        try {
            deposit = await lifDepositContract
                .methods['balanceOf(bytes32)'](id).call();

            const requestSource = await lifDepositContract
                .methods['getWithdrawalRequest(bytes32)'](id).call();

            if (requestSource.exists) {

                withdrawalRequest = {
                    value: requestSource.value.toString(),
                    withdrawTime: requestSource.withdrawTime.toString()
                };
            }

            this.result.lifDeposit = {
                deposit,
                withdrawalRequest
            };

            if (deposit !== '0' && !withdrawalRequest) {
                // Just mark as passed
                this.addCheckResult({
                    type: 'LIF_STAKE'
                });
            } else if (deposit !== '0' && withdrawalRequest) {
                this.addCheckResult({
                    type: 'LIF_STAKE',
                    warning: 'The organization sent a withdrawal request'
                });
            }
        } catch (error) {

            this.addCheckResult({
                type: 'LIF_STAKE',
                error: error.message
            });
        }
    }

    /**
     * Fetch a file by the given URI
     * @memberof OrgIdResolver
     * @param {string} uri The file URI
     * @returns {Promise<{Object|string}>} Fetched file
     */
    async fetchFileByUri (uri) {
        expect.all({ uri }, {
            uri: {
                type: 'string'
            }
        });

        if (uri === '') {

            throw new Error(
                'Fetcher error: empty URI'
            );
        }

        let fetch;

        if (Object.keys(this.fetchMethods).length === 0) {

            throw new Error(
                'Incomplete configuration: at least one fetching method should be registered'
            );
        }

        // Try to choose a social fetch methods
        for (const f in this.fetchSocialMethods) {

            if (RegExp(this.fetchSocialMethods[f].pattern).test(uri)) {
                fetch = this.fetchSocialMethods[f].fetch;
                break;
            }
        }

        if (!fetch) {
            // Try to choose another fetching method
            for (const f in this.fetchMethods) {

                if (RegExp(this.fetchMethods[f].pattern).test(uri)) {
                    fetch = this.fetchMethods[f].fetch;
                    break;
                }
            }
        }

        if (!fetch) {

            throw new Error(
                `Fetcher error: unable to determine the fetching method for URI: ${uri}`
            );
        }

        // Trying to fetch the file
        const document = await fetch(uri);

        if (!document) {

            throw new Error(
                `Fetcher error: file not found by the given URI: ${uri}`
            );
        }

        return  document;
    }

    /**
     * Fetch a DID document by the given Id
     * @memberof OrgIdResolver
     * @param {Object} organization The organization object
     * @returns {Promise<{Object}>} DID document
     */
    async getDidDocument (organization = {}) {
        expect.all(organization, {
            orgId: {
                type: 'hash'
            },
            orgJsonUri: {
                type: 'string'
            },
            orgJsonUriBackup1: {
                type: 'string',
                required: false
            },
            orgJsonUriBackup2: {
                type: 'string',
                required: false
            }
        });

        const {
            orgId,
            orgJsonHash,
            orgJsonUri,
            orgJsonUriBackup1,
            orgJsonUriBackup2
        } = organization;

        // Resolve first settled promise
        const firstSettled = async fetches => {
            let result;
            let errors = [];

            for (const fetchPromise of fetches) {
                try {
                    result = await fetchPromise();
                    return result;
                } catch (error) {
                    errors.push(error.message);
                }
            }

            throw new Error(
                `Unable to fetch DID Document from given sources.
                    ${errors.length ? errors.join('; ') : ''}`
            );
        };

        let didDocument;

        try {
            didDocument = await firstSettled(
                [
                    orgJsonUri,
                    orgJsonUriBackup1,
                    orgJsonUriBackup2
                ].map(
                    uri => () => this.fetchFileByUri(uri)
                )
            );
        } catch (error) {

            this.addCheckResult({
                type: 'DID_DOCUMENT',
                error: error.message,
                throw: true
            });
        }

        let didObject;

        try {
            didObject = JSON.parse(didDocument);
        } catch (error) {

            this.addCheckResult({
                type: 'DID_DOCUMENT',
                error: 'Broken ORG.JSON. Unable to parse'
            });
        }

        // Comparing of the stored and actual hash
        if (makeHash(didDocument, this.web3) !== orgJsonHash) {

            this.addCheckResult({
                type: 'DID_DOCUMENT',
                error: 'Invalid DID Document hash'
            });
        }

        // DID document should containing a proper DID
        if (`did:${this.methodName}:${orgId}` !== didObject.id) {

            this.addCheckResult({
                type: 'DID_DOCUMENT',
                error: `Invalid DID Document id. Expected to be: ${orgId},
                    but actual is: ${didObject.id}`
            });
        }

        this.result.didDocument = didObject;
        return this.result.didDocument;
    }

    /**
     * Register a fetching method for social accounts
     * @memberof OrgIdResolver
     * @param {Object} methodConfig The fetching method configuration config
     * @param {Object} methodOptions The fetching method options (API key, etc)
     */
    registerSocialFetchMethod (methodConfig = {}, methodOptions = {}) {
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

        this.fetchSocialMethods[methodConfig.name] = {
            ...methodConfig,
            fetch: async uri => {
                const options = methodOptions;
                return await methodConfig.fetch(uri, options);
            }
        };
    }

    /**
     * Register a fetching method
     * @memberof OrgIdResolver
     * @param {Object} methodConfig The fetching method configuration config
     */
    registerFetchMethod (methodConfig = {}) {
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
     * Register a service method
     * @memberof OrgIdResolver
     * @param {Object} methodConfig The service method configuration config
     */
    registerService (methodConfig = {}) {
        expect.all(methodConfig, {
            name: {
                type: 'string'
            },
            fetch: {
                type: 'function'
            }
        });

        this.serviceMethods[methodConfig.name] = methodConfig;
    }

    /**
     * Get the OrgId contract instance
     * @memberof OrgIdResolver
     * @returns {Object} The OrgId contract instance
     */
    getOrgIdContract () {

        if (this.cache.orgIdContract) {
            return this.cache.orgIdContract;
        }

        this.cache.orgIdContract = new this.web3.eth.Contract(
            OrgIdContract.abi,
            this.orgIdAddress
        );
        return this.cache.orgIdContract;
    }

    /**
     * Get the organization data
     * @memberof OrgIdResolver
     * @param {string} id The organization Id
     * @returns {Promise<Object>} The OrgId contract instance
     */
    async getOrganization (id) {
        expect.all({ id }, {
            id: {
                type: 'string'
            }
        });

        if (this.cache.organization) {
            return this.cache.organization;
        }

        const orgIdContract = this.getOrgIdContract();
        const org = await orgIdContract
            .methods['getOrganization(bytes32)'](id).call();

        const {
            exists,
            orgId,
            orgJsonHash,
            orgJsonUri,
            orgJsonUriBackup1,
            orgJsonUriBackup2,
            parentOrgId,
            owner,
            director,
            isActive,
            isDirectorshipAccepted
        } = org;

        if (!exists) {

            this.addCheckResult({
                type: 'ORGID',
                error: `Organization ${id} not found`,
                throw: true
            });
        }

        if (!isActive) {

            this.addCheckResult({
                type: 'ORGID',
                warning: `Organization ${id} is disabled`
            });
        }

        if (director !== zeroAddress && !isDirectorshipAccepted) {

            this.addCheckResult({
                type: 'ORGID',
                warning: `Directorship of the organization ${id} is not accepted`
            });
        }

        // Save normalised origanization object
        this.cache.organization = {
            orgId,
            orgJsonHash,
            orgJsonUri,
            orgJsonUriBackup1,
            orgJsonUriBackup2,
            parentOrgId,
            owner,
            director,
            isActive,
            isDirectorshipAccepted
        };

        this.result.organization = this.cache.organization;
        return this.result.organization;
    }

    /**
     * Get the list of registered fetching methods names
     * @memberof OrgIdResolver
     * @returns {string[]} Registered fetching nethods names
     */
    getFetchMethods () {
        return Object.keys(this.fetchMethods);
    }

    /**
     * Adds a specific check result
     * and throws a error if this behaviour is set in the options
     * @memberof OrgIdResolver
     * @returns {string[]} Registered fetching nethods names
     */
    addCheckResult (options) {
        expect.all(options, {
            type: {
                type: 'enum',
                values: checksTypes
            },
            error: {
                type: 'string',
                required: false
            },
            warning: {
                type: 'string',
                required: false
            },
            throw: {
                type: 'boolean',
                required: false
            }
        });

        const { type, error, warning } = options;

        // Extract specific check
        this.result.checks = this.result.checks.map(
            check => {
                if (check.type === type) {
                    check = {
                        ...check,
                        ...(
                            error
                                ? {
                                    errors: [
                                        ...(check.errors || []),
                                        ...[error]
                                    ]
                                }
                                : {}
                        ),
                        ...(
                            warning
                                ? {
                                    warnings: [
                                        ...(check.warning || []),
                                        ...[warning]
                                    ]
                                }
                                : {}
                        )
                    };

                    check.passed = !check.errors ||
                        (check.errors && check.errors.length === 0);
                }

                return check;
            }
        );

        if (options.throw) {
            throw new Error(
                `${type}: ${error}`
            );
        }
    }

    spawnResolver () {
        const spawnedResolver = new OrgIdResolver({
            web3: this.web3,
            orgId: this.orgIdAddress,
            lifDeposit: this.lifDepositAddress
        });

        spawnedResolver.fetchSocialMethods = this.fetchSocialMethods;
        spawnedResolver.fetchMethods = this.fetchMethods;
        spawnedResolver.serviceMethods = this.serviceMethods;
        return spawnedResolver;
    }
}

module.exports.OrgIdResolver = OrgIdResolver;
module.exports.httpFetchMethod = httpFetchMethod;
module.exports.linkedInFetchMethod = linkedInFetchMethod;
module.exports.twitterFetchMethod = twitterFetchMethod;
module.exports.whoisService = whoisService;
module.exports.checksTypes = Object.assign({}, checksTypes);
