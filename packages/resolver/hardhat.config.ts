import type { HardhatUserConfig } from 'hardhat/types';

import '@nomiclabs/hardhat-ethers';

// Hardhat config
const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      "chainId": 1337,
      "initialBaseFeePerGas": 0
    },
  },
};

export default config;
