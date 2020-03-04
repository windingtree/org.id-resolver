process.env.TESTING = true;
const { ganache, defaults } = require('../utils/ganache');
const { assertFailure } = require('../utils/assertions');
const { setupOrgId } = require('../utils/setup');
const cli = require('../../src/cli');

require('chai').should();

describe('Resolver CLI', () => {

    let defaultArgv;
    let orgIdOwner;

    let server;
    let orgId;

    before(async () => {
        server = await ganache(defaults);
        const accounts = await web3.eth.getAccounts();
        orgIdOwner = accounts[1];
    });

    after(() => {
        server.close();
    });

    beforeEach(async () => {
        orgId = await setupOrgId(orgIdOwner);
        defaultArgv = [
            '/home/[user]/.nvm/versions/node/v10.19.0/bin/node',
            '/home/[user]/dev/orgid-resolver-remote/src/cli.js',
            'did=did:orgid:0x6d98103810d50b3711ea81c187a48245109ba094644ddbc54f8d0c4ca772e8aa',
            `orgid=${orgId.address}`
        ];
    });

    it('should fail if did has not been provided', async () => {
        defaultArgv = defaultArgv.filter(d => d !== defaultArgv[2]);
        defaultArgv.push('endpoint=nonfake');
        await assertFailure(cli(defaultArgv), 'DID have to be provided');
    });

    it('should fail if web3 endpoint has not been provided', async () => {
        defaultArgv.push('endpoint=fake');
        await assertFailure(cli(defaultArgv), 'Web3 endpoint not defined');
    });

    it('should fail if orgid address has not been provided', async () => {
        defaultArgv.push('orgid=fake');
        defaultArgv.push('endpoint=nonfake');
        await assertFailure(cli(defaultArgv), 'OrgId instance address not defined');
    });

    it('should resolve a DID', async () => {
        defaultArgv.push('endpoint=nonfake');
        await cli(defaultArgv);
    });
});
