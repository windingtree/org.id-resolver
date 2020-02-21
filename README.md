[![Build Status](https://travis-ci.org/windingtree/org.id-resolver.svg?branch=master)](https://travis-ci.org/windingtree/org.id-resolver)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/org.id-resolver/badge.svg?branch=master)](https://coveralls.io/github/windingtree/org.id-resolver?branch=master&v=2.0) 

# ORG.ID DID Resolver Library

DID Resolver of the Winding Tree ORG.ID protocol

## Initial setup  

```bash
npm i
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
    errors: [
        'Failed assertion trust.assertions[1]: Cannot get the proof',
        'Failed assertion trust.assertions[2]: DID not found in the claim',
        'Failed assertion trust.assertions[3]: Cannot get the proof' 
    ],
    resolverMetadata: {
        retrieved: '2020-02-21T18:14:13.278Z',
        duration: 979 
    }
}
```

## Todo
- More tests
- Documentation
- Cache control 
- Additional fetching methods like: IPFS, Swarm, Arweave
