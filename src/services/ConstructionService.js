import RosettaSDK from "rosetta-node-sdk";
import BN from "bn.js";

import {
  decode,
  getTxHash,
  deriveAddress,
  construct,
} from "@substrate/txwrapper-core";

import { methods } from "../helpers/connections";
import Registry from "../offline-signing/registry";

import { u8aToHex, hexToU8a, u8aConcat } from "@polkadot/util";

import { signatureVerify, decodeAddress } from "@polkadot/util-crypto";

import { EXTRINSIC_VERSION } from "@polkadot/types/extrinsic/v4/Extrinsic";

import { signWith } from "../helpers/connections";

import { Keyring } from "@polkadot/api";
import {
  ERROR_BROADCAST_TRANSACTION,
  throwError,
} from "../helpers/error-types";

import { publicKeyToAddress } from "../helpers/crypto";

import {
  getNetworkApiFromRequest,
  getNetworkRegistryFromRequest,
  getNetworkCurrencyFromRequest,
  getNetworkIdentifierFromRequest,
  getRegistry,
} from "../helpers/connections";

import buildTransferTxn from "../offline-signing/txns";
import { API_EXTENSIONS, API_TYPES, SIGNED_EXTENSIONS } from "../../types";
import { U8 } from "@polkadot/types/primitive";

const Types = RosettaSDK.Client;

const sigTypeEnum = {
  ed25519: 0,
  sr25519: 1,
  ecdsa: 2,
};

function jsonToTx(transaction, options = {}) {
  const txParams = JSON.parse(transaction);
  const { unsignedTxn, signingPayload } = buildTransferTxn({
    ...txParams,
    ...options,
    version: EXTRINSIC_VERSION,
  });

  const extrinsic = options.registry.registry.createType(
    "Extrinsic",
    { ...unsignedTxn, appId: 0 },
    { version: EXTRINSIC_VERSION, ...unsignedTxn }
  );

  if (txParams.signature) {
    extrinsic.addSignature(
      txParams.signer,
      hexToU8a(txParams.signature),
      signingPayload
    );
  }

  return {
    transaction: unsignedTxn,
    extrinsic,
    signingPayload,
  };
}

/* Data API: Construction */

/**
 * Get Transaction Construction Metadata
 * Get any information required to construct a transaction for a specific network. Metadata returned here could be a recent hash to use, an account sequence number, or even arbitrary chain state. It is up to the client to correctly populate the options object with any network-specific details to ensure the correct metadata is retrieved.  It is important to clarify that this endpoint should not pre-construct any transactions for the client (this should happen in the SDK). This endpoint is left purposely unstructured because of the wide scope of metadata that could be required.  In a future version of the spec, we plan to pass an array of Rosetta Operations to specify which metadata should be received and to create a transaction in an accompanying SDK. This will help to insulate the client from chain-specific details that are currently required here.
 *
 * constructionMetadataRequest ConstructionMetadataRequest
 * returns ConstructionMetadataResponse
 * */
const constructionMetadata = async (params) => {
  const { constructionMetadataRequest } = params;
  const api = await getNetworkApiFromRequest(constructionMetadataRequest);
  const { options } = constructionMetadataRequest;

  // Get signing info for extrinsic
  const nonce = (await api.query.system.account(options.from)).nonce.toNumber();
  const signingInfo = await api.derive.tx.signingInfo(options.from, nonce);
  const blockNumber = signingInfo.header.number.toNumber();
  const blockHash = await api.rpc.chain.getBlockHash(signingInfo.header.number);
  const eraPeriod = 64;

  // Format into metadata object
  return new Types.ConstructionMetadataResponse({
    nonce,
    blockHash,
    blockNumber,
    eraPeriod,
  });
};

/**
 * Submit a Signed Transaction
 * Submit a pre-signed transaction to the node. This call should not block on the transaction being included in a block. Rather, it should return immediately with an indication of whether or not the transaction was included in the mempool.  The transaction submission response should only return a 200 status if the submitted transaction could be included in the mempool. Otherwise, it should return an error.
 *
 * constructionSubmitRequest ConstructionSubmitRequest
 * returns ConstructionSubmitResponse
 * */
