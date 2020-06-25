const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

const legalEntityJson = require('../../assets/legalEntity.json');
const organizationalUnitJson = require('../../assets/organizationalUnit.json');
const { setupLifToken } = require('./lif');
const { HttpFileServer } = require('./httpServer');
const { ResourceRecordTypes } = require('../../src/dns');

// Template for fake Google public DNS API response
const publicDnsResponse = {
    'Status': 0,
    'TC': false,
    'RD': true,
    'RA': true,
    'AD': false,
    'CD': false,
    'Question': [{
        'name': 'windingtree.com.',
        'type': 16
    }],
    'Answer': [
        {
            'name': 'windingtree.com.',
            'type': 16,
            'TTL': 299,
            'data': '\'orgid=0xE61d952f077EfF0C022cC0FEC841059DA2289526\''
        }
    ],
    'Comment': 'Response from 2606:4700:50::adf5:3acf.'
};

/**
 * Initialize HTTP server and set testing environment
 * @returns {Promise<{Object}>} Server instance
 */
module.exports.setupHttpServer = async () => {
    const httpFileServer = new HttpFileServer();
    await httpFileServer.start();
    process.env.FAKE_PUBLIC_DNS_URI =
        `http://localhost:${httpFileServer.port}/resolve`;
    process.env.FAKE_WEB_SERVER_URI =
        `http://localhost:${httpFileServer.port}`;
    
    global.httpFileServer = httpFileServer;
    return httpFileServer;
};

/**
 * Generates an id on the base of string and solt
 * @param {string} string Part of the base for id generation
 * @param {string} solt Solt string
 * @returns {string}
 */
const generateId = (string, solt = Math.random().toString()) => web3.utils.keccak256(`${string}${solt}`);
module.exports.generateId = generateId;

/**
 * Generates Json Hash
 * @param {Object} jsonString Stringified json object
 * @returns {string}
 */
const generateJsonHash = jsonString => web3.utils.soliditySha3(jsonString);
module.exports.generateJsonHash = generateJsonHash;

/**
 * Generates Id from owner adress and solt
 * @param {String} owner Owner address
 * @param {String} solt Solt
 * @returns {string}
 */
const generateIdWithSolt = (owner, solt) => web3.utils.soliditySha3(owner, solt);
module.exports.generateIdWithSolt = generateIdWithSolt;

/**
 * Generates trus assertions records
 * @param {string} did DID
 * @param {Object} uriSimulator URI simulator instance
 * @param {Object[]} config Assertions config
 * @returns {Promise<{Object}>}
 */
const generateTrustAssertions = (
    did,
    config = []
) => Promise.all(config.map(async (t) => {
    
    let record = {
        type: t.type
    };

    switch (t.type) {
        case 'dns':

            record.proof = t.proof;
            record.claim = t.claim;
            await global.httpFileServer.addFile({
                content: JSON.stringify(Object.assign(
                    publicDnsResponse,
                    {
                        Question: [
                            {
                                'name': `${t.claim}.`,
                                'type': ResourceRecordTypes[t.proof]
                            }
                        ],
                        Answer: [
                            {
                                'name': `${t.claim}.`,
                                'type': ResourceRecordTypes[t.proof],
                                'TTL': 299,
                                'data': `'orgid=${did}'`
                            }
                        ]
                    }
                )),
                type: 'json',
                path: `resolve?name=${t.claim}&type=${t.proof}`
            });

            break;
        
        case 'social':
        case 'domain':

            record.proof = `${process.env.FAKE_WEB_SERVER_URI}/${did}.txt`;
            record.claim = `localhost:${global.httpFileServer.port}`;
            await global.httpFileServer.addFile({
                content: `This is my DID: ${did}`,
                type: 'txt',
                path: `${did}.txt`
            });

            break;
        default:
    }

    return record;
}));

/**
 * Generates a set of values: Id, Uri and Hash
 * @param {string} from The address of the organization owner
 * @param {Object} jsonObject Organization json object
 * @param {string} fakeId Fake id to set
 * @returns {Promise<{Object}>}
 */
const generateIdSet = async (
    from,
    jsonObject,
    fakeId = false
) => {
    const solt = generateId();
    const id = generateIdWithSolt(from, solt);
    const did = `did:orgid:${fakeId ? fakeId : id}`;
    const orgJson = Object.assign(
        {},
        jsonObject,
        {
            id: did
        }
    );
    // Create some trust assertions records
    const trustAssertions = await generateTrustAssertions(
        did,
        [
            {
                type: 'dns',
                claim: did,
                proof: 'TXT'
            },
            {
                type: 'domain'
            },
            {
                type: 'social'
            }
        ]
    );
    orgJson.trust.assertions = trustAssertions;
    const jsonString = JSON.stringify(orgJson);
    const hash = generateJsonHash(jsonString);

    let uri;
    
    uri = `${process.env.FAKE_WEB_SERVER_URI}/${hash}.json`;
    await global.httpFileServer.addFile({
        content: jsonString,
        type: 'json',
        path: `${hash}.json`
    });

    return {
        solt,
        id,
        uri,
        hash
    };
};
module.exports.generateIdSet = generateIdSet;

