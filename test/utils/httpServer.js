const http = require('http');
const url = require('url');
const expect = require('../../src/utils/expect');

let port = 10000;

class HttpFileServer {

    constructor() {
        this.port = port++;
        this.mime = {
            'html': 'text/html',
            'txt': 'text/plain',
            'json': 'application/json'
        };
        this.files = {};
        this.server = null;

    }

    async start() {
        this.server = http.createServer(this.requestHandler.bind(this));
        return await new Promise(
            (resolve, reject) => this.server.listen(
                this.port, err => err
                    ? reject(err)
                    : resolve(this.server)
            )
        );
    }

    async close() {
        if (this.server) {
            this.server.close();
        }
        this.server = null;
    }

    requestHandler(request, response) {
        const link = url.parse(request.url);
        const path = link.path.replace(/^\//, '');

        if (!this.files[path]) {
            response.statusCode = 404;
            response.statusMessage = http.STATUS_CODES[response.statusCode];
            response.end();
            return;
        }

        response.writeHead(200, {
            'Content-Type': this.mime[this.files[path].type]
        });
        response.end(this.files[path].content);
    }

    async addFile(file) {
        expect.all(file, {
            content: {
                type: 'string'
            },
            type: {
                type: 'enum',
                values: ['html', 'txt', 'json']
            },
            path: {
                type: 'string'
            }
        });

        file = Object.assign({}, file);
        this.files[file.path] = file;
        return this.files[file.path];
    }

    async removeFile(path) {
        expect.all({ path }, {
            path: {
                type: 'string'
            }
        });

        if (!this.files[path]) {
            throw new Error(`File not found: ${path}`);
        }

        delete this.files[path];
    }
}

module.exports.HttpFileServer = HttpFileServer;
