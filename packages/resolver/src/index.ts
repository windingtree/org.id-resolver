import type { ORGJSONVCNFT } from '@windingtree/org.json-schema/types/orgVc';
import type { ORGJSON, VerificationMethodReference } from '@windingtree/org.json-schema/types/org.json';
import type { SignedVC } from '@windingtree/org.id-auth/dist/vc';
import type { OrgIdData, KnownProvider } from '@windingtree/org.id-core';
import { parseBlockchainAccountId, verifyVC } from '@windingtree/org.id-auth/dist/vc';
import { OrgIdContract } from '@windingtree/org.id-core';
import { regexp, http, object } from '@windingtree/org.id-utils';
import { DateTime } from  'luxon';
import { version } from '../package.json';

export interface ChainResolver {
  getOrgId(orgId: string): Promise<OrgIdData | null>;
}

export interface FetcherResolver {
  getOrgJson(uri: string): Promise<ORGJSONVCNFT>;
}

export interface ChainConfig {
  blockchainId: string;
  blockchainType: string;
  init(): ChainResolver;
}

export interface FetcherConfig {
  id: string;
  name: string;
  init(): FetcherResolver;
}

export interface ResolverOptions {
  chains: ChainConfig[];
  fetchers: FetcherConfig[];
}

export interface Chains {
  [blockchainId: string]: {
    resolver: ChainResolver;
    config: {
      blockchainId: string;
      blockchainType: string;
    }
  }
}

export interface Fetchers {
  [id: string]: {
    resolver: FetcherResolver;
    config: {
      id: string;
      name: string;
    }
  }
}

export type DidResolutionContext = 'https://w3id.org/did-resolution/v1';

export type DidResolutionContentType = 'application/did+ld+json';

export interface NormalizedOrgIdData extends Omit<OrgIdData, 'tokenId'> {
  tokenId: string;
}

export interface DidResolutionMetaData {
  contentType: DidResolutionContentType;
  retrieved: string;
  duration: number;
  resolverVersion: string;
  credential?: ORGJSONVCNFT;
  error?: string;
}

export interface DidDocumentMetadata {
  created?: string;
  updated?: string;
  deactivated?: boolean;
  data?: NormalizedOrgIdData;
}

export interface DidResolutionResponse {
  '@context': DidResolutionContext;
  did: string;
  didDocument?: ORGJSON | null;
  didResolutionMetadata: DidResolutionMetaData;
  didDocumentMetadata: DidDocumentMetadata | null;
}

export interface OrgIdResolverAPI {
  resolve(orgId: string): Promise<DidResolutionResponse>;
}

export interface DidGroupedCheckResult extends RegExpExecArray {
  groups: {
    did: string;
    method: string;
    network?: string;
    id: string;
    query?: string;
    fragment?: string;
  }
}

export interface IpfsUriGroupedResult extends RegExpExecArray {
  groups: {
    protocol: string;
    cid: string;
  }
}

export interface ParsedDid {
  did: string;
  method: string;
  network: string;
  orgId: string;
  query?: string;
  fragment?: string;
}

export interface ParsedUri {
  uri: string;
  type: string;
}

const resolverMethod = 'orgid';

// Initialize ORGiD chains
export const setupChains = (chains: ChainConfig[]): Chains =>
  chains.reduce(
    (a: Chains, chain: ChainConfig): Chains => ({
      ...a,
      [chain.blockchainId]: {
        resolver: chain.init(),
        config: {
          blockchainId: chain.blockchainId,
          blockchainType: chain.blockchainType
        }
      }
    }),
    {}
  );

// Initialize ORG.JSON fetchers
export const setupFetchers = (fetchers: FetcherConfig[]): Fetchers =>
  fetchers.reduce(
    (a: Fetchers, fetcher: FetcherConfig): Fetchers => ({
      ...a,
      [fetcher.id]: {
        resolver: fetcher.init(),
        config: {
          id: fetcher.id,
          name: fetcher.name
        }
      }
    }),
    {}
  );

