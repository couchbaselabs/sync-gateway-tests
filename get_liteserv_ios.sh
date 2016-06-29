#!/usr/bin/env bash

liteserv_version=$1
liteserv_build=$2

echo $liteserv_version
echo $liteserv_build

version_build="$liteserv_version-$liteserv_build"



# download the mac package
cd binaries/

# remove any existing binaries
rm -rf liteserv-macosx/
mkdir liteserv-macosx
cd liteserv-macosx

if [ $liteserv_version == "1.2.1" ]; then
    # http://latestbuilds.hq.couchbase.com/couchbase-lite-ios/1.2.1/macosx/1.2.1-13/couchbase-lite-macosx-enterprise_1.2.1-13.zip
    wget "http://latestbuilds.hq.couchbase.com/couchbase-lite-ios/$liteserv_version/macosx/$version_build/couchbase-lite-macosx-enterprise_$version_build.zip"
elif [ $liteserv_version == "1.2.0" ]; then
    # http://latestbuilds.hq.couchbase.com/couchbase-lite-ios/release/1.2.0/macosx/1.2.0-101/couchbase-lite-macosx-enterprise_1.2.0-101.zip
    wget "http://latestbuilds.hq.couchbase.com/couchbase-lite-ios/release/$liteserv_version/macosx/$version_build/couchbase-lite-macosx-enterprise_$version_build.zip"
elif [ $liteserv_version == "1.3.0" ]; then
    echo "http://latestbuilds.hq.couchbase.com/couchbase-lite-ios/$liteserv_version/macosx/$version_build/couchbase-lite-macosx-enterprise_$version_build.zip"
    wget "http://latestbuilds.hq.couchbase.com/couchbase-lite-ios/$liteserv_version/macosx/$version_build/couchbase-lite-macosx-enterprise_$version_build.zip"

else
    printf "Version not found"
fi

# unzip the mac package
unzip "couchbase-lite-macosx-enterprise_$version_build.zip"

cd ../../
