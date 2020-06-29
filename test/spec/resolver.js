const { ganache, defaults } = require('../utils/ganache');
const { assertFailure } = require('../utils/assertions');
const {
    setupOrgId,
    setupOrganizations,
    setupHttpServer
} = require('../utils/setup');
const validJson = require('../../assets/legalEntity.json');
const invalidJson = require('../../assets/legalEntityNotValid.json');
const {
    organizationHash: unknownId
} = require('../utils/constants');
const { toWeiEther } = require('../utils/common');
const {
    OrgIdResolver,
    httpFetchMethod
} = require('../../dist');
const { ResourceRecordTypes } = require('../../dist/dns');
const {
    lifTokenAtAddress,
    distributeLifTokens
} = require('../utils/lif');
const { toChecksObject } = require('../utils/resolver');

require('chai').should();

describe('Resolver', () => {

    let orgIdOwner;
    let legalEntityOwner;
    let orgUnitOwner;

    let server;
    let fileServer;
    let legalEntity;
    let legalEntityInvalidJson;
    let resolver;
    let orgId;

    before(async () => {
        server = await ganache(defaults);
        const accounts = await web3.eth.getAccounts();
        fileServer = await setupHttpServer();
        orgIdOwner = accounts[1];
        legalEntityOwner = accounts[2];
        orgUnitOwner = accounts[3];
    });

    after(() => {
        server.close();
        fileServer.close();
    });

    beforeEach(async () => {
        orgId = await setupOrgId(orgIdOwner);

        const orgs = await setupOrganizations(
            orgId,
            legalEntityOwner,
            orgUnitOwner
        );
        legalEntity = orgs.legalEntity;

        const orgsInvalidJson = await setupOrganizations(
            orgId,
            legalEntityOwner,
            orgUnitOwner,
            false,
            false,
            false,
            invalidJson
        );
        legalEntityInvalidJson = orgsInvalidJson.legalEntity;

        resolver = new OrgIdResolver({ web3, orgId: orgId.address });
        resolver.registerFetchMethod(httpFetchMethod);
    });

    describe('Constructor', () => {

        it('should instantiate an object with proper methods and properties', async () => {
            (resolver).should.to.be.an('object');
            (resolver).should.to.be.an.instanceof(OrgIdResolver);
            (resolver).should.has.property('resolve').that.to.be.an('function');
            (resolver).should.has.property('registerFetchMethod').that.to.be.an('function');
            (resolver).should.has.property('getFetchMethods').that.to.be.an('function');
        });
    });

    describe('#registerFetchMethod', () => {

        it('should fail if wrong configuration has been provided', async () => {
            await assertFailure(
                () => resolver.registerFetchMethod({
                    name: 'wrong'
                }),
                'property not found'
            );
            await assertFailure(
                () => resolver.registerFetchMethod({
                    name: 'wrong',
                    pattern: 1000
                }),
                'wrong type'
            );
            await assertFailure(
                () => resolver.registerFetchMethod({
                    name: 'wrong',
                    pattern: '^http',
                    fetch: 'not a function'
                }),
                'wrong type'
            );
        });

        it('should register a fetch method', async () => {
            const resolver = new OrgIdResolver({
                web3,
                orgId: orgId.address
            });
            resolver.registerFetchMethod(httpFetchMethod);
            (resolver.getFetchMethods()).should.include(httpFetchMethod.name);
        });
    });

    describe('#getFetchMethods', () => {

        it('should return empty array if no methods has been registered', async () => {
            const resolver = new OrgIdResolver({
                web3,
                orgId: orgId.address
            });
            (resolver.getFetchMethods().length).should.equal(0);
        });

        it('should return a registerd method', async () => {
            const resolver = new OrgIdResolver({
                web3,
                orgId: orgId.address
            });
            resolver.registerFetchMethod(httpFetchMethod);
            (resolver.getFetchMethods()).should.include(httpFetchMethod.name);
        });
    });

    describe('#fetchFileByUri', () => {
        const fakeFetchMethod = {
            name: 'fake',
            pattern: 'fake://',
            fetch: () => null
        };
        const content = 'content';
        let resolver;
        let uri;
        
        beforeEach(async () => {
            resolver = new OrgIdResolver({
                web3,
                orgId: orgId.address
            });
            uri = `http://localhost:${global.httpFileServer.port}/file.txt`;
            await global.httpFileServer.addFile({
                content,
                type: 'txt',
                path: 'file.txt'
            });
        });

        it('should fail if uri not a string', async () => {
            await assertFailure(
                resolver.fetchFileByUri(undefined),
                'property not found'
            );
        });

        it('should fail if fetching methods not been registered', async () => {
            await assertFailure(
                resolver.fetchFileByUri(uri),
                'At least one fetching method should be registered'
            );
        });

        it('should fail if registered method not suitable for the given uri', async () => {
            resolver.registerFetchMethod(fakeFetchMethod);
            await assertFailure(
                resolver.fetchFileByUri(uri),
                'Unable to determine the fetching method for uri'
            );
        });

        it('should fetch content by the uri', async () => {
            resolver.registerFetchMethod(fakeFetchMethod);
            resolver.registerFetchMethod(httpFetchMethod);
            (await resolver.fetchFileByUri(uri)).should.equal(content);
        });
    });

    describe('#validateDidSyntax', () => {

        it('should fail if did not been provided', async () => {
            await assertFailure(
                resolver.validateDidSyntax(undefined),
                'property not found'
            );
        });

        it('should fail if did with wrong prefix been provided', async () => {
            await assertFailure(
                resolver.validateDidSyntax('dude:orgid:0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a4acdc1b06a0f21f3dba8868dee2c99'),
                'Invalid DID prefix'
            );
        });

        it('should fail if did with wrong method been provided', async () => {
            await assertFailure(
                resolver.validateDidSyntax('did:unknown:0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a4acdc1b06a0f21f3dba8868dee2c99'),
                'Unsupported DID method'
            );
        });

        it('should fail if did with wrong id been provided', async () => {
            await assertFailure(
                resolver.validateDidSyntax('did:orgid:0xd1e15bcea4bbf5fa55e36'),
                'Invalid method specific id'
            );
        });

        it('should return method specific id', async () => {
            const id = await resolver.validateDidSyntax('did:orgid:0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a4acdc1b06a0f21f3dba8868dee2c99');
            (id).should.equal('0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a4acdc1b06a0f21f3dba8868dee2c99');
        });
    });

    describe('#validateDidDocument', () => {
        it('should fail if did document not been provided', async () => {
            await assertFailure(
                resolver.validateDidDocument(undefined),
                'property not found'
            );
        });

        it('should return warnings if document not been valid', async () => {
            const result = await resolver.validateDidDocument(invalidJson);
            (result).should.be.false;
            const checks = toChecksObject(resolver.result.checks);
            (checks.DID_DOCUMENT.passed).should.be.true;
            (checks.DID_DOCUMENT.warnings).should.be.an('array').that.is.not.empty;
        });

        it('should not warnings errors if document has been valid', async () => {
            const result = await resolver.validateDidDocument(validJson);
            (result).should.be.true;
            const checks = toChecksObject(resolver.result.checks);
            (checks.DID_DOCUMENT.passed).should.be.true;
            (checks.DID_DOCUMENT.warnings).should.be.an('array').that.is.empty;
        });
    });

    describe('#verifyTrustRecords', () => {
        let didDocument;

        beforeEach(async () => {
            const organization = await resolver.getOrganization(legalEntity);
            didDocument = await resolver.getDidDocument(organization);
        });

        it('should return an error if dns proof value not in the allowed range', async () => {
            didDocument.trust.assertions[0].proof = 'UNKNOWN';
            await resolver.verifyTrustRecords(didDocument);
            const checks = toChecksObject(resolver.result.checks);
            (checks.TRUST_ASSERTIONS.passed).should.be.false;
            (checks.TRUST_ASSERTIONS.errors).should.be.an('array').that.is.not.empty;
            (checks.TRUST_ASSERTIONS.errors[0]).should.contain(
                `not in the range of [${Object.keys(ResourceRecordTypes).join(',')}]`
            );
        });

        it('should return an error if dns proof not found', async () => {
            didDocument.trust.assertions[0].proof = 'HINFO';
            await resolver.verifyTrustRecords(didDocument);
            const checks = toChecksObject(resolver.result.checks);
            (checks.TRUST_ASSERTIONS.passed).should.be.false;
            (checks.TRUST_ASSERTIONS.errors).should.be.an('array').that.is.not.empty;
            (checks.TRUST_ASSERTIONS.errors[0]).should.contain(
                'cannot get the proof'
            );
        });

        it('should return an error if getting the dns proof is not possible', async () => {
            didDocument.trust.assertions[0].claim = 'UNKNOWN';
            await resolver.verifyTrustRecords(didDocument);
            const checks = toChecksObject(resolver.result.checks);
            (checks.TRUST_ASSERTIONS.passed).should.be.false;
            (checks.TRUST_ASSERTIONS.errors).should.be.an('array').that.is.not.empty;
            (checks.TRUST_ASSERTIONS.errors[0]).should.contain(
                'cannot get the proof'
            );
        });

        it('should not return errors if trust sections not containing assertions', async () => {
            delete didDocument.trust.assertions;
            await resolver.verifyTrustRecords(didDocument);
            const checks = toChecksObject(resolver.result.checks);
            (checks.TRUST_ASSERTIONS.passed).should.be.false;
            (checks.TRUST_ASSERTIONS.warnings).should.be.an('array').that.is.empty;
            (checks.TRUST_ASSERTIONS.errors).should.be.an('array').that.is.empty;
        });

        it('should verify trust assertions', async () => {
            await resolver.verifyTrustRecords(didDocument);
            const checks = toChecksObject(resolver.result.checks);
            (checks.TRUST_ASSERTIONS.passed).should.be.true;
            (checks.TRUST_ASSERTIONS.warnings).should.be.an('array').that.is.empty;
            (checks.TRUST_ASSERTIONS.errors).should.be.an('array').that.is.empty;
        });
    });

    describe('#getDidDocument', () => {
        let organization;

        beforeEach(async () => {
            organization = await resolver.getOrganization(legalEntity);
        });

        it('should fail if organization without orgId has been provided', async () => {
            organization.orgId = undefined;
            await assertFailure(
                resolver.getDidDocument(organization),
                'The "orgId" property not found'
            );
        });

        it('should fail if organization with wrong orgId has been provided', async () => {
            organization.orgId = 'ZZZZZZ';
            await assertFailure(
                resolver.getDidDocument(organization),
                'Ethereum tx hash is required as value for the property: "orgId"'
            );
        });

        it('should fail if organization without orgJsonUri has been provided', async () => {
            organization.orgJsonUri = undefined;
            await assertFailure(
                resolver.getDidDocument(organization),
                'The "orgJsonUri" property not found'
            );
        });

        it('should fail if hash of obtained content are not consistent', async () => {
            organization.orgJsonHash = 'wronghash';
            await resolver.getDidDocument(organization);
            const checks = toChecksObject(resolver.result.checks);
            (checks.DID_DOCUMENT.passed).should.be.false;
            (checks.DID_DOCUMENT.errors).should.be.an('array')
                .that.is.not.empty;
        });

        it('should fail if did document contains different id', async () => {
            const brokenOrgs = await setupOrganizations(
                orgId,
                legalEntityOwner,
                orgUnitOwner,
                false,
                false,
                unknownId
            );
            const brokenLegalEntity = brokenOrgs.legalEntity;
            const organization = await resolver.getOrganization(brokenLegalEntity);
            organization.orgId = legalEntityInvalidJson;
            await resolver.getDidDocument(organization);
            const checks = toChecksObject(resolver.result.checks);
            (checks.DID_DOCUMENT.passed).should.be.false;
            (checks.DID_DOCUMENT.errors).should.be.an('array')
                .that.is.not.empty;
        });

        it('should return didDocument', async () => {
            const document = await resolver.getDidDocument(organization);
            (document).should.be.an('object').that.include.property('id');
        });
    });

    describe.skip('#getLifStakeStatus', () => {
        let lifToken;

        beforeEach(async () => {
            const tokenAddress = await orgId
                .methods['getLifTokenAddress()']().call();
            lifToken = await lifTokenAtAddress(tokenAddress);
            await distributeLifTokens(
                lifToken,
                orgIdOwner,
                '2000',
                [ legalEntityOwner ]
            );
            await lifToken
                .methods['approve(address,uint256)'](
                    orgId.address,
                    toWeiEther('1000')
                )
                .send({ from: legalEntityOwner });
            await orgId
                .methods['addDeposit(bytes32,uint256)'](
                    legalEntity,
                    toWeiEther('1000')
                )
                .send({ from: legalEntityOwner });
        });

        it('should fail if id not been provided', async () => {
            await assertFailure(
                resolver.getLifStakeStatus(undefined)
            );
        });

        it('should fail if unknown id has been provided', async () => {
            await assertFailure(
                resolver.getLifStakeStatus(unknownId)
            );
        });

        it('should return Lif stake status', async () => {
            const info = await resolver.getLifStakeStatus(legalEntity);
            (info).should.be.an('object');
            (info).should.has.property('deposit');
            (info).should.has.property('withdrawalRequest');
        });
    });

    describe('#resolve', () => {
        // let lifToken;

        // beforeEach(async () => {
        //     const tokenAddress = await orgId
        //         .methods['getLifTokenAddress()']().call();
        //     lifToken = await lifTokenAtAddress(tokenAddress);
        //     await distributeLifTokens(
        //         lifToken,
        //         orgIdOwner,
        //         '2000',
        //         [ legalEntityOwner ]
        //     );
        //     await lifToken
        //         .methods['approve(address,uint256)'](
        //             orgId.address,
        //             toWeiEther('1000')
        //         )
        //         .send({ from: legalEntityOwner });
        //     await orgId
        //         .methods['addDeposit(bytes32,uint256)'](
        //             legalEntity,
        //             toWeiEther('1000')
        //         )
        //         .send({ from: legalEntityOwner });
        // });

        it('should fail if did not been provided', async () => {
            await assertFailure(
                resolver.resolve(undefined),
                'property not found'
            );
        });

        it('should resolve a did', async () => {
            const result = await resolver.resolve(`did:orgid:${legalEntity}`);
            (result).should.be.an('object');
        });

        it('should resolve a did with errors in the document', async () => {
            const result = await resolver.resolve(`did:orgid:${legalEntityInvalidJson}`);
            (result.didDocument).should.be.an('object');
            const checks = toChecksObject(resolver.result.checks);
            console.log('@@@', checks);
            (checks.DID_DOCUMENT.passed).should.be.true;
            (checks.DID_DOCUMENT.warnings).should.be.an('array')
                .that.is.not.empty;
        });

        it('should resolve a did from the http uri', async () => {
            const result = await resolver.resolve(`did:orgid:${legalEntity}`);
            (result).should.be.an('object');
        });
    });
});