// Parse raw DID and extract its parts
export const parseDid = (did: string): ParsedDid => {
  const groupedCheck = regexp.didGrouped.exec(did) as DidGroupedCheckResult;

  if (!groupedCheck || !groupedCheck.groups || !groupedCheck.groups.did) {
    throw new Error(`Invalid DID format: ${did}`);
  }

  const {
    method,
    network,
    id,
    query,
    fragment
  } = groupedCheck.groups;

  if (!method || method !== resolverMethod) {
    throw new Error(`Invalid DID method: ${method}`);
  }

  if (!regexp.bytes32.exec(id)) {
    throw new Error(`Invalid ORGiD: ${id}`);
  }

  return {
    did,
    method,
    network: network || '1', // Mainnet is default value
    orgId: id,
    query,
    fragment
  };
};

// Parse raw ORG.JSON uri and extract an uri type
export const parseUri = (uri: string): ParsedUri => {
  let parsedUri: string;
  let type: string;

  if (regexp.uriHttp.exec(uri)) {
    parsedUri = uri;
    type = 'http';
  } else if (regexp.ipfs.exec(uri) || regexp.ipfsUri.exec(uri)) {
    type = 'ipfs';

    if (regexp.ipfs.exec(uri)) {
      parsedUri = uri;
    } else {
      const ipfsGroupedResult = regexp.ipfsUriGrouped.exec(uri) as IpfsUriGroupedResult;

      if (!ipfsGroupedResult) {
        throw new Error(`Unable to extract CID from IPFS URI: ${uri}`);
      }

      parsedUri = ipfsGroupedResult.groups.cid;
    }

  } else {
    throw new Error(`Invalid URI: ${uri}`);
  }

  return {
    uri: parsedUri,
    type
  }
};

// Builds chain config for EVM compatible chains
export const buildEvmChainConfig = (
  blockchainId: string,
  blockchainType: string,
  orgIdContractAddress: string,
  providerOrUri: KnownProvider
): ChainConfig => ({
  blockchainId,
  blockchainType,
  init: (): ChainResolver => {
    const contract = new OrgIdContract(
      orgIdContractAddress,
      providerOrUri
    );

    return contract;
  }
});

// Builds ORG.JSON HTTP fetcher config
export const buildHttpFetcherConfig = (): FetcherConfig => ({
  id: 'http',
  name: 'ORG.JSON HTTP fetcher',
  init: (): FetcherResolver => ({
    getOrgJson: (uri: string): Promise<ORGJSONVCNFT> =>
      http.request(uri, 'GET') as Promise<ORGJSONVCNFT>
  })
});

// Build DID resolver response
export const buildDidResolutionResponse = (
  did: string,
  resolutionStart: number,
  orgId?: OrgIdData,
  didDocument?: ORGJSON,
  error?: string
): DidResolutionResponse => ({
  '@context': 'https://w3id.org/did-resolution/v1',
  did,
  ...(
    didDocument
      ? { didDocument }
      : { didDocument: null }
  ),
  didResolutionMetadata: {
    contentType: 'application/did+ld+json',
    retrieved: DateTime.now().toISO(),
    duration: Date.now() - resolutionStart,
    resolverVersion: version,
    ...(
      error
        ? { error }
        : {}
    )
  },
  didDocumentMetadata:
    didDocument
      ? {
        ...(
          didDocument.created
            ? { created: didDocument.created }
            : {}
        ),
        ...(
          didDocument.updated
            ? { updated: didDocument.updated }
            : {}
        ),
        ...(
          didDocument.deactivated
            ? { deactivated: !!didDocument.deactivated }
            : {}
        ),
        ...(
          orgId
            ? {
              data: {
                ...orgId,
                tokenId: orgId.tokenId.toString()
              }
            }
            : {}
        )
      }
      : null
});

/**
 * ORGiD resolver implementation
 * according to https://w3c-ccg.github.io/did-resolution
 * and https://www.w3.org/TR/did-core/#did-resolution
 */
