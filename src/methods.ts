import type {
  OrgIdData
} from '@windingtree/org.id-core';
import type {
  ResolverOptions,
  OrgIdDidParsed,
  OrgIdDidGroupedResult
} from './types';
import type { AnySchema } from 'ajv';
import { OrgIdContract } from '@windingtree/org.id-core';
import { regexp } from '@windingtree/org.id-utils';
import Ajv from 'ajv';
import { validateData } from './utils/validateData';

// Schema validator
const ajv = new Ajv();

// Schema for resolver options object
export const resolverOptionsSchema: AnySchema = {
  type: 'object',
  properties: {
    didSubMethods: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9_]+$': {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              pattern: regexp.uri.source
            },
            address: {
              type: 'string',
              pattern: regexp.ethereumAddress.source
            }
          },
          required: [
            'provider'
          ]
        }
      }
    }
  },
  required: [
    'didSubMethods'
  ],
  additionalProperties: false
};

// Validate function for data validator
export const compiledResolverOptionsSchema = ajv.compile(resolverOptionsSchema);

// Validate options object against the schema
export const validateResolverOptions = (options: ResolverOptions): void =>
  validateData(
    compiledResolverOptionsSchema,
    options,
    'Resolver options:'
  );

// Validate ORGiD DID
export const validateOrgIdDidFormat = (
  didString: string,
  options: ResolverOptions
): OrgIdDidParsed => {
  validateResolverOptions(options);

  const didGrouped = regexp.didGrouped.exec(didString);

  if (!didGrouped || !didGrouped.groups) {
    throw new Error(`Invalid DID format: ${didString}`);
  }

  // Extract ORGiD DID parts
  const {
    did,
    method,
    submethod = 'main',
    id,
    query,
    fragment
  } = didGrouped.groups as unknown as OrgIdDidGroupedResult;

  if (method !== 'orgid') {
    throw new Error(`Unsupported DID method: ${method}`);
  }

  const {
    didSubMethods
  } = options;

  // Validate submethod
  // - must be method supported by the resolver (ethereum based networks that mentioned in the configuration)
  if (didSubMethods && submethod && !didSubMethods[submethod]) {
    throw new Error(`Unsupported DID submethod: ${submethod}`);
  }

  return {
    did,
    method,
    subMethod: submethod,
    orgId: id,
    query,
    fragment
  };
};

// Create new OrgId contract instance
export const createOrgIdContract = (
  didSubMethod: string,
  options: ResolverOptions
): OrgIdContract => {
  validateResolverOptions(options);

  if (!didSubMethod || didSubMethod === '') {
    throw new Error('DID submethod must be provided');
  }

  if (!options.didSubMethods[didSubMethod]) {
    throw new Error(`DID submethod not supported: ${didSubMethod}`);
  }

  return new OrgIdContract(
    // Override submethod with address
    // if ORGiD contract address provided in options
    (
      regexp.ethereumAddress.exec(
        options.didSubMethods[didSubMethod].address as string
      )
        ? options.didSubMethods[didSubMethod].address
        : didSubMethod
    ) as string,
    options.didSubMethods[didSubMethod].provider
  );
};

// Lookup given ORGiD in the smart contract
export const getOrgId = (
  orgIdContract: OrgIdContract,
  orgId: string
): Promise<OrgIdData | null> => {

  if (!(orgIdContract instanceof OrgIdContract)) {
    throw new Error('Invalid OrgIdContract instance');
  }

  return orgIdContract.getOrgId(orgId);
};

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

