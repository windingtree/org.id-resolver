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

## Custom Fetch Methods

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

![ORG.ID Ecosystem](https://github.com/windingtree/org.id/raw/master/assets/org.id-ecosystem.png)

- [Winding Tree DAO](https://github.com/windingtree/dao) controls ORG.ID Registry smart contract and some Directories (including their rules)
- [ORG.ID Registry](https://github.com/windingtree/org.id) contains records of all organizations and organizational units
- [ORG.JSON Schema](https://github.com/windingtree/org.json-schema) is a data format for describing organizations
- **ORG.ID Resolver (you are here)**
- [ORG.ID Directories](https://github.com/windingtree/org.id-directories) are curated lists of organizations
- [Arbor](https://arbor.fm) can be used to look up an ORG.ID, and also to create and manage your own ORG.ID
