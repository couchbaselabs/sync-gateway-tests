#!/usr/bin/env bash

liteserv_branch=$1

if [ "$#" -ne 1 ]; then
    echo "You must provide 'master' or a branch name for LiteServ"
    exit 1
fi

# Remove downloads dir if it exists
rm -rf ../sync-gateway-tests-deps/

# Clone liteserv android
mkdir ../sync-gateway-tests-deps/
cd ../sync-gateway-tests-deps/

git clone https://github.com/couchbase/couchbase-lite-android-liteserv.git
cd couchbase-lite-android-liteserv/

git checkout $liteserv_branch
if [ $? -ne 0 ]; then
    echo "Failed to checkout: $liteserv_branch"
    exit 1
fi

# Build and deploy liteserv android
./gradlew clean && ./gradlew assemble

cd ../../sync-gateway-tests/

# Deploy .apk and launch via monkeyrunner
monkeyrunner deploy_liteserv.py