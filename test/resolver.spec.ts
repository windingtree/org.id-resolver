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

// testing source
import type {
  ResolverOptions
} from '../src';
import {
  validateOrgIdDidFormat,
  createOrgIdContract
} from '../src';

describe('ORGiD DID Resolver', () => {
  let setup: OrgIdSetup;
  let options: ResolverOptions;
  let orgIdContractAddress: string;
  let contract: OrgIdContract;
  let orgIds: OrgIdRegistrationResult[];

  beforeAll(async () => {
    setup = await orgIdSetup();
    orgIdContractAddress = setup.address;
    options = {
      didSubMethods: {
        'main': setup.server.providerUri,
        'ropsten': setup.server.providerUri
      }
    };
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

  describe('#validateOrgIdDidFormat', () => {
    const dids = [
      'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1',
      'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1',
      'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d#key-1',
      'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d#key-1',
      'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a',
      'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a',
      'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
      'did:orgid:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d'
    ];
    const didsParts = [
      {
        did: 'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        method: 'orgid',
        subMethod: 'ropsten',
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
        did: 'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        method: 'orgid',
        subMethod: 'ropsten',
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
        did: 'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        method: 'orgid',
        subMethod: 'ropsten',
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
        did: 'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d',
        method: 'orgid',
        subMethod: 'ropsten',
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
        'didorgidropsten0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1',
        'did:orgid:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5'
      ];
      testInput.forEach(ti => {
        expect(() => {
          validateOrgIdDidFormat(ti, options);
        }).toThrow(`Invalid DID format: ${ti}`);
      });
    });

    test('should fail if unsupported submethod provided', async () => {
      const testInput = 'did:ethr:ropsten:0x7b15197de62b0bc73da908b215666c48e1e49ed38e4486f5f6f094458786412d?aaa=zzz&fff=a#key-1';
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
      expect(() => createOrgIdContract('ropsten', {}))
        .toThrow('Allowed DID submethods must be provided in options');
    });

    test('should fail if submethod not supported', async () => {
      expect(() => createOrgIdContract('test', options))
        .toThrow('DID submethod not supported: test');
    });

    test('should create contract instance', async () => {
      const orgIdInstance = await createOrgIdContract('ropsten', options);
      expect(orgIdInstance).toBeInstanceOf(OrgIdContract);
    });
  });
});
