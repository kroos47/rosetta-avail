import { construct } from "@substrate/txwrapper-core";
import { methods } from "../helpers/connections";
import { SIGNED_EXTENSIONS, API_EXTENSIONS } from "../../types";
import { EXTRINSIC_VERSION } from "@polkadot/types/extrinsic/v4/Extrinsic";
/**
 * Build a transfer txn
 * @param {Object} params - An object containing the parameters.
 * @param params.from
 * @param params.to
 * @param params.value
 * @param params.tip
 * @param params.nonce
 * @param params.eraPeriod
 * @param params.blockNumber
 * @param params.blockHash
 * @param params.registry - This is an instance of `Registry` class
 * @return {{unsignedTxn: Object, signingPayload: string}}
 */
export default function buildTransferTxn({
  from,
  to,
  value,
  tip,
  nonce,
  eraPeriod,
  blockNumber,
  blockHash,
  registry,
}) {
  const unsignedTxn = methods.balances.transferKeepAlive(
    {
      value,
      dest: to,
    },
    {
      address: from,
      blockHash,
      blockNumber,
      eraPeriod,
      genesisHash: registry.chainInfo.genesis,
      metadataRpc: registry.metadata,
      nonce,
      specVersion: registry.chainInfo.specVersion,
      tip,
      transactionVersion: registry.chainInfo.transactionVersion,
    },
    {
      metadataRpc: registry._metadata,
      registry: registry._registry,
      signedExtensions: SIGNED_EXTENSIONS,
      userExtensions: API_EXTENSIONS,
    }
  );
  const signingPayload = registry._registry.createType(
    "ExtrinsicPayload",
    { ...unsignedTxn, appId: 0 },
    { version: EXTRINSIC_VERSION }
  );
  return {
    unsignedTxn,
    signingPayload,
  };
}
