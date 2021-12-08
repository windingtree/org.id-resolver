import type { ORGJSONVCNFT } from '@windingtree/org.json-schema/types/orgVc';
import type {
  ORGJSON,
  VerificationMethodReference,
  CapabilityDelegationReference
} from '@windingtree/org.json-schema/types/org.json';
import type { SignedVC } from '@windingtree/org.id-auth/dist/vc';
import type { JWK } from '@windingtree/org.id-auth/dist/keys';
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
  maxDepth?: number;
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
  didDocument: ORGJSON | null;
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

export interface ResolverCache {
  [did: string]: DidResolutionResponse
}

export type VerificationMethodPublicKey = JWK | string;

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
// @todo Move `parseDid` to SDK utils
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
// @todo Move `parseUri` to SDK utils
export const parseUri = (uri: string): ParsedUri => {
  let parsedUri: string;
  let type: string;

  if (regexp.uriHttp.exec(uri)) {
    parsedUri = uri;
    type = 'http';
  } else if (regexp.ipfs.exec(uri) || regexp.ipfsUri.exec(uri)) {
    type = 'ipfs';

    if (!regexp.ipfsUri.exec(uri)) {
      parsedUri = uri;
    } else {
      const ipfsGroupedResult = regexp.ipfsUriGrouped.exec(uri) as IpfsUriGroupedResult;

      if (!ipfsGroupedResult) {
        // should never happen because it checked twice
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

export const parseCapabilityDelegates = (
  capabilityDelegate: CapabilityDelegationReference
): string[] => capabilityDelegate.map(
  (delegate: VerificationMethodReference | string): string => {
    // @todo Validate definition with schema

    if (typeof delegate === 'string') {
      return delegate;
    }

    if (typeof delegate === 'object' && delegate.id) {
      return delegate.id;
    }

    throw new Error(`Invalid capabilityDelegate definition: ${delegate}`);
  }
);

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

const resolverCache: ResolverCache = {};

/**
 * ORGiD resolver implementation
 * according to https://w3c-ccg.github.io/did-resolution
 * and https://www.w3.org/TR/did-core/#did-resolution
 */
export const OrgIdResolver = (options: ResolverOptions): OrgIdResolverAPI => {
  const chains = setupChains(options.chains);
  const fetchers = setupFetchers(options.fetchers);
  const maxDepth = options.maxDepth || 3;

  const resolve = async (
    rawDid: string,
    level = 0,
    rootResolutionDid?: string
  ): Promise<DidResolutionResponse> => {
    let did = rawDid;

    // Return cached response
    if (resolverCache[did]) {
      return resolverCache[did];
    }

    if (level > maxDepth) {
      throw new Error(
        `Maximum depth "${maxDepth}" of capability delegation is reached`
      );
    }

    // Capability delegates resolver
    const getDelegatedPublicKey = async (
      parentOrgJsonVc: ORGJSONVCNFT,
      verificationMethodId: string,
      level: number
    ): Promise<VerificationMethodPublicKey> => {

      const { did } = parseDid(verificationMethodId);
      const parentDid = object.getDeepValue(
        parentOrgJsonVc,
        'credentialSubject.id'
      ) as string;

      let verificationMethodResolution: DidResolutionResponse;
      let delegateVerificationMethodDefinition: VerificationMethodReference[];

      if (did !== parentDid) {
        // Resolve external verificationMethodId
        verificationMethodResolution = await resolve(
          verificationMethodId,
          level + 1,
          parentDid
        );

        if (verificationMethodResolution.didResolutionMetadata.error) {
          throw new Error(
            `Delegate resolution error: ${verificationMethodResolution.didResolutionMetadata.error}`
          );
        }

        if (!verificationMethodResolution.didDocument) {
          throw new Error(
            `Unable to resolve verificationMethod "${verificationMethodId}" of delegate`
          );
        }

        delegateVerificationMethodDefinition = object.getDeepValue(
          verificationMethodResolution.didDocument,
          'verificationMethod'
        ) as VerificationMethodReference[];
      } else {
        // Working with internal verificationMethod definition
        delegateVerificationMethodDefinition = object.getDeepValue(
          parentOrgJsonVc,
          'credentialSubject.verificationMethod'
        ) as VerificationMethodReference[];
      }

      if (!delegateVerificationMethodDefinition) {
        throw new Error('Unable to get verificationMethods of delegate');
      }

      const verificationMethod = delegateVerificationMethodDefinition.filter(
        v => v.id === verificationMethodId
      )[0];

      if (!verificationMethod) {
        throw new Error('Unable to get verificationMethod of delegate');
      }

      switch (verificationMethod.type) {
        case 'EcdsaSecp256k1RecoveryMethod2020':
        case 'JsonWebKey2020':
        case 'EcdsaSecp256k1VerificationKey2019':

          const publicKey =
            verificationMethod.blockchainAccountId ||
            verificationMethod.publicKeyJwk;

          // The following key types are not supported yet
          // - publicKeyPem
          // - publicKeyBase58
          // @todo Create an utility for conversion of publicKeyPem and publicKeyBase58 into JWK format

          return publicKey || '';
        default:
          throw new Error(`Unknown verificationMethod type ${verificationMethod.type}`)
      }
    };

    let error: string | undefined;
    let orgIdData: OrgIdData | undefined;
    let rawOrgJsonVc: ORGJSONVCNFT | undefined;
    let safeOrgJsonVc: ORGJSONVCNFT | undefined;
    let didDocument: ORGJSON | undefined;

    const resolutionStart = Date.now();

    try {
      const { did: parsedDid, network, orgId } = parseDid(did);
      did = parsedDid;

      if (did === rootResolutionDid) {
        throw new Error(
          `Capability delegation recursion detected at "${rootResolutionDid}"`
        );
      }

      const selectedChain = chains[network];

      if (!selectedChain) {
        throw new Error(`Unsupported blockchain Id "${network}"`);
      }

      // Fetch ORGiD data from defined chain
      orgIdData =
        await selectedChain.resolver.getOrgId(orgId) as OrgIdData;

      if (!orgIdData) {
        throw new Error(`ORGiD "${orgId}" not found`);
      }

      const { orgJsonUri, owner: orgIdOwner } = orgIdData;

      const {
        uri,
        type: uriType
      } = parseUri(orgJsonUri);

      const selectedFetcher = fetchers[uriType];

      if (!selectedFetcher) {
        throw new Error(`Unsupported URI fetcher "${uriType}"`);
      }

      // Fetching of the ORG.JSON by defined fetcher
      rawOrgJsonVc =
        await selectedFetcher.resolver.getOrgJson(uri) as ORGJSONVCNFT;

      const vcTypes = object.getDeepValue(rawOrgJsonVc, 'type');

      // Check mandatory VC type
      if (!Array.isArray(vcTypes) || !vcTypes.includes('OrgJson')) {
        throw new Error('VC must include "OrgJson" type');
      }

      // Extract capabilityDelegation definition from VC subject
      const capabilityDelegateDefinition = object.getDeepValue(
        rawOrgJsonVc,
        'credentialSubject.capabilityDelegation'
      ) as CapabilityDelegationReference;

      // Extract verification method from the VC proof
      const vcVerificationMethod = object.getDeepValue(
        rawOrgJsonVc,
        'proof.verificationMethod'
      ) as string;

      if (!vcVerificationMethod || vcVerificationMethod === '') {
        throw new Error('Verification method definition not found in VC proof');
      }

      let publicKey: VerificationMethodPublicKey = '';

      // If ORG.JSON contains capabilityDelegation definition
      // VC proof must be verified by one of verification methods
      // that listed in this definition.
      if (capabilityDelegateDefinition) {
        // Capability delegation flow

        // Check registered delegates
        if (orgIdData.delegates.length === 0) {
          throw new Error('Registered capability delegates not found in ORGID');
        }

        // Extract delegates from the ORG.JSON
        const capabilityDelegateVerificationMethods =
          parseCapabilityDelegates(capabilityDelegateDefinition);

        // Check if vcVerificationMethod is defined as delegate
        const isVcVerificationMethodDefined =
          capabilityDelegateVerificationMethods.includes(vcVerificationMethod);

        if (!isVcVerificationMethodDefined) {
          throw new Error(
            `Verification method "${vcVerificationMethod}" not defined as capability delegate in ORG.JSON`
          );
        }

        // Check if vcVerificationMethod is registered as delegate in ORGiD
        const isVcVerificationMethodRegistered =
          orgIdData.delegates.includes(vcVerificationMethod);

        if (!isVcVerificationMethodRegistered) {
          throw new Error(
            `Verification method "${vcVerificationMethod}" not registered as capability delegate in ORGID`
          );
        }

        publicKey = await getDelegatedPublicKey(
          rawOrgJsonVc,
          vcVerificationMethod,
          level
        );

      } else {
        // Normal resolution flow

        const {
          orgId: verificationOrgId,
          network: verificationNetwork
        } = parseDid(vcVerificationMethod);

        if (verificationOrgId !== orgId) {
          throw new Error(
            `Verification method "${vcVerificationMethod}" is not compatible with ORGiD "${orgId}"`
          );
        }

        if (verificationNetwork !== selectedChain.config.blockchainId) {
          throw new Error(
            `Verification method network "${verificationNetwork}" is not supported`
          );
        }

        // Extract given verification method from the VC credential subject (ORG.JSON)
        const orgJsonVerificationMethodDefinition = object.getDeepValue(
          rawOrgJsonVc,
          'credentialSubject.verificationMethod'
        ) as VerificationMethodReference[];

        // @todo Implement validation of verificationMethod definition with schema

        if (
          !orgJsonVerificationMethodDefinition ||
          orgJsonVerificationMethodDefinition.length === 0
        ) {
          throw new Error(
            'Verification methods definition not found in ORG.JSON'
          );
        }

        const orgJsonVerificationMethod = orgJsonVerificationMethodDefinition
          .filter(
            v => v.id === vcVerificationMethod
          )[0];

        if (!orgJsonVerificationMethod) {
          throw new Error(
            `Verification method "${vcVerificationMethod}" not found in ORG.JSON`
          );
        }

        // Check verification method revocation status
        if (orgJsonVerificationMethod.verificationMethodRevocation) {
          throw new Error(
            `Verification method "${orgJsonVerificationMethod.id}" is revoked at "${orgJsonVerificationMethod.verificationMethodRevocation.invalidityDate}"`
          );
        }

        if (orgJsonVerificationMethod.type !== 'EcdsaSecp256k1RecoveryMethod2020') {
          throw new Error(
            `Verification method type "EcdsaSecp256k1RecoveryMethod2020" is expected but found "${orgJsonVerificationMethod.type}" in the VC proof`
          );
        }

        if (!orgJsonVerificationMethod.blockchainAccountId) {
          throw new Error(
            'Verification method of type "EcdsaSecp256k1RecoveryMethod2020" must include blockchainAccountId'
          );
        }

        const {
          accountId,
          blockchainType,
          blockchainId
        } = parseBlockchainAccountId(orgJsonVerificationMethod.blockchainAccountId);

        if (accountId !== orgIdOwner) {
          throw new Error(
            `Verification method blockchain account Id "${orgIdOwner}" is expected but found "${accountId}" in the VC proof`
          );
        }

        if (
          blockchainType !== selectedChain.config.blockchainType ||
          blockchainId !== selectedChain.config.blockchainId
        ) {
          throw new Error(
            `Verification method blockchain type "${selectedChain.config.blockchainType}" and Id "${selectedChain.config.blockchainId}" are expected but found "${blockchainType}" and "${blockchainId}" in the VC proof`
          );
        }

        publicKey = orgJsonVerificationMethod.blockchainAccountId;
      }

      safeOrgJsonVc = await verifyVC(
        rawOrgJsonVc as SignedVC,
        publicKey
      ) as ORGJSONVCNFT;

      didDocument = safeOrgJsonVc?.credentialSubject as ORGJSON;

    } catch(err) {
      error = err.message;
    }

    const resolutionResult = buildDidResolutionResponse(
      did,
      resolutionStart,
      orgIdData,
      didDocument,
      error
    );

    if (!error) {
      // Simple in-memory cache version
      // @todo Implement plugable caching solution
      resolverCache[did] = resolutionResult;
    }

    return resolutionResult;
  }

  return {
    resolve
  };
}