const constructionSubmit = async (params) => {
  const { constructionSubmitRequest } = params;
  const api = await getNetworkApiFromRequest(constructionSubmitRequest);
  const signedTxHex = constructionSubmitRequest.signed_transaction;

  try {
    const txHash = await api.rpc.author.submitExtrinsic(signedTxHex);
    return new Types.TransactionIdentifierResponse({
      hash: u8aToHex(txHash).substr(2),
    });
  } catch (e) {
    return throwError(ERROR_BROADCAST_TRANSACTION, e);
  }
};

/**
 * Create Network Transaction from Signatures
 * Combine creates a network-specific transaction from an unsigned transaction and an array of provided signatures. The signed transaction returned from this method will be sent to the `/construction/submit` endpoint by the caller.
 *
 * [OFFLINE]
 * constructionCombineRequest ConstructionCombineRequest
 * returns ConstructionCombineResponse
 * */
const constructionCombine = async (params) => {
  const { constructionCombineRequest } = params;
  const registry = getNetworkRegistryFromRequest(constructionCombineRequest);
  const { signatures } = constructionCombineRequest;
  const unsignedTx = constructionCombineRequest.unsigned_transaction;

  // Get signature info
  const signatureType = signatures[0].signature_type.toLowerCase();
  console.log(signatureType);
  const signatureHex = `0x${signatures[0].hex_bytes}`;
  console.log(signatureHex);
  const signingPayload = `0x${signatures[0].signing_payload.hex_bytes}`;
  console.log(signingPayload);

  // Re-construct extrinsic
  const { transaction } = jsonToTx(unsignedTx, {
    metadataRpc: registry.metadata,
    registry,
  });
  const unsignedTxn = transaction;
  const txInfo = decode(unsignedTxn, {
    metadataRpc: registry.metadata,
    registry: registry.registry,
  });

  // Ensure tx is balances.transfer
  if (
    txInfo.method.name !== "transferKeepAlive" ||
    txInfo.method.pallet !== "balances"
  ) {
    throw new Error("Extrinsic must be method transfer and pallet balances");
  }
  const tx = construct.signedTx(unsignedTxn, signatureHex, {
    metadataRpc: registry.metadata,
    registry: registry.registry,
    signedExtensions: SIGNED_EXTENSIONS,
    userExtensions: API_EXTENSIONS,
  });
  console.log("tx:", tx);
  return new Types.ConstructionCombineResponse(tx);
};

/**
 * Derive an Address from a PublicKey
 * Derive returns the network-specific address associated with a public key. Blockchains that require an on-chain action to create an account should not implement this method.
 *
 * [OFFLINE]
 * constructionDeriveRequest ConstructionDeriveRequest
 * returns ConstructionDeriveResponse
 * */
const constructionDerive = async (params) => {
  console.log(params);
  const { constructionDeriveRequest } = params;
  const networkIdentifier = getNetworkIdentifierFromRequest(
    constructionDeriveRequest
  );
  const publicKeyHex = `0x${constructionDeriveRequest.public_key.hex_bytes}`;
  const publicKeyType = constructionDeriveRequest.public_key.curve_type;
  const address = await publicKeyToAddress(
    publicKeyHex,
    publicKeyType,
    networkIdentifier.properties.ss58Format
  );
  return new Types.ConstructionDeriveResponse(address);
};

/**
 * Get the Hash of a Signed Transaction
 * TransactionHash returns the network-specific transaction hash for a signed transaction.
 *
 * [OFFLINE]
 * constructionHashRequest ConstructionHashRequest
 * returns TransactionIdentifierResponse
 * */
const constructionHash = async (params) => {
  const { constructionHashRequest } = params;
  const registry = getNetworkRegistryFromRequest(constructionHashRequest);
  const { extrinsic } = jsonToTx(constructionHashRequest.signed_transaction, {
    metadataRpc: registry.metadata,
    registry,
  });

  const transactionHashHex = getTxHash(extrinsic.toHex());
  return new Types.TransactionIdentifierResponse({
    hash: transactionHashHex.substr(2),
  });
};

/**
 * Parse a Transaction
 * Parse is called on both unsigned and signed transactions to understand the intent of the formulated transaction. This is run as a sanity check before signing (after `/construction/payloads`) and before broadcast (after `/construction/combine`).
 *
 * [OFFLINE]
 * constructionParseRequest ConstructionParseRequest
 * returns ConstructionParseResponse
 * */
