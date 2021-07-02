import type { SignedVC } from '@windingtree/org.id-auth/dist/vc';
import type { ORGJSON } from '@windingtree/org.json-schema';
import type { OrgIdContract, OrgIdData } from '@windingtree/org.id-core';
import type {
  ResolverOptions,
  DidResolutionResult
} from './types';

import { validateResolverOptions } from './api/validateResolverOptions';
import { validateOrgIdDidFormat } from './api/validateOrgIdDidFormat';
import { createOrgIdContract } from './api/createOrgIdContract';
import { getOrgId } from './api/getOrgId';
import { fetchOrgJson } from './api/fetchOrgJson';
import { buildBlockchainAccountId } from './api/buildBlockchainAccountId';
import { verifyOrgJsonVC } from './api/verifyOrgJsonVC';
import { buildResolutionResult } from './api/buildResolutionResult';

export class OrgIdResolver {
  options: ResolverOptions;

  constructor (config: ResolverOptions) {
    validateResolverOptions(config);
    this.options = config;
  }

  async resolve (didString: string): Promise<DidResolutionResult> {
    const resolutionStart = Date.now();
    let resolutionError: string | undefined;
    let orgIdContract: OrgIdContract;
    let orgIdData: OrgIdData | undefined;
    let credential: SignedVC | undefined;
    let didDocument: ORGJSON | undefined;

    try {
      // Validate ORGiD DID string
      const {
        subMethod,
        orgId
      } = validateOrgIdDidFormat(didString, this.options);

      // Create ORGiD smart contract instance
      orgIdContract = createOrgIdContract(subMethod, this.options);

      // Lookup given ORGiD in the smart contract
      const orgIdDataResult = await getOrgId(orgIdContract, orgId);

      if (orgIdDataResult === null) {
        throw new Error(`ORGiD not found: ${orgId}`);
      }

      orgIdData = orgIdDataResult;

      // Fetch ORG.JSON VC by given link
      credential = await fetchOrgJson(orgIdData.orgJsonUri, this.options);

      // Build a blockchain account Id
      if (!this.options.didSubMethods[subMethod]) {
        throw new Error(`DID submethod not supported: ${subMethod}`);
      }

      // Build a blockchain account Id
      const blockchainAccountId = buildBlockchainAccountId(
        subMethod,
        orgIdDataResult.owner,
        this.options
      );

      // Verify ORG.JSON VC
      didDocument = await verifyOrgJsonVC(credential, blockchainAccountId);

    } catch (error) {
      resolutionError = error.message;
    }

    // Build DID resolution result
    return buildResolutionResult(
      resolutionStart,
      orgIdData,
      credential,
      didDocument,
      resolutionError
    );
  }
}
