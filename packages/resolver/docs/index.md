# ORGiD DID Resolver

A utility for ORGiD DID resolution according to [Decentralized Identifier Resolution](https://w3c-ccg.github.io/did-resolution/) specification.

## Setup

```bash
yarn add @windingtree/org.id-resolver@3.0.0-beta.4
```

## Typescript typings

```typescript
import type {
  ChainConfig,
  FetcherConfig,
  Chains,
  Fetchers,
  ResolverOptions,
  DidResolutionMetaData,
  DidDocumentMetadata,
  DidResolutionResponse
} from '@windingtree/org.id-resolver';
```

## Module

```typescript
import {
  buildEvmChainConfig,
  buildHttpFetcherConfig,
  FetcherResolver,
  OrgIdResolver
} from '@windingtree/org.id-resolver';
```

## Initialization

> The ORGiD DID resolver uses blockchain providers from good known [Ethers library](https://docs.ethers.io/v5/)

```typescript
import { ethers } from 'ethers';
const provider = new ethers.providers.Web3Provider(window.ethereum);

const orgIdContractAddress = '0xBfD9...035C';

const chainConfig = buildEvmChainConfig(
  '4', // <-- Rinkeby network
  'eip155',
  orgIdContractAddress,
  provider
);

const httpFetcherConfig = buildHttpFetcherConfig();

const resolverOptions: ResolverOptions = {
  chains: [
    chainConfig // here should be added as many chains as resolver must support
  ],
  fetchers: [
    httpFetcherConfig
  ]
};

const resolver = OrgIdResolver(resolverOptions);
```

## Chain configuration

Blockchain network configuration can be created using the `buildEvmChainConfig` function. Currently, the ORGiD support EVM compatible chains only, so the blockchain type (second parARGUMENT) always will be `eip155`.

```typescript
const chainConfig = buildEvmChainConfig(
  '4', // <-- The network Id according to https://chainlist.org/
  'eip155', // <-- Blockchain type that supports EVM
  orgIdContractAddress, // <-- The address of the smart contract
  provider // Ethers provider
);
```

## Create custom fetcher plugin

Currently, the ORGiD DID resolver supports fetching of the ORG.JSON files by HTTP URIs only. The next version will also support IPFS URIs nut you can implement your own custom URIs fetcher as is shown below:

```typescript
const fetcherInitializer = (): FetcherResolver => ({
  getOrgJson: async (uri: string): Promise<ORGJSONVCNFT> => {
    // Your custom fetcher code
    return fetchedOrgJsonSource;
  }
});

const buildCustomFetcherConfig = (): FetcherConfig => ({
  id: 'custom',
  name: 'ORG.JSON custom fetcher',
  init: fetcherInitializer
});
```

## DID resolution

In case of success, a result of DID resolution will be an object that contains verified `didDocument` (ORG.JSON), `didDocumentMetadata` which contains resolved ORGID data (`tokenId`, `orgId` hash, ORGiD `owner`, `orgJsonUri`, ORGiD `delegates`). In case of error the error message will be returned in [didResolutionMetadata](https://w3c-ccg.github.io/did-resolution/#output-resolutionmetadata) section.

```typescript
const did = 'did:orgid:4:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?service=files&relative-ref=%2Fmyresume%2Fdoc%3Fversion%3Dlatest#intro';

const didResponse = await resolver.resolve(did);
console.log(didResponse);

// {
//   '@context': 'https://w3id.org/did-resolution/v1',
//   did: 'did:orgid:4:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
//   didDocument: {
//     schemaVersion: '0.5.5',
//     '@context': [
//       'https://www.w3.org/ns/did/v1',
//       'https://windingtree.com/ns/orgid/v1'
//     ],
//     id: 'did:orgid:4:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
//     created: '2021-11-18T23:02:27.540Z',
//     updated: '2021-11-18T23:02:27.540Z',
//     verificationMethod: [ [Object] ],
//     service: [],
//     payment: [],
//     trustAssertions: [],
//     credentials: [],
//     legalEntity: {
//       legalName: 'Acme, Corp.',
//       alternativeName: 'Acme',
//       registryCode: 'US12345567',
//       identifiers: [Array],
//       legalType: 'GmBH',
//       registeredAddress: [Object],
//       locations: [Array],
//       contacts: [Array],
//       media: [Object]
//     },
//     capabilityDelegation: [
//       'did:orgid:1337:0xb38ba5a617274bef8716b525fb5fc0ea5d53b89272c476ee05759cd56492d703#key-1'
//     ]
//   },
//   didResolutionMetadata: {
//     contentType: 'application/did+ld+json',
//     retrieved: '2021-11-19T01:02:27.772+02:00',
//     duration: 140,
//     resolverVersion: '3.0.0-beta.4'
//   },
//   didDocumentMetadata: {
//     created: '2021-11-18T23:02:27.540Z',
//     updated: '2021-11-18T23:02:27.540Z',
//     data: {
//       tokenId: '32',
//       orgId: '0xa2f6105f050a1ba0d96762fb76726eb12fa5bc0f849ede589097428c33c95a13',
//       owner: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
//       orgJsonUri: 'http://example.com:10000/0xa2f6105f050a1ba0d96762fb76726eb12fa5bc0f849ede589097428c33c95a13.json',
//       delegates: [Array],
//       created: '2021-11-18T23:03:29.000Z'
//     }
//   }
// }
```
