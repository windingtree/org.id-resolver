import type {
  Web3Provider
} from '@windingtree/org.id-core';

export interface DidSubMethodsOption {
  [k: string]: {
    provider: string | Web3Provider;
    address?: string;
  }
}

export interface ResolverOptions {
  didSubMethods: DidSubMethodsOption;
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
