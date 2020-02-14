const path = require('path');
const { Contracts, AppProject, ZWeb3 } = require('@openzeppelin/upgrades');
const { commands } = require('@openzeppelin/cli');
const { zeroAddress } = require('./misc');
const {
    createOrganization,
    createSubsidiary
} = require('./organizations');

const legalEntityJson = require('../../assets/legalEntity.json');
const organizationalUnitJson = require('../../assets/organizationalUnit.json');

const contractsPath = path.join(__dirname, '../../node_modules/@windingtree/wt-contracts/contracts');
const artifactsPath = path.join(__dirname, '../../build');

module.exports.setupContracts = async (solcVersion = '0.5.16') => {
    Contracts.setLocalContractsDir(contractsPath);
    Contracts.setLocalBuildDir(artifactsPath);

    // Compile contracts from the source
    await commands.compile.action({
        solcVersion,
        optimizer: true,
        optimizerRuns: 200
    });
};

module.exports.setupOrganizations = async (
    accounts,
    uriSimulator
) => {
    const legalEntityOwner = accounts[1];
    const orgUnitOwner = accounts[1];// the same for less operations

    Contracts.setLocalContractsDir(contractsPath);
    Contracts.setLocalBuildDir(artifactsPath);
    Contracts.setArtifactsDefaults({
        gas: 0xfffffffffff
    });
    ZWeb3.initialize(web3.currentProvider);

    const project = await AppProject.fetchOrDeploy(
        'Organization',
        '0.1.0',
        {
            from: legalEntityOwner
        }
    );

    const legalEntity = await createOrganization(
        project,
        uriSimulator,
        legalEntityOwner,
        legalEntityJson,
        zeroAddress,
        zeroAddress
    );

    const orgUnit = await createSubsidiary(
        uriSimulator,
        legalEntity,
        organizationalUnitJson,
        orgUnitOwner
    );

    return {
        legalEntity,
        orgUnit
    };
};

