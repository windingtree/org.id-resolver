import type { OrgIdData } from '@windingtree/org.id-core';
import { OrgIdContract } from '@windingtree/org.id-core';

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
