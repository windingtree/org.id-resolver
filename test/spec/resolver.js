const { ganache, defaults } = require('../utils/ganache');
const uriSimulator = require('../utils/urisim');
const { assertFailure } = require('../utils/assertions');
const { setupContracts, setupOrganizations } = require('../utils/setup');
const { makeHash } = require('../utils/organizations');
const {
    OrgIdResolver
} = require('../../src');

require('chai').should();

describe('Resolver', () => {
    let server;
    let accounts;
    let legalEntity;
    let orgUnit;
    let resolver;

    before(async () => {
        server = await ganache(defaults);
        accounts = await web3.eth.getAccounts();
        await setupContracts();
        resolver = new OrgIdResolver({
            web3
        });
        resolver.registerFetchMethod(uriSimulator.fetchMethod());
    });

    after(() => server.close());

    beforeEach(async () => {
        const orgs = await setupOrganizations(accounts, uriSimulator);
        legalEntity = orgs.legalEntity;
        orgUnit = orgs.orgUnit;
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
                new Promise(() => resolver.registerFetchMethod({
                    name: 'wrong'
                })),
                'property not found'
            );
            await assertFailure(
                new Promise(() => resolver.registerFetchMethod({
                    name: 'wrong',
                    pattern: 1000
                })),
                'wrong type'
            );
            await assertFailure(
                new Promise(() => resolver.registerFetchMethod({
                    name: 'wrong',
                    pattern: '^http',
                    fetch: 'not a function'
                })),
                'wrong type'
            );
        });

        it('should register a custom fetch method', async () => {
            const resolver = new OrgIdResolver({
                web3
            });
            const methodConfig = uriSimulator.fetchMethod();
            resolver.registerFetchMethod(methodConfig);
            (resolver.getFetchMethods()).should.include(methodConfig.name);
        });
    });

    describe('#getFetchMethods', () => {

        it('should return empty array if no methods has been registered', async () => {
            const resolver = new OrgIdResolver({
                web3
            });
            (resolver.getFetchMethods().length).should.equal(0);
        });

        it('should return a registerd method', async () => {
            const resolver = new OrgIdResolver({
                web3
            });
            const methodConfig = uriSimulator.fetchMethod();
            resolver.registerFetchMethod(methodConfig);
            (resolver.getFetchMethods()).should.include(methodConfig.name);
        });
    });

    describe('#resolve', () => {});
});
