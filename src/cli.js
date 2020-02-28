#!/usr/bin/env node
const Web3 = require('web3');
const { OrgIdResolver, httpFetchMethod } = require('../src');
const { parseArgv } = require('./utils/cli');

let web3Endpoint;
let orgIdAddress;

try {
    const keys = require('../keys.json');
    web3Endpoint = keys.endpoint;
    orgIdAddress = keys.orgId;
    
} catch (err) {}// eslint-disable-line no-empty

const main = async () => {
    const args = parseArgv(process.argv, 0);

    if (args.endpoint) {
        web3Endpoint = args.endpoint;
    }

    if (!web3Endpoint) {
        throw new Error(
            'Web3 endpoint not defined neither in the keys.json or command line "endpoint" option'
        );
    }

    if (args.orgid) {
        orgIdAddress = args.orgid;
    }

    if (!orgIdAddress) {
        throw new Error(
            'OrgId instance address not defined neither in the keys.json or command line "orgid" option'
        );
    }

    const web3 = new Web3(web3Endpoint);
    const resolver = new OrgIdResolver({
        web3,
        orgId: orgIdAddress
    });
    resolver.registerFetchMethod(httpFetchMethod);

    if (!args.did) {
        throw new Error(
            'DID have to be provided with command: "did=<DID>"'
        );
    }
    
    console.log(`Resolving of the DID: ${args.did}`);
    const result = await resolver.resolve(args.did);
    console.log(JSON.stringify(result, null, 2));
};

main().catch(console.error);
