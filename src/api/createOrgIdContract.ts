import type { ResolverOptions } from '../types';

import { OrgIdContract } from '@windingtree/org.id-core';
import { regexp } from '@windingtree/org.id-utils';
import { validateResolverOptions } from './validateResolverOptions';

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
