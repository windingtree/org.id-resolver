import type { ResolverOptions } from '../types';
import type { SignedVC } from '@windingtree/org.id-auth/dist/vc';

import { regexp, http } from '@windingtree/org.id-utils';
import { validateOrgJsonUri } from './validateOrgJsonUri';
import { validateResolverOptions } from './validateResolverOptions';

// Fetch ORG.JSON VC by given link
export const fetchOrgJson = async (
  uri: string,
  options: ResolverOptions
): Promise<SignedVC> => {
  validateOrgJsonUri(uri);
  validateResolverOptions(options);

  let uriPrefix: string | undefined;

  if (regexp.ipfs.exec(uri)) {

    if (!options.ipfsGate) {
      throw new Error('IPFS gate URI must be provided in options');
    } else {
      uriPrefix = `${options.ipfsGate}/ipns/`;
    }
  }

  return http.request(
    `${uriPrefix ? uriPrefix : ''}${uri}`,
    'GET'
  ) as unknown as SignedVC;
};
