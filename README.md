[![Build Status](https://travis-ci.org/windingtree/org.id-resolver.svg?branch=master)](https://travis-ci.org/windingtree/org.id-resolver)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/org.id-resolver/badge.svg?branch=master)](https://coveralls.io/github/windingtree/org.id-resolver?branch=master&v=2.0) 

# ORG.ID DID Resolver Library

DID Resolver of the Winding Tree ORG.ID protocol

## Initial setup  

```bash
npm i
npm link
```

## Tests

```bash
npm run test
npm run test ./<path_to_test_file>.js
``` 

## Tests coverage  

```bash
npm run coverage
``` 

## Linting

```bash
npm run lint

```

## Usage

```bash
$ npm i @windingtree/org.id-resolver
```


```javascript
const Web3 = require('web3');
const { OrgIdResolver, httpFetchMethod } = require('@windingtree/org.id-resolver');

const web3 = new Web3('<WEB3_PROVIDER_URI>');
const resolver = new OrgIdResolver({
    web3, 
    orgId: '<ORGID_INSTANCE_ADDRESS>'
});
resolver.registerFetchMethod(httpFetchMethod); // Allowing to fetch files from the web

const result = await resolver.resolve('did:orgid:0x62a7502f4c44d8147b8f7b2a1dbeb8503e8446e77355bb2e4ebf999c7ecc5808');
```

The result will look like:

```bash
{
    didDocument: {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://windingtree.com/ns/orgid/v1' 
        ],
        id: 'did:orgid:0x62a7502f4c44d8147b8f7b2a1dbeb8503e8446e77355bb2e4ebf999c7ecc5808',
        created: '2019-01-01T13:10:02.251Z',
        updated: '2019-06-03T13:20:06.398Z',
        publicKey: [ [Object], [Object] ],
        service: [ [Object] ],
        trust: { assertions: [Array], credentials: [Array] },
        legalEntity:
        {
            legalName: 'Acme, Corp.',
            alternativeName: 'Acme',
            legalIdentifier: 'US12345567',
            identifiers: [Array],
            legalType: 'GmBH',
            registeredAddress: [Object],
            locations: [Array],
            contacts: [Array] 
        } 
    },
    id: '0x62a7502f4c44d8147b8f7b2a1dbeb8503e8446e77355bb2e4ebf999c7ecc5808',
    lifDeposit: {
        deposit: "1000000000000000000000",
        withdrawalRequest: null
    },
    errors: [
        {
            "title": "Trust error",
            "source": {
                "pointer": "trust.assertions[0]"
            },
            "detail": "cannot get the proof"
        }
    ],
    resolverMetadata: {
        "version": "0.2.5",
        retrieved: '2020-02-21T18:14:13.278Z',
        duration: 979 
    }
}
```

## Resolver flow

- DID syntax validation
- Fetching of the DID document
- Comparing hashes of obtained DID document and stored on the ORG.ID smart contract
- Validation DID document object against ORG.ID JSON schema (for more information see the package [@windingtree/org.json-schema](https://github.com/windingtree/org.json-schema))
- Verification of trust records (if defined in the DID document on the path `trust.assertions`. `trust.credentials` are ignored for now but will be enable in future versions)
- Checking of the Lif deposit status for the organization

If any errors occurred on any step then these errors will be placed to the `errors` section of the resolvers response.

Common schema of the error message is look like:

```json
{
    // Error title, that has {string} value
    "title": "Trust error",
    "source": {

        // The source of the error. In depends on error nature this
        // option can be a {string} or {Object}
        "pointer": "trust.assertions[0]"
    },
    // Error explanation
    "detail": "cannot get the proof"
}
```

## Response Schema

The response of the resolver contains the following information  

```json
{
    // An object that has been resolved from the given DID. 
    // Can be equal to `null` if JSON file not passed hashes equality check 
    // or if the file is not passed validation against the ORG.ID schema
    "didDocument": {...},

    // Organization identifier
    "id": "<organization_id>",

    "organization": {
        "orgId": "<organization_id>",
        "orgJsonHash": "<organization_json_hash>",
        "orgJsonUri": "<organization_json_uri>",
        "orgJsonUriBackup1": "<organization_json_uri>",
        "orgJsonUriBackup2": "<organization_json_uri>",
        "parentOrgId": "<parent_organization_hash_or_zero_hash>",
        "owner": "<owner_eth_address>",
        "director": "<director_eth_address>",
        "isActive": true,// true for `enabled` and false for `disabled`
        "isDirectorshipAccepted": true,// director confirmation status
    },

    // List of validation results
    "checks": [
        {
            "type": "DID_SYNTAX",
            "passed": true,
            "errors": [],
            "warnings": []
        },
        {
            "type": "ORGID",
            "passed": true,
            "errors": [],
            "warnings": []
        },
        {
            "type": "DID_DOCUMENT",
            "passed": true,
            "errors": [],
            "warnings": []
        }
    ],
    
    // Verified trust section of the `didDocument`
    "trust": {
        "assertions": [
            {
                "type": "dns",
                "claim": "test.com",
                "proof": "TXT",
                "verified": true
            },
            {
                "type": "domain",
                "claim": "test2.com",
                "proof": "http://test2.com/orgid.txt",
                "verified": true
            },
            {
                "type": "domain",
                "claim": "test3.com",
                "proof": "http://test3.com/orgid.txt",
                "verified": false // Not verified
            },
            {
                "type": "social",
                "claim": "twitter.com/jack",
                "proof": "https://twitter.com/jack/status/123456789/",
                "verified": true
            }
        ]
    },

    // Resolver meta-data like version, date of result and process duration
    "resolverMetadata": {
        "version": "1.0.0",
        "retrieved": "2020-02-21T18:14:13.278Z",
        "duration": 979,
        "orgIdAddress": "0x2cb8dCf26830B969555E04C2EDe3fc1D1BaD504E"
    }
}
```

## Fetching methods

At least one fetching method is required to the proper working of the resolver. 
This library provides a simple fetching method of a file that available via http/https - `httpFetchMethod`.

To use this method you can get its configuration from the package this way:  

```javascript
const { OrgIdResolver, httpFetchMethod } = require('@windingtree/org.id-resolver');
const resolver = new OrgIdResolver({...});
resolver.registerFetchMethod(httpFetchMethod);// fetching method should be registered
```

Future versions of `DID resolver` library will support more fetching methods like: 
IPFS, Swarm and Arweave

Creation of custom fetching methods is quite simple task. Look at the example of simple fetching method configuration:

```javascript
// Configuration of the custom fetching method
module.exports = {
    // Unique fetcher name
    name: 'custom_fetcher',

    // Regular expression for matching your custom URIs
    pattern: '^yourpatternrule:',

    // Fetching function
    fetch: async uri => {
        const data = await yourCustomFetch(uri);
        return data;
    }
};
```

## CLI

The resolver can be used as a simple CLI. 

```bash
$ ./src/cli.js endpoint=<WEB3_PROVIDER_ENTRYPOINT> orgid=<ORG_ID_ADDRESS> did=did:orgid:0x6d98103810d50b3711ea81c187a48245109ba094644ddbc54f8d0c4c
```

- WEB3_PROVIDER_ENTRYPOINT: http/https link to you web3 ethereum provider, for example, `https://ropsten.infura.io/v3/<API_KEY>`
- ORG_ID_ADDRESS: The address of an ORG.ID smart contract
- did: unique identifier in the DID format

The code of CLI is placed in the [./src](./src/cli.js) directory. You can use this code as a good example of the ORG.ID resolver library usage
