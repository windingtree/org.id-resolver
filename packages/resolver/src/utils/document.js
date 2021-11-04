const makeHash = (jsonString, web3) => web3.utils
    .soliditySha3(jsonString);
module.exports.makeHash = makeHash;
