import type {
  OrgIdSetup,
  OrgIdRegistrationResult
} from '@windingtree/org.id-test-setup';
import {
  orgIdSetup
} from '@windingtree/org.id-test-setup';
import {
  OrgIdContract, OrgIdData
} from '@windingtree/org.id-core';

// testing source
import type {
  ResolverOptions
} from '../src/types';
import {
  validateOrgIdDidFormat,
  createOrgIdContract,
  getOrgId,
  validateOrgJsonUri,
  fetchOrgJson
} from '../src/api';

describe('ORGiD DID Resolver', () => {
  let setup: OrgIdSetup;
  let options: ResolverOptions;
  let orgIdContractAddress: string;
  let accounts: string[];
  let orgIds: OrgIdRegistrationResult[];
  let orgIdInstance: OrgIdContract;
  let knownOrgIdHash: string;
  let knownOwner: string;

  beforeAll(async () => {
    setup = await orgIdSetup();
    orgIdContractAddress = setup.address;
    accounts = await setup.server.getAccounts();
    options = {
      didSubMethods: {
        'main': {
          provider: setup.server.providerUri
        },
        'test': {
          provider: setup.server.providerUri,
          address: orgIdContractAddress
        }
      }
    };
    orgIds = await Promise.all(
      setup.accounts.map(
        address => setup.registerOrgId(
          address
        )
      )
    );
    knownOrgIdHash = orgIds[0].orgIdHash;
    knownOwner = accounts[0];
    orgIdInstance = createOrgIdContract('test', options);
  });

  afterAll(async () => {
    await setup.close();
  });

  describe('API unit tests', () => {

    describe('#validateOrgIdDidFormat', () => {
      const dids = [
        'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1',
        'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1',
        'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d#key-1',
        'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d#key-1',
        'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a',
        'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a',
        'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d'
      ];
      const didsParts = [
        {
          did: 'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'test',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          query: 'aaa=zzz&fff=a',
          fragment: 'key-1'
        },
        {
          did: 'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'main',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          query: 'aaa=zzz&fff=a',
          fragment: 'key-1'
        },
        {
          did: 'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'test',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          fragment: 'key-1'
        },
        {
          did: 'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'main',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          fragment: 'key-1'
        },
        {
          did: 'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'test',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          query: 'aaa=zzz&fff=a'
        },
        {
          did: 'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'main',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          query: 'aaa=zzz&fff=a'
        },
        {
          did: 'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'test',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d'
        },
        {
          did: 'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
          method: 'orgid',
          subMethod: 'main',
          orgId: '0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d'
        }
      ];

      test('should fail if invalid did provided', async () => {
        const testInput = [
          'didorgidtest0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1',
          'did:orgid:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5'
        ];
        testInput.forEach(ti => {
          expect(() => {
            validateOrgIdDidFormat(ti, options);
          }).toThrow(`Invalid DID format: ${ti}`);
        });
      });

      test('should fail if unsupported submethod provided', async () => {
        const testInput = 'did:ethr:test:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1';
        expect(() => {
          validateOrgIdDidFormat(testInput, options);
        }).toThrow(`Unsupported DID method: ethr`);
      });

      test('should fail if unsupported submethod provided', async () => {
        const testInput = 'did:orgid:goerli:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1';
        expect(() => {
          validateOrgIdDidFormat(testInput, options);
        }).toThrow(`Unsupported DID submethod: goerli`);
      });

      test('should fail if invalid options provided', async () => {
        const testInput = 'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d';
        expect(() => {
          validateOrgIdDidFormat(testInput, {} as ResolverOptions);
        }).toThrow(/must have required property 'didSubMethods'/);
      });

      test('should validate did and extract did parts', async () => {
        dids.forEach((orgIdDid, index) => {
          const {
            did,
            method,
            subMethod,
            orgId,
            query,
            fragment
          } = validateOrgIdDidFormat(orgIdDid, options);
          expect(did).toBe(didsParts[index].did);
          expect(method).toBe(didsParts[index].method);
          expect(subMethod).toBe(didsParts[index].subMethod);
          expect(orgId).toBe(didsParts[index].orgId);
          expect(query).toBe(didsParts[index].query);
          expect(fragment).toBe(didsParts[index].fragment);
        });
      });
    });

    describe('#createOrgIdContract', () => {

      test('should fail if submethod not provided', async () => {
        expect(() => createOrgIdContract((undefined) as any, options))
          .toThrow('DID submethod must be provided');
        expect(() => createOrgIdContract('', options))
          .toThrow('DID submethod must be provided');
      });

      test('should fail if submethods not defined in options', async () => {
        expect(() => createOrgIdContract('test', {} as ResolverOptions))
          .toThrow(/must have required property 'didSubMethods'/);
      });

      test('should fail if submethod not supported', async () => {
        expect(() => createOrgIdContract('unknown', options))
          .toThrow('DID submethod not supported: unknown');
      });

      test('should fail if provider not provided in submethod option', async () => {
        expect(() => createOrgIdContract('test', {
          didSubMethods: {
            'test': {
              address: orgIdContractAddress
            }
          }
        } as unknown as ResolverOptions)).toThrow(/must have required property 'provider'/);
      });

      test('should create contract instance', async () => {
        const orgIdInstance = createOrgIdContract('test', options);
        expect(orgIdInstance).toBeInstanceOf(OrgIdContract);
      });
    });

    describe('#getOrgId', () => {

      test('should fail if invalid contract provided', async () => {
        expect(async () => getOrgId({} as OrgIdContract, knownOrgIdHash))
          .rejects
          .toThrow('Invalid OrgIdContract instance');
      });

      test('should get ORGiD by hash', async () => {
        const orgId = await getOrgId(orgIdInstance, knownOrgIdHash) as OrgIdData;
        expect(orgId).not.toBeNull();
        expect(orgId.id).toBe(knownOrgIdHash);
        expect(orgId.owner).toBe(knownOwner);
        expect(typeof orgId.orgJsonUri).toBe('string');
        expect(typeof orgId.created).toBe('string');
      });
    });

    describe('#validateOrgJsonUri', () => {
      const validUri = [
        'http://domain.com/path/to/org.json',
        'https://domain.com/path/to/org.json',
        'https://domain.com:4040/path/to/org.json',
        'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
        'bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q',
        'zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7'
      ];
      const invalidUri = [
        'ftp://domain.com/org.json',
        'wss://domain.com:9090/org.json'
      ];

      test('should validate ORG.JSON URI', async () => {
        validUri.forEach(uri => {
          expect(() => validateOrgJsonUri(uri)).not.toThrow();
        });
      });

      test('should fail if unsupported ORG.JSON URI provided', async () => {
        invalidUri.forEach(uri => {
          expect(() => validateOrgJsonUri(uri)).toThrow(
            `Unsupported ORG.JSON URI type: ${uri}`
          );
        });
      });
    });

    describe('#fetchOrgJson', () => {
      let orgId: OrgIdData;

      beforeAll(async () => {
        orgId = await getOrgId(orgIdInstance, knownOrgIdHash) as OrgIdData;
      });

      test('should fail if unknown uri provided', async () => {
        expect.assertions(1);
        await expect(fetchOrgJson(
          `${orgId.orgJsonUri}INVALID`,
          options
        ))
          .rejects
          .toThrow('Request failed with status code 404');
      });

      test('should fetch ORG.JSON VC', async () => {
        const orgJsonVc = await fetchOrgJson(
          orgId.orgJsonUri,
          options
        );
        expect(typeof orgJsonVc).toBe('object');
      });

      // test('should fetch ORG.JSON VC via IPNS', () => {});
    })
  });

  // describe('Integration tests', () => {});
});
