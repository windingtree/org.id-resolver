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
    notExistedAddress,
    organizationHash: unknownId
} = require('../utils/constants');
const {
    OrgIdResolver,
    httpFetchMethod
} = require('../../src');
const { ResourceRecordTypes } = require('../../src/dns');

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
                resolver.registerFetchMethod({
                    name: 'wrong'
                }),
                'property not found'
            );
            await assertFailure(
                resolver.registerFetchMethod({
                    name: 'wrong',
                    pattern: 1000
                }),
                'wrong type'
            );
            await assertFailure(
                resolver.registerFetchMethod({
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

        it('should return errors if document not been valid', async () => {
            const result = await resolver.validateDidDocument(invalidJson);
            (result).should.be.false;
            (resolver.result.errors).should.be.an('array').that.is.not.empty;
        });

        it('should not return errors if document has been valid', async () => {
            const result = await resolver.validateDidDocument(validJson);
            (result).should.be.true;
            (resolver.result.errors).should.be.an('array').that.is.empty;
        });
    });

    describe('#verifyTrustRecords', () => {
        let didDocument;

        beforeEach(async () => {
            didDocument = await resolver.getDidDocumentUri(legalEntity);
        });

        it('should return an error if dns proof value not in the allowed range', async () => {
            didDocument.trust.assertions[0].proof = 'UNKNOWN';
            await resolver.verifyTrustRecords(didDocument);
            (resolver.result.errors).should.be.an('array').that.is.not.empty;
            (resolver.result.errors[0]).should.equal(
                `Failed assertion trust.assertions[0]: proof value "UNKNOWN" not in the range of [${Object.keys(ResourceRecordTypes).join(',')}]`
            );
        });

        it('should return an error if dns proof not found', async () => {
            didDocument.trust.assertions[0].proof = 'HINFO';
            await resolver.verifyTrustRecords(didDocument);
            (resolver.result.errors).should.be.an('array').that.is.not.empty;
            (resolver.result.errors[0]).should.equal(
                'Failed assertion trust.assertions[0]: Cannot get the proof'
            );
        });

        it('should return an error if getting the dns proof is not possible', async () => {
            didDocument.trust.assertions[0].claim = 'UNKNOWN';
            await resolver.verifyTrustRecords(didDocument);
            (resolver.result.errors).should.be.an('array').that.is.not.empty;
            (resolver.result.errors[0]).should.equal(
                'Failed assertion trust.assertions[0]: Cannot get the proof'
            );
        });

        it('should not return errors if trust sections not containing assertions', async () => {
            delete didDocument.trust.assertions;
            await resolver.verifyTrustRecords(didDocument);
            (resolver.result.errors).should.be.an('array').that.is.empty;
        });

        it('should verify trust assertions', async () => {
            await resolver.verifyTrustRecords(didDocument);
            (resolver.result.errors).should.be.an('array').that.is.empty;
        });
    });

    describe('#getDidDocumentUri', () => {

        it('should fail if wrong orgId address has been provided during initialization', async () => {
            const resolver = new OrgIdResolver({
                web3,
                orgId: notExistedAddress
            });
            await assertFailure(
                resolver.getDidDocumentUri(unknownId),
                'Cannot create instance of OrgId'
            );
        });

        it('should fail if unknown organization id has been provided', async () => {
            await assertFailure(
                resolver.getDidDocumentUri(unknownId),
                'OrgId: Organization with given orgId not found'
            );
        });

        it('should fail if orgId contains wrong uri', async () => {
            const brokenOrgs = await setupOrganizations(
                orgId,
                legalEntityOwner,
                orgUnitOwner,
                `${process.env.FAKE_WEB_SERVER_URI}/fake.txt`
            );
            const brokenLegalEntity = brokenOrgs.legalEntity;
            await assertFailure(
                resolver.getDidDocumentUri(brokenLegalEntity),
                'Request failed with status code 404'
            );
        });

        it('should fail if hash of obtained content are not consistent', async () => {
            const brokenOrgs = await setupOrganizations(
                orgId,
                legalEntityOwner,
                orgUnitOwner,
                false,
                unknownId
            );
            const brokenLegalEntity = brokenOrgs.legalEntity;
            await assertFailure(
                resolver.getDidDocumentUri(brokenLegalEntity),
                'Invalid DID Document hash'
            );
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
            await assertFailure(
                resolver.getDidDocumentUri(brokenLegalEntity),
                'Invalid DID Document id'
            );
        });

        it('should return didDocument', async () => {
            const document = await resolver.getDidDocumentUri(legalEntity);
            (document).should.be.an('object').that.include.property('id');
        });
    });

    describe('#resolve', () => {

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
            (result).should.be.an('object')
                .that.include.property('errors')
                .that.an('array')
                .that.is.not.empty;
        });

        it('should resolve a did from the http uri', async () => {
            const result = await resolver.resolve(`did:orgid:${legalEntity}`);
            (result).should.be.an('object');
        });
    });
});
