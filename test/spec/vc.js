const { ganache, defaults } = require('../utils/ganache');
const {
    setupOrgId,
    setupOrganizations,
    setupHttpServer
} = require('../utils/setup');
const {
    OrgIdResolver,
    httpFetchMethod
} = require('../../dist');
const { toChecksObject } = require('../utils/resolver');

require('chai').should();

describe('VC', () => {
    let server;
    let fileServer;
    let orgIdOwner;
    let legalEntityOwner;

    before(async () => {
        server = await ganache(defaults);
        const accounts = await web3.eth.getAccounts();
        fileServer = await setupHttpServer();
        orgIdOwner = accounts[1];
        legalEntityOwner = accounts[2];
    });

    after(() => {
        server.close();
        fileServer.close();
    });

    describe('#validateVc', () => {
        let orgId;
        let legalEntity;
        let resolver;

        beforeEach(async () => {
            orgId = await setupOrgId(orgIdOwner);
            const orgs = await setupOrganizations(
                orgId,
                legalEntityOwner
            );
            legalEntity = orgs.legalEntity;

            resolver = new OrgIdResolver({
                web3,
                orgId: orgId.address
            });
            resolver.registerFetchMethod(httpFetchMethod);
        });

        it('should verify trust assertion which uses a VC as a proof', async () => {
            const result = await resolver.resolve(`did:orgid:${legalEntity}`);
            const checks = toChecksObject(result.checks);
            (checks.TRUST_ASSERTIONS.passed).should.be.true;
        });
    });
});
