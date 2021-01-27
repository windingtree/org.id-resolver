const Web3 = require('web3');
const ganache = require('ganache-core');

// Setup global web3 instance
global.web3 = new Web3();

// Ganache port counter
let portNumber = 9000;

module.exports.ganache = (options = {}) => new Promise((resolve, reject) => {
    const server = ganache.server(options);
    const provider = ganache.provider(options);
    provider.setMaxListeners(Infinity);

    // Set web3 provider
    web3.setProvider(provider);

    server.listen(options.port ? options.port : portNumber++, error => {

        if (error) {
            return reject(error);
        }

        resolve(server);
    });
});

module.exports.defaults = {
    gasLimit: 0xfffffffffff,
    gasPrice: 0x01,
    'total_accounts': 20,
    'default_balance_ether': 1000000
};
