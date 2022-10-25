import type { VoidSigner, Signer } from 'ethers';
import type {
  OrgIdSetup,
  OrgIdRegistrationResult,
  TestOverrideOptions
} from '@windingtree/org.id-test-setup';
import type { ORGJSONVCNFT } from '@windingtree/org.json-schema/types/orgVc';
import type {
  ChainConfig,
  FetcherConfig,
  OrgIdResolverAPI,
  ResolverOptions
} from '../src';
import { orgIdSetup } from '@windingtree/org.id-test-setup';
import {
  generateSalt,
  generateOrgIdWithSigner
} from '@windingtree/org.id-utils/dist/common';
import {
  parseDid,
  parseUri
} from '@windingtree/org.id-utils/dist/parsers';
import {
  OrgIdResolver,
  buildEvmChainConfig,
  buildHttpFetcherConfig
} from '../src';
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

  describe('#parseDid',  () => {

    it('should throw if invalid DID provided', async () => {
      const invalidDids = [
        'invalid:did',
        'did:123456:qwerty',
        'did:qwerty:4:0x9300bad07f0b9d904b23781e8bbb05c1219530c51e7e494701db2539b7a5a119',
        'did:orgid:4:0x9300bad07',
        'did:orgid:ropsten:0x9300bad07f0b9d904b23781e8bbb05c1219530c51e7e494701db2539b7a5a119'
      ];
      invalidDids.forEach(did => {
        expect(() => parseDid(did)).to.Throw(`Invalid DID format: ${did}`);
      });
    });

    it('should parse DID', async () => {
      const did = 'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?service=files&relative-ref=%2Fmyresume%2Fdoc%3Fversion%3Dlatest#intro';
      const didParsed = {
        did: 'did:orgid:1:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        method: 'orgid',
        orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        query: 'service=files&relative-ref=%2Fmyresume%2Fdoc%3Fversion%3Dlatest',
        fragment: 'intro'
      };
      const result = parseDid(did);
      Object.keys(didParsed).forEach(key => {
        expect(result).to.haveOwnProperty(key).to.equal(didParsed[key]);
      });
    });
  });

  describe('#parseUri', () => {

    it('should throw if invalid URI provided', async () => {
      const invalidUris = [
        'https://blaqwert1-as^dsad.domain1-2-aaa.io:8080/path/to/file?user=allowed#readme',
        'https://blaqwert1-asdsad.domain1-2-aaa.io@8080/path/to?user=allowed#readme',
        'hzzz://blaqwert1-asdsad.domain1-2-aaa.io@8080/path/to?user=allowed#readme',
        'ws://0.0.0.0',
        'wss://0.0.0.0',
        'ifps://QMYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'
      ];
      invalidUris.forEach(uri => {
        expect(() => parseUri(uri)).to.Throw(`Invalid URI: ${uri}`);
      });
    });

    it('should parse URI', async () => {
      const validUris = [
        'https://blaqwert1-asdsad.domain1-2-aaa.io:8080/path/to/file?user=allowed#readme',
        'http://blaqwert1-asdsad.domain1-2-aaa.io:8080/path/to?user=allowed#readme',
        'QMYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
        'bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q',
        'zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7',
        'ipfs://QMYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
        'ipfs://bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q',
        'ipfs://zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7'
      ];
      const parsedUris = [
        {
          uri: 'https://blaqwert1-asdsad.domain1-2-aaa.io:8080/path/to/file?user=allowed#readme',
          type: 'http'
        },
        {
          uri: 'http://blaqwert1-asdsad.domain1-2-aaa.io:8080/path/to?user=allowed#readme',
          type: 'http'
        },
        {
          uri: 'QMYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
          type: 'ipfs'
        },
        {
          uri: 'bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q',
          type: 'ipfs'
        },
        {
          uri: 'zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7',
          type: 'ipfs'
        },
        {
          uri: 'QMYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
          type: 'ipfs'
        },
        {
          uri: 'bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q',
          type: 'ipfs'
        },
        {
          uri: 'zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7',
          type: 'ipfs'
        }
      ];
      validUris.forEach((uri, index) => {
        const result = parseUri(uri);
        expect(result).to.haveOwnProperty('uri').to.equal(parsedUris[index].uri);
        expect(result).to.haveOwnProperty('type').to.equal(parsedUris[index].type);
      });
    });
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
        .to.equal('Unsupported blockchain Id "1"');
    });

    it('should return error if DID with unsupported blockchain Id provided', async () => {
      const invalidNetwork = '1111';
      const response = await resolver.resolve(
        `did:orgid:${invalidNetwork}:0xd097e8f7a4ff4a11fb3dcfe38a212f0d9fd56373e925a8c8a4f716567606b207`
      )
      expect(response.didResolutionMetadata.error)
        .to.equal(`Unsupported blockchain Id "${invalidNetwork}"`);
    });

    it('should return error if DID with unknown ORGiD provided', async () => {
      const unknownId = '0xd097e8f7a4ff4a11fb3dcfe38a212f0d9fd56373e925a8c8a4f716567606b207';
      const response = await resolver.resolve(
        `did:orgid:1337:${unknownId}`
      )
      expect(response.didResolutionMetadata.error)
        .to.equal(`ORGiD "${unknownId}" not found`);
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
        .to.equal(`Unsupported URI fetcher "http"`);
    });

    it('should return error if OrgJson type not found in VC', async () => {
      const overrides: TestOverrideOptions = {
        vcType: []
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.equal('VC must include "OrgJson" type');
    });

    it('should return error if verificationMethod definition not found in VC proof', async () => {
      const overrides: TestOverrideOptions = {
        vcProofVerificationMethod: ''
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      expect(response.didResolutionMetadata.error)
        .to.equal('Verification method definition not found in VC proof');
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
            "blockchainAccountId": "eip155:1337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          }
        ]
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      const verificationMethod = orgIdData.orgJson.proof.verificationMethod;
      expect(response.didResolutionMetadata.error)
        .to.equal(`Verification method "${verificationMethod}" not found in ORG.JSON`);
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
          `is revoked at "${invalidityDate}"`
        );
    });

    it('should return error if proofs verificationMethod in orgJson has missed blockchainAccountId', async () => {
      const owner = signers[0];
      const orgIdSalt = generateSalt();
      const orgIdHash = await generateOrgIdWithSigner(owner, orgIdSalt);
      const overrides: TestOverrideOptions = {
        orgIdSalt,
        vcProofVerificationMethod: `did:orgid:1337:${orgIdHash}#key-111`,
        orgJsonVerificationMethod: [// Fake method
          {
            "id": `did:orgid:1337:${orgIdHash}#key-111`,
            "controller": `did:orgid:1337:${orgIdHash}`,
            "type": "EcdsaSecp256k1RecoveryMethod2020"
          }
        ]
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      // console.log(JSON.stringify(orgIdData, null, 2));
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      const verificationMethod = orgIdData.orgJson.proof.verificationMethod;
      expect(response.didResolutionMetadata.error)
        .to.equal(
          'Verification method of type "EcdsaSecp256k1RecoveryMethod2020" must include blockchainAccountId'
        );
    });

    it('should return error if verificationMethod in orgJson has invalid blockchainId', async () => {
      const owner = signers[0];
      const ownerAddress = await signers[0].getAddress();
      const orgIdSalt = generateSalt();
      const orgIdHash = await generateOrgIdWithSigner(owner, orgIdSalt);
      const invalidBlockchainType = 'unknown';
      const overrides: TestOverrideOptions = {
        orgIdSalt,
        vcProofVerificationMethod: `did:orgid:1337:${orgIdHash}#key-111`,
        orgJsonVerificationMethod: [
          {
            "id": `did:orgid:1337:${orgIdHash}#key-111`,
            "controller": `did:orgid:1337:${orgIdHash}`,
            "type": "EcdsaSecp256k1RecoveryMethod2020",
            "blockchainAccountId": `${invalidBlockchainType}:1337:${ownerAddress}`
          }
        ]
      };
      const orgIdData = await setup.registerOrgId(signers[0] as VoidSigner, overrides)
      // console.log(JSON.stringify(orgIdData, null, 2));
      const response = await resolver.resolve(orgIdData.orgJson.issuer);
      const verificationMethod = orgIdData.orgJson.proof.verificationMethod;
      expect(response.didResolutionMetadata.error)
        .to.equal(
          `Verification method blockchain type "eip155" and Id "1337" are expected but found "${invalidBlockchainType}" and "1337" in the VC proof`
        );
    });

    it('should resolve did', async () => {
      const didResponse = await resolver.resolve(orgIds[0].orgJson.issuer);
      // console.log(JSON.stringify(didResponse, null, 2));
    });

    it('should resolve did that uses capability delegation (1 level)', async () => {
      // Create delegate ORGID
      const delegateOwner = setup.signers[3];
      const { orgJson } = await setup.registerOrgId(delegateOwner as VoidSigner);

      // Create ORGiD
      const overrides: TestOverrideOptions = {
        signWithDelegate: {
          delegate: orgJson as ORGJSONVCNFT,
          signer: delegateOwner as VoidSigner
        }
      };
      const owner = setup.signers[4];
      const { orgJson: delegatedOrgJson } = await setup.registerOrgId(owner as VoidSigner, overrides);
      const didResponse = await resolver.resolve(delegatedOrgJson.credentialSubject.id as string);

      // console.log(didResponse);
    });

    it('should resolve did that uses capability delegation (2 level)', async () => {
      // Level 0 (delegate of Level 1)
      const owner0 = setup.signers[3];
      const { orgJson: orgJson0 } = await setup.registerOrgId(owner0 as VoidSigner);

      // Level 1 (delegate of Level 2)
      const overrides1: TestOverrideOptions = {
        signWithDelegate: {
          delegate: orgJson0 as ORGJSONVCNFT,
          signer: owner0 as VoidSigner
        }
      };
      const owner1 = setup.signers[4];
      const { orgJson: orgJson1 } = await setup.registerOrgId(owner1 as VoidSigner, overrides1);

      // Level 2
      const overrides2: TestOverrideOptions = {
        signWithDelegate: {
          delegate: orgJson1 as ORGJSONVCNFT,
          signer: owner1 as VoidSigner
        }
      };
      const owner2 = setup.signers[5];
      const { orgJson: orgJson2 } = await setup.registerOrgId(owner2 as VoidSigner, overrides2);

      const didResponse = await resolver.resolve(orgJson2.credentialSubject.id as string);

      // console.log(didResponse);
    });
  });
});