const constructionParse = async (params) => {
  const { constructionParseRequest } = params;
  const { signed, transaction } = constructionParseRequest;
  const registry = getNetworkRegistryFromRequest(constructionParseRequest);
  const currency = getNetworkCurrencyFromRequest(constructionParseRequest);

  let value;
  let sourceAccountAddress;
  let destAccountAddress;

  // Parse transaction
  if (transaction.substr(0, 2) === "0x") {
    // Hex encoded extrinsic
    const polkaTx = registry.registry.createType(
      "Extrinsic",
      hexToU8a(transaction),
      {
        isSigned: true,
      }
    );

    const transactionJSON = polkaTx.toHuman();
    sourceAccountAddress = transactionJSON.signer;
    destAccountAddress = transactionJSON.method.args[0];
    value = polkaTx.method.args[1].toString();
  } else {
    const parsedTx = jsonToTx(transaction, {
      metadataRpc: registry.metadata,
      registry,
    });

    const parsedTxn = parsedTx.transaction;
    const txInfo = decode(parsedTxn, {
      metadataRpc: registry.metadata,
      registry: registry.registry,
    });
    const { args } = txInfo.method;

    // Ensure tx is balances.transfer
    if (
      txInfo.method.name !== "transferKeepAlive" ||
      txInfo.method.pallet !== "balances"
    ) {
      throw new Error("Extrinsic must be method transfer and pallet balances");
    }

    sourceAccountAddress = txInfo.address;
    destAccountAddress = args.dest;
    value = args.value;
  }

  // Ensure arguments are correct
  if (!destAccountAddress || typeof value === "undefined") {
    throw new Error("Extrinsic is missing dest and value arguments");
  }

  // Deconstruct transaction into operations
  const operations = [
    Types.Operation.constructFromObject({
      operation_identifier: new Types.OperationIdentifier(0),
      type: "Transfer",
      account: new Types.AccountIdentifier(sourceAccountAddress),
      amount: new Types.Amount(new BN(value).neg().toString(), currency),
    }),
    Types.Operation.constructFromObject({
      operation_identifier: new Types.OperationIdentifier(1),
      type: "Transfer",
      account: new Types.AccountIdentifier(destAccountAddress),
      amount: new Types.Amount(value.toString(), currency),
    }),
  ];

  // Build list of signers, just one
  const signers = signed ? [sourceAccountAddress] : [];

  // Create response
  const response = new Types.ConstructionParseResponse(operations, signers);
  response.account_identifier_signers = signers.map(
    (signer) => new Types.AccountIdentifier(signer)
  );
  return response;
};

/**
 * Generate an Unsigned Transaction and Signing Payloads
 * Payloads is called with an array of operations and the response from `/construction/metadata`. It returns an unsigned transaction blob and a collection of payloads that must be signed by particular addresses using a certain SignatureType. The array of operations provided in transaction construction often times can not specify all \"effects\" of a transaction (consider invoked transactions in Ethereum). However, they can deterministically specify the \"intent\" of the transaction, which is sufficient for construction. For this reason, parsing the corresponding transaction in the Data API (when it lands on chain) will contain a superset of whatever operations were provided during construction.
 *
 * [OFFLINE]
 * constructionPayloadsRequest ConstructionPayloadsRequest
 * returns ConstructionPayloadsResponse
 * */
