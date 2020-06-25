#!/usr/bin/env node
const Web3 = require('web3');
const { addresses } = require('@windingtree/org.id');
const { addresses: lifDepositAddresses } = require('@windingtree/org.id-lif-deposit');
const { OrgIdResolver, httpFetchMethod } = require('../src');
const { parseArgv } = require('./utils/cli');

let web3Endpoint;

// Default orgId address, can be overrided by orgid command line property
let orgIdAddress = addresses.ropsten;
let lifDepositAddress = lifDepositAddresses.ropsten;

if (!process.env.TESTING) {

    try {
        const keys = require('../keys.json');
        web3Endpoint = keys.endpoint;
    } catch (err) {}// eslint-disable-line no-empty
}

const main = async (options) => {
    const args = parseArgv(options || process.argv, 0);

    if (args.endpoint) {
        web3Endpoint = args.endpoint;
    }

    if (!web3Endpoint || web3Endpoint === 'fake') {
        throw new Error(
            'Web3 endpoint not defined neither in the keys.json or command line "endpoint" option'
        );
    }

    if (args.orgid) {
        orgIdAddress = args.orgid;
    }

    if (args.lifDeposit) {
        lifDepositAddress = args.lifDeposit;
    }

    if (!orgIdAddress || orgIdAddress === 'fake') {
        throw new Error(
            'OrgId instance address not defined neither in the keys.json or command line "orgid" option'
        );
    }

    const web3 = new Web3(
        !process.env.TESTING
            ? web3Endpoint
            : global.web3.currentProvider
    );
    const resolver = new OrgIdResolver({
        web3,
        orgId: orgIdAddress,
        lifDeposit: lifDepositAddress
    });
    resolver.registerFetchMethod(httpFetchMethod);

    if (!args.did) {
        throw new Error(
            'DID have to be provided with command: "did=<DID>"'
        );
    }

    if (!process.env.TESTING) {
        console.log(`Resolving of the DID: ${args.did}`);
    }
    
    const result = await resolver.resolve(args.did);

    if (!process.env.TESTING) {
        console.log(JSON.stringify(result, null, 2));
    }
    
    return result;
};
module.exports = main;

if (!process.env.TESTING) {
    main().catch(console.error);
}
