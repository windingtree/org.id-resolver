const makeHash = (jsonString, web3) => web3.utils
    .soliditySha3(
        JSON.stringify(JSON.parse(jsonString), null, 2)
    );
module.exports.makeHash = makeHash;
