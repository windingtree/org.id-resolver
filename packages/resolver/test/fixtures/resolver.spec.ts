import type { VoidSigner } from 'ethers';
import type { OrgIdSetup, OrgIdRegistrationResult } from '@windingtree/org.id-test-setup';
import type {
  OrgIdResolverAPI,
  ResolverOptions
} from '../../src';
import { orgIdSetup } from '@windingtree/org.id-test-setup';
import {
  OrgIdResolver,
  buildEvmChainConfig,
  buildHttpFetcherConfig
} from '../../src';
import chai, { expect } from 'chai';
import chp from 'chai-as-promised';
chai.use(chp);

describe('ORGiD DID Resolver', () => {
  let setup: OrgIdSetup;
  let orgIdContractAddress: string;
  let orgIds: OrgIdRegistrationResult[];
  let resolver: OrgIdResolverAPI;

  before(async () => {
    setup = await orgIdSetup();
    orgIdContractAddress = setup.orgIdContract.address;
    orgIds = await Promise.all(
      setup.signers.map(
        signer => setup.registerOrgId(signer as VoidSigner)
      )
    );
    const chainConfig = buildEvmChainConfig(
      '1337',
      'eip155',
      orgIdContractAddress,
      setup.orgIdContract.provider
    );
    const httpFetcherConfig = buildHttpFetcherConfig();
    const resolverOptions: ResolverOptions = {
      chains: [
        chainConfig
      ],
      fetchers: [
        httpFetcherConfig
      ]
    };

    resolver = OrgIdResolver(resolverOptions);
  });

  after(async () => {
    setup.close();
  });

  describe('#resolve', () => {

    it('should expose method', async () => {
      expect(resolver).to.haveOwnProperty('resolve').to.be.a('function');
    });

    it('should resolve did', async () => {
      const didResponse = await resolver.resolve(orgIds[0].orgJson.issuer);
      console.log(didResponse);
    });
  });
});
