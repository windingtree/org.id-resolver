const { Contracts } = require('@openzeppelin/upgrades');
const { zeroAddress } = require('./misc');

const makeHash = jsonString => web3.utils.soliditySha3(jsonString);
module.exports.makeHash = makeHash;

module.exports.createOrganization = async (
    project,
    uriSimulator,
    owner,
    orgidJson,
    parentEntity,
    entityDirector
) => {
    const appAddress = project.app.address;
    const proxyAdmin = await project.getAdminAddress() ||
        (await project.ensureProxyAdmin()).address;

    const Organization = Contracts.getFromLocal('Organization');
    const projectImplementationDirectory = await project.getCurrentDirectory();
    const implementationAddress = await projectImplementationDirectory
        .getImplementation('Organization');

    if (implementationAddress === zeroAddress) {
        await project.setImplementation(
            Organization,
            'Organization'
        );
    }

    // Initial set of resource
    let jsonString = JSON.stringify(orgidJson);
    const uri = uriSimulator.set(jsonString);
    let hash = makeHash(jsonString);

    // Initial deployment
    const orgProxy = await project.createProxy(Organization, {
        initArgs: [
            owner,
            uri,
            hash,
            appAddress,
            proxyAdmin,
            parentEntity,
            entityDirector
        ]
    });

    // Update DID in the json file
    const storedJson = JSON.parse(uriSimulator.get(uri));
    storedJson.id = `did:orgid:${orgProxy.address}`;
    jsonString = JSON.stringify(storedJson);

    // Create new resource hash
    hash = makeHash(jsonString);

    // Source updated so update the resource
    uriSimulator.update(uri, jsonString);

    // Update has on the contract
    await orgProxy
        .methods['changeOrgJsonHash(bytes32)'](hash)
        .send({ from: owner });
    
    return orgProxy;
};

module.exports.createSubsidiary = async (
    uriSimulator,
    organization,
    orgidJson,
    entityDirector
) => {
    // Initial set of resource
    let jsonString = JSON.stringify(orgidJson);
    const uri = uriSimulator.set(jsonString);
    let hash = makeHash(JSON.stringify(orgidJson));

    // Get actual owner of the parent organization
    const from = await organization.methods['owner()']().call();

    // Create the subsidiary organization
    const result = await organization
        .methods['createSubsidiary(string,bytes32,address,string,string)'](
            uri,
            hash,
            entityDirector,
            '',
            ''
        )
        .send({ from });

    const Organization = Contracts.getFromLocal('Organization');
    const subsidiaryProxy = await Organization.at(result.events.SubsidiaryCreated.returnValues.subsidiary);

    // Update DID in the json file
    const storedJson = JSON.parse(uriSimulator.get(uri));
    storedJson.id = `did:orgid:${subsidiaryProxy.address}`;
    jsonString = JSON.stringify(storedJson);

    // Create new resource hash
    hash = makeHash(jsonString);

    // Source updated so update the resource
    uriSimulator.update(uri, jsonString);

    // Update has on the contract
    await subsidiaryProxy
        .methods['changeOrgJsonHash(bytes32)'](hash)
        .send({ from: entityDirector });

    return subsidiaryProxy;
};
