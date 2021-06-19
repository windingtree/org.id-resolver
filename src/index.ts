import orgJson from '@windingtree/org.json-schema';

console.log('@@@', orgJson);

// Validate ORGiD id format and method

// Extract ORGiD DID submethod

// Validate submethod
// - must be method supported by the resolver (ethereum based networks that mentioned in the configuration)

// Lookup given ORGiD in the smart contract

// Fetch an actual ORG.JSON VC link for the ORGiD

// Validate ORG.JSON fetch (we plan to support the following methods: http, ipfs)

// Fetch ORG.JSON VC by given link

// Validate ORG.JSON VC against the VC schema

// Validate ORG.JSON VS type
// - must contains ORG.JSON

// Extract the ORG.JSON VC proof

// Verify the proof creation date

// Verify the verification method type
// - must be: EcdsaSecp256k1RecoveryMethod2020

// Verify the verification method controller
// - must be the same as ORGiD

// Extract verificationMethod from the ORG.JSON

// Verify the verification method blockchainAccountId
// - blockchainAccount must be equal to the ORGiD owner
// - blockchainType must be supported by the resolver
// - blockchainNetworkId must be supported by the resolver

// Decode ORG.JSON VC signature
// Extract the protected header and payload

// Verify equality of the JWS payload and signed payload

// Verify ORG.JSON VC signature

// Validate ORG.JSON subject against the ORG.JSON schema

// Build DID resolution report


export default orgJson;
