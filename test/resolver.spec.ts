import type {
  OrgIdSetup,
  OrgIdRegistrationResult
} from '@windingtree/org.id-test-setup';
import {
  orgIdSetup
} from '@windingtree/org.id-test-setup';
import {
  OrgIdContract
} from '@windingtree/org.id-core';

describe('ORGiD DID Resolver', () => {
  let setup: OrgIdSetup;
  let orgIdContractAddress: string;
  let contract: OrgIdContract;
  let orgIds: OrgIdRegistrationResult[];

  beforeAll(async () => {
    setup = await orgIdSetup();
    orgIdContractAddress = setup.address;
    orgIds = await Promise.all(
      setup.accounts.map(
        (address, i) => setup.registerOrgId(
          address
        )
      )
    );
    contract = new OrgIdContract(
      orgIdContractAddress,
      setup.server.providerUri
    );
  });

  afterAll(async () => {
    await setup.close();
  });

  test('AAA', async () => {
    console.log(orgIds);
  });
});
