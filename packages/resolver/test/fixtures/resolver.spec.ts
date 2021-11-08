import type { VoidSigner, Signer } from 'ethers';
import type {
  OrgIdSetup,
  OrgIdRegistrationResult,
  TestOverrideOptions
} from '@windingtree/org.id-test-setup';
import type {
  ChainConfig,
  FetcherConfig,
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
  let signers: Signer[];
  let chainConfig: ChainConfig;
  let httpFetcherConfig: FetcherConfig;

  before(async () => {
    setup = await orgIdSetup();
    orgIdContractAddress = setup.orgIdContract.address;
    signers = setup.signers;
    orgIds = await Promise.all(
      setup.signers.map(
        signer => setup.registerOrgId(signer as VoidSigner)
      )
    );
    chainConfig = buildEvmChainConfig(
      '1337',
      'eip155',
      orgIdContractAddress,
      setup.orgIdContract.provider
    );
    httpFetcherConfig = buildHttpFetcherConfig();
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

    it('should return error if DID without blockchain Id provided', async () => {
      const response = await resolver.resolve(
        'did:orgid:0xd097e8f7a4ff4a11fb3dcfe38a212f0d9fd56373e925a8c8a4f716567606b207'
      )
      expect(response.didResolutionMetadata.error)
        .to.equal('Unsupported blockchain Id: 1');
    });

    it('should return error if DID with unsupported blockchain Id provided', async () => {
      const invalidNetwork = '1111';
      const response = await resolver.resolve(
        `did:orgid:${invalidNetwork}:0xd097e8f7a4ff4a11fb3dcfe38a212f0d9fd56373e925a8c8a4f716567606b207`
      )
      expect(response.didResolutionMetadata.error)
        .to.equal(`Unsupported blockchain Id: ${invalidNetwork}`);
    });

    it('should return error if DID with unknown ORGiD provided', async () => {
      const unknownId = '0xd097e8f7a4ff4a11fb3dcfe38a212f0d9fd56373e925a8c8a4f716567606b207';
      const response = await resolver.resolve(
        `did:orgid:1337:${unknownId}`
      )
      expect(response.didResolutionMetadata.error)
        .to.equal(`Organization with Id ${unknownId} not found`);
    });

    it('should return error if unsupported orgJson URI provided', async () => {
      const resolverOptions: ResolverOptions = {
        chains: [
          chainConfig
        ],
        fetchers: []
      };
      const resolver = OrgIdResolver(resolverOptions);
      const response = await resolver.resolve(orgIds[0].orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.equal(`Unsupported URI fetcher: http`);
    });

    it('should return error if OrgJson type not found in VC', async () => {
      const overrides: TestOverrideOptions = {
        vcType: []
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.equal('VC must include OrgJson type');
    });

    it('should return error if verificationMethod definition not found in VC proof', async () => {
      const overrides: TestOverrideOptions = {
        vcProofVerificationMethod: ''
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.equal('Verification method not found in VC proof');
    });

    it('should return error if verificationMethods definition not found in orgJson', async () => {
      const overrides: TestOverrideOptions = {
        orgJsonVerificationMethod: []
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.equal('Verification methods definition not found in ORG.JSON');
    });

    it('should return error if proofs verificationMethod definition not found in orgJson', async () => {
      const overrides: TestOverrideOptions = {
        orgJsonVerificationMethod: [// Fake method
          {
            "id": "did:orgid:1337:0x2389deb1e582b49ab388c7ebc16b49e5a95e0b8c92ffa9c74881a9904074de9a#key-100",
            "controller": "did:orgid:1337:0x2389deb1e582b49ab388c7ebc16b49e5a95e0b8c92ffa9c74881a9904074de9a",
            "type": "EcdsaSecp256k1RecoveryMethod2020",
            "blockchainAccountId": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266@eip155:1337"
          }
        ]
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      const verificationMethod = orgIdData.orgJson.proof.verificationMethod;
      expect(response.didResolutionMetadata.error)
        .to.equal(`Verification method ${verificationMethod} not found in ORG.JSON`);
    });

    it('should return error if ORG.JSON verificationMethod revoked', async () => {
      const invalidityDate = new Date().toISOString();
      const overrides: TestOverrideOptions = {
        orgJsonVerificationMethodRevocation: {
          reason: 'privilegeWithdrawn',
          invalidityDate
        }
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.contain(
          `is revoked at ${invalidityDate}`
        );
    });

    // it('should throw if', async () => {});

    // it('should throw if', async () => {});

    it('should resolve did', async () => {
      const didResponse = await resolver.resolve(orgIds[0].orgJson.issuer);
      // console.log(JSON.stringify(didResponse, null, 2));
    });
  });
});
