const { assertFailure } = require('../utils/assertions');
const uriSimulator = require('../utils/urisim');

require('chai').should();

describe('URI simulator', () => {

    describe('static #uid', () => {

        it('should return valid ids', async () => {
            const pattern = new RegExp(uriSimulator.fetchMethod().pattern);
            const uid1 = uriSimulator.UriSimulator.uid;
            (uid1).should.to.match(pattern);
        });

        it('should return unique ids', async () => {
            const uid1 = uriSimulator.UriSimulator.uid;
            const uid2 = uriSimulator.UriSimulator.uid;
            (uid1).should.not.equal(uid2);
        });
    });

    describe('#set', () => {
        
        it('should fail to set undefined source', async () => {
            await assertFailure(
                uriSimulator.set(),
                'undefined resource source'
            );
        });

        it('should save resource', async () => {
            const source = 'aaa';
            const uri = await uriSimulator.set(source);
            (await uriSimulator.get(uri)).should.equal(source);
        });
    });

    describe('#get', () => {

        it('should return undefined if wrong uri has been provided', async () => {
            (typeof (await uriSimulator.get('asdas'))).should.equal('undefined');
        });

        it('should return existed resurce by uid', async () => {
            const source = 'aaa';
            const uri = await uriSimulator.set(source);
            (await uriSimulator.get(uri)).should.equal(source);
        });
    });

    describe('#update', () => {
        let source = 'aaa';
        let uri;

        beforeEach(async () => {
            source = 'aaa';
            uri = await uriSimulator.set(source);
        });

        it('should fail if unknown uri has been provided', async () => {
            await assertFailure(
                uriSimulator.update('unknown'),
                'unknown resource'
            );
        });

        it('shoudl update existed resource', async () => {
            const newSource = 'zzz';
            await uriSimulator.set(source);
            (await uriSimulator.update(uri, newSource)).should.equal(uri);
            (await uriSimulator.get(uri)).should.equal(newSource);
        });
    });

    describe('#fetchMethod', () => {
        
        it('should return fetch method config', async () => {
            const methodConfig = uriSimulator.fetchMethod();
            (methodConfig).should.to.be.an('object');
            (methodConfig).should.has.property('name').that.to.be.an('string');
            (methodConfig).should.has.property('pattern').that.to.be.an('string');
            (methodConfig).should.has.property('fetch').that.to.be.an('function');
        });
    });
});
