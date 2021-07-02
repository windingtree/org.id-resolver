import type { Web3Provider } from '@windingtree/org.id-core';
import type { ORGJSON } from '@windingtree/org.json-schema';
import type { OrgIdData } from '@windingtree/org.id-core';
import type { SignedVC } from '@windingtree/org.id-auth/dist/vc';

export interface DidSubMethodBlockchainConfig {
  type: string;
  id: string;
}
export interface DidSubMethodOption {
  [k: string]: {
    provider: string | Web3Provider;
    blockchain: DidSubMethodBlockchainConfig;
    address?: string;
  }
}

export interface ResolverOptions {
  didSubMethods: DidSubMethodOption;
  ipfsGate?: string;
}

export interface OrgIdDidParsed {
  did: string;
  method: string;
  subMethod: string;
  orgId: string;
  query?: string;
  fragment?: string;
}

export interface OrgIdDidGroupedResult {
  did: string;
  method: string;
  submethod?: string;
  id: string;
  query?: string;
  fragment?: string;
}

export type DidResolutionContentType = 'application/did+ld+json';

export type DidResolutionContext = 'https://w3id.org/did-resolution/v1';

export interface DidResolutionMetaData {
  contentType: DidResolutionContentType;
  retrieved: string;
  duration: number;
  orgId?: OrgIdData;
  credential?: SignedVC;
  error?: string;
}

export interface DidDocumentMetadata {
  created?: string;
  updated?: string;
  deactivated?: boolean;
}

export interface DidResolutionResult {
  '@context': DidResolutionContext;
  didDocument?: ORGJSON | undefined;
  didResolutionMetadata: DidResolutionMetaData;
  didDocumentMetadata: DidDocumentMetadata;
}
