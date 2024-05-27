## Substrate/PolkadotJS Rosetta API
This is Dock's implementation of the [Rosetta API](https://github.com/coinbase/rosetta-specifications) for our AVAIL. Currently in development but mostly done. Any suggestions or improvements are welcome. 

## Prerequisites
Install Yarn or NPM, run the usual `yarn install` or `npm install`.

## Development
Run `yarn dev` to run a development instance of the API. Default port is 8080. Check the rosetta-cli configuration files in `/rosetta-cli`. Rosetta CLI usage is [better documented here](https://github.com/coinbase/rosetta-cli), but the main files to check are:
- rosetta-cli/devnode/config.json (connects to local substrate node)
- rosetta-cli/mainnet/config.json (connects to local mainnet node)
- rosetta-cli/testnet/config.json (connects to dock testnet directly)

## Starting
- Online mode: `yarn start`
- Offline mode: `yarn start-offline` or add `--offline` flag in CLI

