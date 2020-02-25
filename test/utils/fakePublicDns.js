const { HttpFileServer } = require('./httpServer');
const { ResourceRecordTypes } = require('../../src/dns');

// Fake Google public DNS API response
const publicDnsResponse = {
    'Status': 0,
    'TC': false,
    'RD': true,
    'RA': true,
    'AD': false,
    'CD': false,
    'Question': [{
        'name': 'windingtree.com.',
        'type': 16
    }],
    'Answer': [
        {
            'name': 'windingtree.com.',
            'type': 16,
            'TTL': 299,
            'data': '\'orgid=0xE61d952f077EfF0C022cC0FEC841059DA2289526\''
        }
    ],
    'Comment': 'Response from 2606:4700:50::adf5:3acf.'
};
/**
 * Creates fake public DNS API server and injects its URI into an environment
 * @returns {Promise<Object>} HttpFileServer instance
 */
const setupFakePublicDNS = async () => {
    const fileServer = new HttpFileServer();
    await fileServer.start();
    process.env.FAKE_PUBLIC_DNS_URI =
        `http://localhost:${fileServer.port}/resolve`;
    return fileServer;
};
module.exports.setupFakePublicDNS = setupFakePublicDNS;

/**
 * Adds a new record to the fake public DNS
 * @param {Object} server HttpFileServer instance
 * @param {string} domain Domain name
 * @param {string} did Unique Id
 * @param {string} type DNS record type
 * @returns {Promise<{Object}>} File config
 */
module.exports.addRecord = async (
    server,
    domain,
    did,
    type
) => {
    const response = Object.assign(
        {},
        publicDnsResponse,
        {
            Question: [
                {
                    'name': `${domain}.`,
                    'type': ResourceRecordTypes[type]
                }
            ],
            Answer: [
                {
                    'name': `${domain}.`,
                    'type': ResourceRecordTypes[type],
                    'TTL': 299,
                    'data': `'orgid=${did}'`
                }
            ]
        }
    );
    return await server.addFile({
        content: JSON.stringify(response),
        type: 'json',
        path: `resolve?name=${domain}&type=${type}`
    });
};
