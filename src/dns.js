const axios = require('axios');
const expect = require('./utils/expect');

// More information about Google Public DNS JSON API can be found here:
// https://developers.google.com/speed/public-dns/docs/doh/json
let publicDnsUri = 'https://dns.google.com/resolve';

// Allowed resource types
const ResourceRecordTypes = {
    HINFO: 13,
    SPF: 99,
    TXT: 16
};
module.exports.ResourceRecordTypes = ResourceRecordTypes;

/**
 * Getting of DNS records using the Google publicDNS JSON API
 * @param {string} domain Domain name
 * @param {string} type DNS record type
 * @returns {Promise<Object[]>} Array of records
 */
module.exports.getDnsData = async (domain, type = 'TXT') => {
    expect.all({ domain, type }, {
        domain: {
            type: 'string'
        },
        type: {
            type: 'enum',
            values: Object.keys(ResourceRecordTypes)
        }
    });

    if (process && process.env && process.env.FAKE_PUBLIC_DNS_URI) {
        publicDnsUri = process.env.FAKE_PUBLIC_DNS_URI;
    }

    const response = await axios.get(
        `${publicDnsUri}?name=${domain}&type=${type}`
    );

    return response.data.Answer && Array.isArray(response.data.Answer)
        ? response.data.Answer
        : [];
};
