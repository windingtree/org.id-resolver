const { getDnsData } = require('../../src/dns');
const { setupFakePublicDNS, addRecord } = require('../utils/fakePublicDns');

require('chai').should();

describe('Public DNS tester', () => {
    let fakeDns;
    
    before(async () => {
        fakeDns = await setupFakePublicDNS();
    });

    after(() => {
        fakeDns.close();
    });

    describe('#getDnsData', () => {
        
        it('should get the DNS record', async () => {
            const domain = 'example.com';
            const did = 'did:orgid:0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a4acdc1b06a0f21f3dba8868dee2c99';
            const type = 'TXT';

            await addRecord(
                fakeDns,
                domain,
                did,
                type
            );

            const response = await getDnsData(domain, type);
            (response).should.be.an('array').that.is.not.empty;
            (response[0]).should.be.an('object').that.has.property('name').to.match(RegExp(domain));
            (response[0]).should.be.an('object').that.has.property('data').to.match(RegExp(did));
        });
    });
});
