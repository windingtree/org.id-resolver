const axios = require('axios');
const { assertFailure } = require('../utils/assertions');
const { HttpFileServer } = require('../utils/httpServer');

require('chai').should();

describe('HTTP fetch method', () => {
    let server;

    before(async () => {
        server = new HttpFileServer();
    });

    afterEach(() => server.close());

    describe('#addFile', () => {

        it('should fail if content not provided or having the wrong type', async () => {
            await assertFailure(
                server.addFile({
                    type: 'json',
                    path: 'myfile.json'
                }),
                'property not found'
            );
            await assertFailure(
                server.addFile({
                    content: { test: 'test' },
                    type: 'json',
                    path: 'myfile.json'
                }),
                'property value has a wrong type'
            );
        });

        it('should fail if type not provided ot having the wrong type', async () => {
            await assertFailure(
                server.addFile({
                    content: '{"test":"test"}',
                    path: 'myfile.json'
                }),
                'property not found'
            );
            await assertFailure(
                server.addFile({
                    content: '{"test":"test"}',
                    type: 'object',
                    path: 'myfile.json'
                }),
                'property is not valid'
            );
        });

        it('should fail if path not provided', async () => {
            await assertFailure(
                server.addFile({
                    content: '{"test":"test"}',
                    type: 'json'
                }),
                'property not found'
            );
        });

        it('should add file', async () => {
            const fileToAdd = {
                content: '{"test":"test"}',
                type: 'json',
                path: 'myfile.json'
            };
            const file = await server.addFile(fileToAdd);
            (file).should.be.an('object').that.has.property('content')
                .that.equal(fileToAdd.content);
            (file).should.be.an('object').that.has.property('type')
                .that.equal(fileToAdd.type);
            (file).should.be.an('object').that.has.property('path')
                .that.equal(fileToAdd.path);
        });
    });

    describe('#removeFile', () => {
        const file = {
            content: '{"test":"test"}',
            type: 'json',
            path: 'myfile.json'
        };

        beforeEach(async () => await server.addFile(file));

        it('should fail if path not provided', async () => {
            await assertFailure(
                server.removeFile(undefined),
                'property not found'
            );
        });

        it('should fail if file not found', async () => {
            await assertFailure(
                server.removeFile('unknown/file'),
                'File not found'
            );
        });

        it('should remove file', async () => {
            const count = Object.keys(server.files).length;
            server.removeFile('myfile.json');
            (Object.keys(server.files).length).should.equal(count - 1);
        });
    });

    describe('#start', () => {

        it('should start a server', async () => {
            (server).should.be.an('object')
                .that.has.property('server').that.is.null;
            const serv = await server.start();
            (serv).should.be.an('object');
        });
    });

    describe('#close', () => {

        it('should close the server', async () => {
            const serv = await server.start();
            (serv).should.be.an('object');
            server.close();
            (server).should.be.an('object')
                .that.has.property('server').that.is.null;
        });
    });

    describe('Http requests', () => {
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
                axios.get(`http://localhost:${server.port}/unknown.json`),
                'Request failed with status code 404'
            );
        });

        it('should get file from server', async () => {
            const response = await axios.get(`http://localhost:${server.port}/${file.path}`);
            (JSON.stringify(response.data)).should.equal(file.content);
        });
    });

});
