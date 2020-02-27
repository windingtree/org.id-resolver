const { Contracts } = require('@openzeppelin/upgrades');
const { toWeiEther } = require('./common');

/**
 * Creates token instance
 * @param {string} from The token owner address
 * @param {string} totalSupply Amount of tokens to mint
 * @returns {Promise<{Object}>} The token instance
 */
module.exports.setupLifToken = async (
    from,
    totalSupply = '1000000'
) => {
    const LifToken = Contracts.getFromNodeModules('@windingtree/org.id', 'LifTest');
    return await LifToken.new(
        'Lif token',
        'Lif',
        18,
        toWeiEther(totalSupply),
        {
            from
        }
    );
};

/**
 * Get Lif token instance by the address
 * @param {string} tokenAddress Lif token address
 * @returns {Promise<{Object}>}
 */
module.exports.lifTokenAtAddress = async (tokenAddress) => {
    const LifToken = Contracts.getFromNodeModules('@windingtree/org.id', 'LifTest');
    return await LifToken.at(tokenAddress);
};

/**
 * Sends tokens to the list of address
 * @param {Object} token The token instance
 * @param {string} from The token owner address
 * @param {string} value Amount of tokens to send
 * @param {string[]} distributionList Array of addresses
 * @returns {Promise}
 */
module.exports.distributeLifTokens = async (
    token,
    from,
    value,
    distributionList = []
) => await Promise.all(distributionList.map(
    addr => token.methods['mint(address,uint256)'](
        addr,
        toWeiEther(value)
    ).send({ from })
));
