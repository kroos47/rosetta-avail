import { ApiPromise, WsProvider } from "@polkadot/api";
import RosettaSDK from "rosetta-node-sdk";
import {
  API_RPC,
  API_EXTENSIONS,
  API_TYPES,
  SIGNED_EXTENSIONS,
} from "../../types";
// import { getRegistryBase } from "@substrate/txwrapper-core";
import { methods as substrateMethods } from "@substrate/txwrapper-substrate";

import networkIdentifiers from "../network";
import Registry from "../offline-signing/registry";

const connections = {};
const registries = {};
const currencies = {};
const isOffline = process.argv.indexOf("--offline") > -1;

class SubstrateNetworkConnection {
  constructor({ nodeAddress, types }) {
    this.nodeAddress = nodeAddress;
    this.types = types;
  }

  async connect() {
    if (this.api && this.api.isConnected) {
      return this.api;
    }

    this.api = await ApiPromise.create({
      provider: new WsProvider("ws://localhost:9944"),
      rpc: API_RPC,
      types: API_TYPES,
      signedExtensions: API_EXTENSIONS,
    });

    return this.api;
  }
}

export function getNetworkCurrencyFromRequest(networkRequest) {
  const targetNetworkIdentifier =
    networkRequest.network_identifier || networkIdentifiers[0];
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  if (networkIdentifier) {
    const { nodeAddress, properties } = networkIdentifier;
    if (!currencies[nodeAddress]) {
      currencies[nodeAddress] = new RosettaSDK.Client.Currency(
        properties.tokenSymbol,
        properties.tokenDecimals
      );
    }
    return currencies[nodeAddress];
  }
  return null;
}

export function getNetworkIdentifier({ blockchain, network }) {
  for (let i = 0; i < networkIdentifiers.length; i++) {
    const networkIdentifier = networkIdentifiers[i];
    if (
      blockchain === networkIdentifier.blockchain &&
      network === networkIdentifier.network
    ) {
      return networkIdentifier;
    }
  }

  return null;
}

export function getNetworkIdentifierFromRequest(networkRequest) {
  const targetNetworkIdentifier =
    networkRequest.network_identifier || networkIdentifiers[0];
  const { blockchain, network } = targetNetworkIdentifier;
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  if (networkIdentifier) {
    return networkIdentifier;
  }
  throw new Error(
    `Can't find network with blockchain and network of: ${blockchain}, ${network}`
  );
}

export async function getNetworkApiFromRequest(networkRequest) {
  const networkIdentifier = getNetworkIdentifierFromRequest(networkRequest);
  const { api } = await getNetworkConnection(networkIdentifier);
  return api;
}

export async function getNetworkConnection(networkIdentifier) {
  if (isOffline) {
    throw new Error("Server is in offline mode");
  }

  const { nodeAddress } = networkIdentifier;
  if (!connections[nodeAddress]) {
    const connection = new SubstrateNetworkConnection(networkIdentifier);
    connections[nodeAddress] = connection;
    await connection.connect();
  }

  return connections[nodeAddress];
}

// export function getRegistry(metadataRpc) {
//   const registry = getRegistryBase({
//     chainProperties: {
//       ss58Format: 42,
//       tokenDecimals: 18,
//       tokenSymbol: "AVAIL", // For Goldberg, use 'AVL'.
//     },
//     specTypes: API_TYPES, // For Goldberg network, import and use 'goldbergTypes' from avail-js-sdk.
//     metadataRpc: metadataRpc,
//   });
//   registry.setSignedExtensions(SIGNED_EXTENSIONS, API_EXTENSIONS);
//   return registry;
// }

export function getNetworkRegistryFromRequest(networkRequest) {
  const targetNetworkIdentifier =
    networkRequest.network_identifier || networkIdentifiers[0];
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  let registry = new Registry({
    chainInfo: networkIdentifier,
    types: networkIdentifier.types,
    metadata: networkIdentifier.metadataRpc,
  });
  return registry;
}

export const methods = {
  balances: substrateMethods.balances,
  nominationPools: substrateMethods.nominationPools,
  proxy: substrateMethods.proxy,
  staking: substrateMethods.staking,
  system: substrateMethods.system,
  utility: substrateMethods.utility,
};