/**
 * Create new OrgId instance
 * @param {string} from Org.Id owner address
 * @returns {Promise<{Object}>} OrgId contact instancr
 */
const setupOrgId = async from => {
    Contracts.setArtifactsDefaults({
        gas: 0xfffffffffff
    });
    ZWeb3.initialize(web3.currentProvider);

    const OrgId = Contracts.getFromNodeModules('@windingtree/org.id', 'OrgId');
    const project = await TestHelper({
        from
    });
    await project.setImplementation(
        OrgId,
        'OrgId'
    );

    return await project.createProxy(OrgId, {
        initMethod: 'initialize',
        initArgs: [
            from
        ]
    });
};
module.exports.setupOrgId = setupOrgId;

/**
 * Create new LifDeposit instance
 * @param {Object} orgId OrgId contract instance
 * @param {string} from OrgId owner address
 * @returns {Promise<{Object}>} OrgId contact instance
 */
const setupLifDeposit = async (orgId, from) => {
    const lifToken = await setupLifToken(from);
    const LifDeposit = Contracts.getFromNodeModules(
        '@windingtree/org.id-lif-deposit',
        'LifDeposit'
    );
    const project = await TestHelper({
        from
    });
    await project.setImplementation(
        LifDeposit,
        'LifDeposit'
    );

    return await project.createProxy(LifDeposit, {
        initMethod: 'initialize',
        initArgs: [
            from,
            orgId.address,
            lifToken.address
        ]
    });
};
module.exports.setupLifDeposit = setupLifDeposit;

/**
 * Create an organizations
 * @param {Object} orgId OrgId contract instance
 * @param {string} from The address of the organization owner
 * @param {Object} jsonFile Custom json file
 * @param {string} fakeUri Fake uri to set
 * @param {string} fakeHash Fake hash to set
 * @param {string} fakeId Fake id to set
 * @returns {Promise<{string}>} Organization Id
 */
const createOrganization = async (
    orgId,
    from,
    jsonFile = null,
    fakeUri = false,
    fakeHash = false,
    fakeId = false
) => {
    const { solt, id, uri, hash } = await generateIdSet(
        from,
        jsonFile ? jsonFile : legalEntityJson,
        fakeId
    );

    await orgId
        .methods['createOrganization(bytes32,bytes32,string,string,string)'](
            solt,
            fakeHash? fakeHash : hash,
            fakeUri ? fakeUri : uri,
            '',
            ''
        )
        .send({ from });
    return id;
};
module.exports.createOrganization = createOrganization;

/**
 * Create unit organization
 * @param {Object} orgId OrgId contract instance
 * @param {string} from The address of the organization owner
 * @param {string} parentId  Parent Organization Id
 * @param {string} director Organization director address
 * @param {Object} jsonFile Custom json file
 * @param {string} fakeUri Fake uri to set
 * @param {string} fakeHash Fake hash to set
 * @param {string} fakeId Fake id to set
 * @returns {Promise<{bool}>} Unit Id
 */
const createUnit = async (
    orgId,
    from,
    parentId,
    director,
    jsonFile = null,
    fakeUri = false,
    fakeHash = false,
    fakeId = false
) => {
    const { solt, id, uri, hash } = await generateIdSet(
        from,
        jsonFile ? jsonFile : organizationalUnitJson,
        fakeId
    );

    await orgId
        .methods['createUnit(bytes32,bytes32,address,bytes32,string,string,string)'](
            solt,
            parentId,
            director,
            fakeHash? fakeHash : hash,
            fakeUri ? fakeUri : uri,
            '',
            ''
        )
        .send({ from });
    return id;
};
module.exports.createUnit = createUnit;

/**
 * Setup organizations (main and unit)
 * @param {string} legalEntityOwner  Entity Owner Account addresses
 * @param {string} orgUnitOwner  Unit OwnerAccount addresses
 * @param {string} fakeUri Fake uri to set
 * @param {string} fakeHash Fake hash to set
 * @param {string} fakeId Fake id to set
 * @param {Object} fakeJson Fake json to set
 * @returns {Promise<{bool}>} Subsidiary Id
 */
module.exports.setupOrganizations = async (
    orgId,
    legalEntityOwner,
    orgUnitOwner,
    fakeUri = false,
    fakeHash = false,
    fakeId = false,
    fakeJson = false
) => {
    const legalEntity = await createOrganization(
        orgId,
        legalEntityOwner,
        fakeJson,
        fakeUri,
        fakeHash,
        fakeId
    );

    const orgUnit = await createUnit(
        orgId,
        legalEntityOwner,
        legalEntity,
        orgUnitOwner,
        fakeJson,
        fakeUri,
        fakeHash,
        fakeId
    );

    return {
        legalEntity,
        orgUnit
    };
};
