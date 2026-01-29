#!/bin/bash
set -e

setupNvm() {
    export NVM_DIR="$HOME/.nvm"
    [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"  # This loads nvm

    echo "Installing nvm"
    nvm install
    nvm use
}

setupNvm

echo "Installing yarn"
npm install -g yarn

echo "Installing Dependencies"
yarn install
# Will place .js files in target

echo "Compiling"
yarn run build

echo "Preparing target"
# These also need to be in the RiffRaff package
cp package.json target
cp riff-raff.yaml target
cp cloudformation.yaml target

echo "Installing deps in target"
pushd target
# Ensures the RiffRaff package has the node_modules needed to run
yarn install --production
popd

echo "Building package"
yarn run package