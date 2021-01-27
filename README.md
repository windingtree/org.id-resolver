[![Build Status](https://travis-ci.org/windingtree/org.id-resolver.svg?branch=master)](https://travis-ci.org/windingtree/org.id-resolver)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/org.id-resolver/badge.svg?branch=master)](https://coveralls.io/github/windingtree/org.id-resolver?branch=master&v=2.0)

<a href="https://orgid.tech"><img src="https://github.com/windingtree/branding/raw/master/org.id/svg/org.id-logo.svg" height="50" alt="ORG.ID"></a>

## ORG.ID DID Resolver

ORG.ID DID Resolver is an application for resolving ORG.ID data in [W3C DID](https://w3c.github.io/did-core/) format.

## Usage

### Command Line

```sh
git clone git@github.com:windingtree/org.id-resolver.git
cd org.id-resolver
npm i
npm link
chmod +x src/cli.js
```

```sh
./src/cli.js endpoint=<WEB3_PROVIDER> orgid=<ORGID_ADDRESS> did=did:orgid:0x6d98103810d50b3711ea81c187a48245109ba094644ddbc54f8d0c4c
```

### NPM Module

```sh
npm i @windingtree/org.id-resolver
```

```javascript
const Web3 = require('web3');
const { OrgIdResolver, httpFetchMethod } = require('@windingtree/org.id-resolver');

const web3 = new Web3('<WEB3_PROVIDER>'); // HTTP(s) or WS(s)
const resolver = new OrgIdResolver({
    web3,
    orgId: '<ORGID_ADDRESS>' // TODO: #3
});
resolver.registerFetchMethod(httpFetchMethod);

const result = await resolver.resolve('did:orgid:0x62a7502f4c44d8147b8f7b2a1dbeb8503e8446e77355bb2e4ebf999c7ecc5808');
```

## Algorithm

1. Validate DID syntax (must be `did:orgid:bytes32`)
2. Read organization data from ORG.ID Registry
3. Fetch and validate [ORG.JSON](https://github.com/windingtree/org.json-schema):
4. Try to resolve assertions and credentials

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
        "version": "2.0.0",
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
module.exports = {
    name: 'unique_method_name',

    // Regexp to match your URI schema
    pattern: '^yourpatternrule:',

    fetch: async uri => {
        const data = await yourCustomHandler(uri);
        return data;
    }
};
```

## Development

### Test

```sh
npm run test
npm run test ./<path_to_test_file>.js
```

## Test coverage

```bash
npm run coverage
```

## Lint

```bash
npm run lint

```

## ORG.ID Ecosystem

- [Winding Tree DAO](https://github.com/windingtree/dao) controls ORG.ID Registry smart contract and some Directories (including their rules)
- [ORG.ID Registry](https://github.com/windingtree/org.id) contains records of all organizations and organizational units
- [ORG.JSON Schema](https://github.com/windingtree/org.json-schema) is a data format for describing organizations
- **ORG.ID Resolver (you are here)**
- [ORG.ID Directories](https://github.com/windingtree/org.id-directories) are curated lists of organizations
- [Arbor](https://arbor.fm) can be used to look up an ORG.ID, and also to create and manage your own ORG.ID
