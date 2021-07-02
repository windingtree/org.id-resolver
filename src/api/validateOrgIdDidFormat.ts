import type {
  ResolverOptions,
  OrgIdDidParsed,
  OrgIdDidGroupedResult
} from '../types';

import { regexp } from '@windingtree/org.id-utils';
import { validateResolverOptions } from './validateResolverOptions';

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

  // Validate submethod
  // - must be method supported by the resolver (ethereum based networks that mentioned in the configuration)
  if (submethod && !options.didSubMethods[submethod]) {
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
