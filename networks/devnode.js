const types = require("../polkadot-types.json");
const types1 = require("../types");
const metadata = require("./metadata/devnode-metadata.json");

module.exports = {
  blockchain: "Avail",
  network: "Development Node",
  nodeAddress: "ws://localhost:9944",
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 18,
    tokenSymbol: "AVAIL",
    poaModule: {
      treasury: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    },
  },
  genesis: "0xb4073ef63d06cb72c56527f8f53e9584c52b86ef9983321f909869800c95e3d8",
  name: "Development",
  specName: "avail",
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 30,
  transactionVersion: 1,
  types,
  metadataRpc: metadata.metadataRpc,
};