const constructionPayloads = async (params) => {
  const { constructionPayloadsRequest } = params;
  const { operations } = constructionPayloadsRequest;

  // Must have 2 operations, send and receive
  if (operations.length !== 2) {
    throw new Error("Need atleast 2 transfer operations");
  }

  // Sort by sender/reciever
  const senderOperations = operations.filter((operation) =>
    new BN(operation.amount.value).isNeg()
  );
  const receiverOperations = operations.filter(
    (operation) => !new BN(operation.amount.value).isNeg()
  );

  // Ensure we have correct amount of operations
  if (senderOperations.length !== 1 || receiverOperations.length !== 1) {
    throw new Error(
      "Payloads require 1 sender and 1 receiver transfer operation"
    );
  }

  const sendOp = senderOperations[0];
  const receiveOp = receiverOperations[0];

  // Support only transfer operation
  if (sendOp.type !== "Transfer" || receiveOp.type !== "Transfer") {
    throw new Error("Payload operations must be of type Transfer");
  }

  const senderAddress = sendOp.account.address;
  const toAddress = receiveOp.account.address;
  const { nonce, eraPeriod, blockNumber, blockHash } =
    constructionPayloadsRequest.metadata;

  // Initialize the registry

  const registry = getNetworkRegistryFromRequest(constructionPayloadsRequest);
  const txParams = {
    from: senderAddress,
    to: toAddress,
    value: receiveOp.amount.value,
    tip: 0,
    nonce,
    eraPeriod,
    blockNumber,
    blockHash,
    version: EXTRINSIC_VERSION,
  };

  const { unsignedTxn } = buildTransferTxn({
    ...txParams,
    registry,
  });
  const signingPayload = registry._registry
    .createType(
      "ExtrinsicPayload",
      { ...unsignedTxn, appId: 0 },
      { version: EXTRINSIC_VERSION }
    )
    .toHex();
  console.log(`\nPayload to Sign: ${signingPayload}`);

  const signatureType = "ed25519";
  // const actualPayload = extrinsicPayload.toU8a({ method: true });
  // const signingPayload = u8aToHex(actualPayload);

  // Create an array of payloads that must be signed by the caller
  const payloads = [
    {
      address: senderAddress,
      account_identifier: new Types.AccountIdentifier(senderAddress),
      hex_bytes: signingPayload.substring(2),
      signature_type: signatureType,
    },
  ];

  const unsignedTransaction = JSON.stringify(txParams);
  const keyring = new Keyring();
  const alice = keyring.addFromUri("//Alice", { name: "Alice" }, "ed25519");
  console.log("alice pub:", alice.address);
  const { signature } = registry
    .createType("ExtrinsicPayload", signingPayload, {
      version: EXTRINSIC_VERSION,
    })
    .sign(alice);
  console.log("tx:");
  console.log("signature:", signature);
  // const registry1 = getRegistry(metadataRpc);
  const tx = construct.signedTx(unsignedTxn, signature, {
    metadataRpc: registry.metadata,
    registry: registry.registry,
    signedExtensions: SIGNED_EXTENSIONS,
    userExtensions: API_EXTENSIONS,
  });
  console.log("tx:", tx);
  return new Types.ConstructionPayloadsResponse(unsignedTransaction, payloads);
};

/**
 * Create a Request to Fetch Metadata
 * Preprocess is called prior to /construction/payloads to construct a request for any metadata that is needed for transaction construction given (i.e. account nonce).
 * The options object returned from this endpoint will be sent to the /construction/metadata endpoint UNMODIFIED by the caller (in an offline execution environment).
 * If your Construction API implementation has configuration options, they MUST be specified in the /construction/preprocess request (in the metadata field).
 *
 * [OFFLINE]
 * constructionPreprocessRequest ConstructionPreprocessRequest
 * returns ConstructionPreprocessResponse
 * */
const constructionPreprocess = async (params) => {
  const { constructionPreprocessRequest } = params;
  const { operations } = constructionPreprocessRequest;

  // Gather public keys needed for TXs
  const requiredPublicKeys = operations.map(
    (operation) => new Types.AccountIdentifier(operation.account.address)
  );

  const senderAddress = operations
    .filter((operation) => new BN(operation.amount.value).isNeg())
    .map((operation) => operation.account.address);

  // TODO: this needs implementing in rosetta-node-client-sdk
  // return new Types.ConstructionPreprocessResponse();
  return {
    options: {
      from: senderAddress[0],
    }, // Configuration options
    required_public_keys: requiredPublicKeys,
  };
};

module.exports = {
  /* /construction/metadata */
  constructionMetadata,

  /* /construction/submit */
  constructionSubmit,

  /* /construction/combine */
  constructionCombine,

  /* /construction/derive */
  constructionDerive,

  /* /construction/hash */
  constructionHash,

  /* /construction/parse */
  constructionParse,

  /* /construction/payloads */
  constructionPayloads,

  /* /construction/preprocess */
  constructionPreprocess,
};
