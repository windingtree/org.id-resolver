const { ganache, defaults } = require('../utils/ganache');
const uriSimulator = require('../utils/urisim');
const { setupContracts, setupOrganizations } = require('../utils/setup');
const { makeHash } = require('../utils/organizations');

require('chai').should();

describe('Tests environment', () => {
    let server;
    let accounts;
    let legalEntity;
    let orgUnit;

    before(async () => {
        server = await ganache(defaults);
        accounts = await web3.eth.getAccounts();
        await setupContracts();
    });

    after(() => server.close());

    beforeEach(async () => {
        const orgs = await setupOrganizations(accounts, uriSimulator);
        legalEntity = orgs.legalEntity;
        orgUnit = orgs.orgUnit;
    });

    describe('Organizations', () => {

        it('should be created legalEntity', async () => {
            (legalEntity).should.to.be.an('object').that.has.property('address');
        });

        it('should be created orgUnit', async () => {
            (orgUnit).should.to.be.an('object').that.has.property('address');
        });

        it('should have valid DID and hashes of files', async () => {
            const legalEntityUri = await legalEntity
                .methods['getOrgJsonUri()']().call();
            const legalEntityHash = await legalEntity
                .methods['getOrgJsonHash()']().call();
            const storedLegalEntityJson = uriSimulator.get(legalEntityUri);
            const legalEntityJsonString = JSON.parse(storedLegalEntityJson);
            (legalEntityJsonString).should.has.property('id', `did:orgid:${legalEntity.address}`);
            (makeHash(legalEntityJsonString)).should.equal(legalEntityHash);

            const orgUnitUri = await orgUnit
                .methods['getOrgJsonUri()']().call();
            const orgUnitHash = await orgUnit
                .methods['getOrgJsonHash()']().call();
            const storedOrgUnitJson = uriSimulator.get(orgUnitUri);
            const orgUnitJsonString = JSON.parse(storedOrgUnitJson);
            (orgUnitJsonString).should.has.property('id', `did:orgid:${orgUnit.address}`);
            (makeHash(orgUnitJsonString)).should.equal(orgUnitHash);
        });
    });
});
