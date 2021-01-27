const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

const legalEntityJson = require('../../assets/legalEntity.json');
const organizationalUnitJson = require('../../assets/organizationalUnit.json');

/**
 * Generates an id on the base of string and salt
 * @param {string} string Part of the base for id generation
 * @param {string} salt Salt string
 * @returns {string}
 */
const generateId = (string, salt) => web3.utils.soliditySha3(string, salt);
module.exports.generateId = generateId;

const generateSalt = () => web3.utils.keccak256(Math.random().toString());
module.exports.generateSalt = generateSalt;

/**
 * Generates Json Hash
 * @param {Object} jsonString Stringified json object
 * @returns {string}
 */
const generateJsonHash = jsonString => web3.utils.soliditySha3(jsonString);
module.exports.generateJsonHash = generateJsonHash;

/**
 * Generates a set of value: Id, Uri and Hash
 * @param {string} from The address of the organization owner
 * @param {Object} uriSimulator URI simulator instance
 * @param {Object} jsonObject Organization json object
 * @param {string} fakeId Fake id to set
 * @returns {Promise<{Object}>}
 */
const generateIdSet = async (
    from,
    uriSimulator,
    jsonObject,
    fakeId = false
) => {
    const salt = generateSalt();
    const id = generateId(from, salt);
    const orgJson = Object.assign(
        {},
        jsonObject,
        {
            id: `did:orgid:${fakeId ? fakeId : id}`
        }
    );
    const jsonString = JSON.stringify(orgJson);
    const hash = generateJsonHash(jsonString);

    let uri;

    if (uriSimulator.port) {
        uri = `http://localhost:${uriSimulator.port}/${hash}.json`;
        await uriSimulator.addFile({
            content: jsonString,
            type: 'json',
            path: `${hash}.json`
        });
    } else {
        uri = await uriSimulator.set(jsonString);
    }

    return {
        salt,
        id,
        uri,
        hash
    };
};
module.exports.generateIdSet = generateIdSet;

/**
 * Create new ORG.ID instance
 * @param {string} owner Org.Id owner address
 * @returns {Promise<{Object}>} OrgId contact instancr
 */
const setupOrgId = async (owner) => {
    Contracts.setArtifactsDefaults({
        gas: 0xfffffffffff
    });
    ZWeb3.initialize(web3.currentProvider);

    const OrgId = Contracts.getFromNodeModules('@windingtree/org.id', 'OrgId');
    const project = await TestHelper({
        from: owner
    });
    await project.setImplementation(
        OrgId,
        'OrgId'
    );

    return await project.createProxy(OrgId, {
        initMethod: 'initialize',
        initArgs: []
    });
};
module.exports.setupOrgId = setupOrgId;

/**
 * Create an organizations
 * @param {Object} orgId OrgId contract instance
 * @param {Object} uriSimulator URI simulator instance
 * @param {string} from The address of the organization owner
 * @param {Object} jsonFile Custom json file
 * @param {string} fakeUri Fake uri to set
 * @param {string} fakeHash Fake hash to set
 * @param {string} fakeId Fake id to set
 * @returns {Promise<{string}>} Organization Id
 */
const createOrganization = async (
    orgId,
    uriSimulator,
    from,
    jsonFile = null,
    fakeUri = false,
    fakeHash = false,
    fakeId = false
) => {
    const { salt, id, uri, hash } = await generateIdSet(
        from,
        uriSimulator,
        jsonFile ? jsonFile : legalEntityJson,
        fakeId
    );

    await orgId
        .methods['createOrganization(bytes32,bytes32,string,string,string)'](
            salt,
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
 * Create subsidiary organization
 * @param {Object} orgId OrgId contract instance
 * @param {Object} uriSimulator URI simulator instance
 * @param {string} from The address of the organization owner
 * @param {string} parentId  Parent Organization Id
 * @param {string} director Organization director address
 * @param {Object} jsonFile Custom json file
 * @param {string} fakeUri Fake uri to set
 * @param {string} fakeHash Fake hash to set
 * @param {string} fakeId Fake id to set
 * @returns {Promise<{bool}>} Subsidiary Id
 */
const createUnit = async (
    orgId,
    uriSimulator,
    from,
    parentId,
    director,
    jsonFile = null,
    fakeUri = false,
    fakeHash = false,
    fakeId = false
) => {
    const { salt, id, uri, hash } = await generateIdSet(
        from,
        uriSimulator,
        jsonFile ? jsonFile : organizationalUnitJson,
        fakeId
    );

    await orgId
        .methods['createUnit(bytes32,bytes32,address,bytes32,string,string,string)'](
            salt,
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
 * Setup organizations (main and subsidiary)
 * @param {string} legalEntityOwner  Entity Owner Account addresses
 * @param {string} orgUnitOwner  Unit OwnerAccount addresses
 * @param {Object} uriSimulator URI simulator instance
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
    uriSimulator,
    fakeUri = false,
    fakeHash = false,
    fakeId = false,
    fakeJson = false
) => {
    const legalEntity = await createOrganization(
        orgId,
        uriSimulator,
        legalEntityOwner,
        fakeJson,
        fakeUri,
        fakeHash,
        fakeId
    );

    const orgUnit = await createUnit(
        orgId,
        uriSimulator,
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

