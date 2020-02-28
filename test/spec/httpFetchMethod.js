const { assertFailure } = require('../utils/assertions');
const { HttpFileServer } = require('../utils/httpServer');
const httpFetchMethod = require('../../dist/http');

require('chai').should();

describe('HTTP fetch method', () => {
    let server;

    before(async () => {
        server = new HttpFileServer();
    });

    afterEach(() => server.close());

    describe('Properties', () => {

        it('should have name', async () => {
            (httpFetchMethod).should.be.an('object').
                that.has.property('name').that.is.a('string');
        });

        it('should have pattern that handle proper values', async () => {
            (httpFetchMethod).should.be.an('object').
                that.has.property('pattern').that.is.a('string');
            (RegExp(httpFetchMethod.pattern).test('http://localhost/file.txt'))
                .should.be.true;
            (RegExp(httpFetchMethod.pattern).test('https://localhost/file.txt'))
                .should.be.true;
        });

        it('should have fetch function', async () => {
            (httpFetchMethod).should.be.an('object').
                that.has.property('fetch').that.is.a('function');
        });
    });

    describe('#get', () => {
        const file = {
            content: '{"test":"test"}',
            type: 'json',
            path: 'myfile.json'
        };

        beforeEach(async () => {
            await server.addFile(file);
            await server.start();
        });

        it('should fail if unknown file has been provided', async () => {
            await assertFailure(
                httpFetchMethod.fetch(`http://localhost:${server.port}/unknown.json`),
                'Request failed with status code 404'
            );
        });

        it('should get file from server', async () => {
            const response = await httpFetchMethod.fetch(`http://localhost:${server.port}/${file.path}`);
            (JSON.stringify(response)).should.equal(file.content);
        });
    });
});
