import { TypeRegistry } from "@polkadot/types";
import { getSpecTypes } from "@polkadot/types-known";
import { createMetadata } from "@substrate/txwrapper-core";
import {
  API_RPC,
  API_EXTENSIONS,
  API_TYPES,
  SIGNED_EXTENSIONS,
} from "../../types";

/**
 * A registry class that stores the types, metadata and chain information.
 */
export default class Registry {
  constructor({ chainInfo, metadata, types }) {
    createMetadata.clear();

    const registry = new TypeRegistry();
    registry.setChainProperties(
      registry.createType("ChainProperties", chainInfo.properties)
    );

    registry.setKnownTypes({
      typesBundle: types,
    });

    registry.setSignedExtensions(SIGNED_EXTENSIONS, API_EXTENSIONS);

    registry.register(
      getSpecTypes(
        registry,
        chainInfo.name,
        chainInfo.specName,
        chainInfo.specVersion
      )
    );

    registry.setMetadata(createMetadata(registry, metadata));

    /* eslint-disable no-underscore-dangle */
    this._registry = registry;
    this._metadata = metadata;
    this._chainInfo = chainInfo;
  }

  get registry() {
    return this._registry;
  }

  get metadata() {
    return this._metadata;
  }

  get chainInfo() {
    return this._chainInfo;
  }
  get createType() {
    return this._registry.createType.bind(this._registry);
  }
}