export const OrgIdResolver = (options: ResolverOptions): OrgIdResolverAPI => {
  const chains = setupChains(options.chains);
  const fetchers = setupFetchers(options.fetchers);

  return {
    resolve: async (did: string): Promise<DidResolutionResponse> => {
      let error: string | undefined;
      let orgIdData: OrgIdData | undefined;
      let rawOrgJsonVc: ORGJSONVCNFT | undefined;
      let safeOrgJsonVc: ORGJSONVCNFT | undefined;
      let didDocument: ORGJSON | undefined;
      const resolutionStart = Date.now();

      try {
        const { network, orgId } = parseDid(did);
        const selectedChain = chains[network];

        if (!selectedChain) {
          throw new Error(`Unsupported blockchain Id: ${network}`);
        }

        // Fetch ORGiD data from defined chain
        orgIdData =
          await selectedChain.resolver.getOrgId(orgId) as OrgIdData;

        if (!orgIdData) {
          throw new Error(`Organization with Id ${orgId} not found`);
        }

        const { orgJsonUri, owner: orgIdOwner } = orgIdData;

        const {
          uri,
          type: uriType
        } = parseUri(orgJsonUri);

        const selectedFetcher = fetchers[uriType];

        if (!selectedFetcher) {
          throw new Error(`Unsupported URI fetcher: ${uriType}`);
        }

        // Fetching of the ORG.JSON by defined fetcher
        rawOrgJsonVc =
          await selectedFetcher.resolver.getOrgJson(uri) as ORGJSONVCNFT;

        const vcTypes = object.getDeepValue(rawOrgJsonVc, 'type');

        // VC must include type OrgJson
        if (!Array.isArray(vcTypes) || !vcTypes.includes('OrgJson')) {
          throw new Error('VC must include OrgJson type');
        }

        // Extract verification method from the VC proof
        const vcVerificationMethod = object.getDeepValue(
          rawOrgJsonVc,
          'proof.verificationMethod'
        ) as string;

        if (!vcVerificationMethod || vcVerificationMethod === '') {
          throw new Error('Verification method not found in VC proof');
        }

        const {
          orgId: verificationOrgId,
          network: verificationNetwork
        } = parseDid(vcVerificationMethod);

        let publicKey = '';

        if (
          verificationOrgId === orgId &&
          verificationNetwork === selectedChain.config.blockchainId
        ) {
          // Extract verification method from the credential subject (ORG.JSON)
          const orgJsonVerificationMethods = object.getDeepValue(
            rawOrgJsonVc,
            'credentialSubject.verificationMethod'
          ) as VerificationMethodReference[];

          if (
            !Array.isArray(orgJsonVerificationMethods) ||
            orgJsonVerificationMethods.length === 0
          ) {
            throw new Error(
              'Verification methods definition not found in ORG.JSON'
            );
          }

          const orgJsonVerificationMethod = orgJsonVerificationMethods.filter(
            v => v.id === vcVerificationMethod
          )[0];

          if (!orgJsonVerificationMethod) {
            throw new Error(
              `Verification method ${vcVerificationMethod} not found in ORG.JSON`
            );
          }

          // Check verification method revocation status
          if (orgJsonVerificationMethod.verificationMethodRevocation) {
            throw new Error(
              `Verification method ${orgJsonVerificationMethod.id} is revoked at ${orgJsonVerificationMethod.verificationMethodRevocation.invalidityDate}`
            );
          }

          if (orgJsonVerificationMethod.type === 'EcdsaSecp256k1RecoveryMethod2020') {

            if (!orgJsonVerificationMethod.blockchainAccountId) {
              throw new Error(
                'Verification method of type EcdsaSecp256k1RecoveryMethod2020 must include blockchainAccountId'
              );
            }

            const {
              accountId,
              blockchainType,
              blockchainId
            } = parseBlockchainAccountId(orgJsonVerificationMethod.blockchainAccountId);

            if (accountId === orgIdOwner) {

              if (
                blockchainType !== selectedChain.config.blockchainType ||
                blockchainId !== selectedChain.config.blockchainId
              ) {
                throw new Error('Invalid verification method blockchain');
              }

              publicKey = orgJsonVerificationMethod.blockchainAccountId;
            } else {
              // @todo Implement the capability delegation flow
            }
          } else {
            // @todo Implement the capability delegation flow
          }
        } else {
          // @todo Implement the capability delegation flow
        }

        safeOrgJsonVc = await verifyVC(
          rawOrgJsonVc as SignedVC,
          publicKey
        ) as ORGJSONVCNFT;

        didDocument = safeOrgJsonVc?.credentialSubject as ORGJSON;

      } catch(err) {
        error = err.message;
      }

      // @todo Implement caching of resolved ORGiDs

      return buildDidResolutionResponse(
        did,
        resolutionStart,
        orgIdData,
        didDocument,
        error
      );
    }
  };
}
