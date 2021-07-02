import type { ResolverOptions } from '../types';

import { validateResolverOptions } from './validateResolverOptions';

// Build a blockchain account Id
export const buildBlockchainAccountId = (
  didSubMethod: string,
  didOwnerAddress: string,
  options: ResolverOptions
): string => {
  validateResolverOptions(options);

  if (!didSubMethod || didSubMethod === '') {
    throw new Error('DID submethod must be provided');
  }

  if (!options.didSubMethods[didSubMethod]) {
    throw new Error(`DID submethod not supported: ${didSubMethod}`);
  }

  return `${didOwnerAddress}@${options.didSubMethods[didSubMethod].blockchain.type}:${options.didSubMethods[didSubMethod].blockchain.id}`;
};
