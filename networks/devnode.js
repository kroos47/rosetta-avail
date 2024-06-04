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
  genesis: "0xe13c0df4497afb9ddb196617b45bcc99d45ccdac3b1cd185ebb3507b37e02ee4",
  name: "Development",
  specName: "avail",
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 31,
  transactionVersion: 1,
  types,
  metadataRpc: metadata.metadataRpc,
};
