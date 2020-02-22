const contract = require('@truffle/contract');

module.exports.createContract = (schema, web3) => {
    const instance = contract(schema);
    instance.setProvider(web3.currentProvider);
    return instance;
};
