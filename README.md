## Sync Gateway REST API Functional Tests

Since Couchbase Mobile relies on a REST protocol for sync, we can test it at the REST level.

We can also drive the clients from a REST interface, having them apply load to server components.

### Sync Gateway

Follow the instructions [on the Sync Gateway readme, about how to install](https://github.com/couchbaselabs/sync_gateway/wiki/Installing-and-Upgrading). Remember the path you downloaded it to so you can edit `config/local.js` to point to it.

### Node.js

You'll need a newish Node.js install (>0.8) with npm. We recommend `brew install nodejs`

# How to run these tests

First edit `config/local.js` to point to your build of LiteServ (found via "Products" in Xcode). Also to your local bin/sync_gateway

Get the dependencies with `npm install`. (It reads `package.json` to know what to get.)

Make a `tmp` directory inside your `sync-gateway-tests` checkout, by running `mkdir tmp`

- Point to sync_gateway build and liteserv repositories
```
export LITESERV_PATH=~/Dev/couchbase-lite-ios/build/Products/Debug/LiteServ
export SYNCGATE_PATH=~/Dev/sync_gateway/bin/sync_gateway
```
(LiteServ App should be build from  https://github.com/couchbase/couchbase-lite-ios repository)

Run the tests with `npm test`. NPM test will pick up any file in the 'tests' directory.

To run a particular test, try `node tests/liteserv-phalanx.js`

## How to run tests agains Android LiteServ

 - Download an Android emultator and Android SDK

- Make sure to set the following enviroment variables
```
export ANDROID_HOME="/Users/{user}/Library/Android/sdk/"
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```
- Get liteserv and build
```
git clone https://github.com/couchbase/couchbase-lite-android-liteserv
cd couchbase-lite-android-liteserv
git submodule update --init --recursive
```
- Follow the section titled 'Building LiteServAndroid via Gradle command line'

Make sure your emulator is running and issue the following command
```
adb shell am start -a android.intent.action.MAIN -n com.couchbase.liteservandroid/com.couchbase.liteservandroid.MainActivity --ei listen_port 8081 --es username \"\" --es password \"\"
```
You should see ListServ running in the emulator with an empty login: and password:

Set environment for testing
- Point to sync_gateway build and liteserv repositories
```
export SYNCGATE_PATH=~/Dev/sync_gateway/bin/sync_gateway
export LITESERV_PATH=~/Dev/couchbase-lite-android-liteserv
```

If you have node installed, make sure you have the following version
```
node -v
v0.10.36
```

If you do not have this version, please removed node and download https://nodejs.org/dist/v0.10.36/node-v0.10.36.pkg
```
cd sync-gateway-tests/
rm -rf node_modules
npm install
```

Running against walrus
```
export CONF_FILE=local_android
```
Running against cb server
```
export CONF_FILE=local_android_cb
```
To set up bucket for running tests
```
node tests/a-cb-presetup.js
```

## How to run performance tests:

The simplest way to run a perf test is to update config/perf.js to match your configuration and start the test using run.js:
`node perf/run.js`

You can also start tests over http by starting a listener and sending the request over http:
`node lib/listener.js`
`http POST http://127.0.0.1:8189/run/perf/readwrite db=test-perf workload=readwrite numClients=2 writeRatio=10 readRatio=0 requestsPerSec=1 runtime=60 providers:='["http://127.0.0.99:8189"]' enablepull:=false`

Note: values in config/perf.js will be used by default for any specified arguments, otherwise http query params will override those variables

Collected stats will be stored into perfdb specefied in `config/perf.js`.  This can be any endpoint that implements the couchdb api. 

## Scaling Performance tests:
Clients can be added to a test by setting up additional providers.  A provider is any host where `lib/listener.js` has been started.  This provider should have it's `config/local.js` updated to specify what kind of clients it provides.  You should also set the listener ip to the hosts public IP so that the provider can be reached remotely.  

Currently the quickest way to scale up clients is to make lots of pouchdb providers. For example:

1) pull repo to a new vm and edit `config/local.js`
 * set => provides  : "pouchdb"
 * set => LocalListenerIP : "172.x.x.x"    (or export LOCAL_IP="172.x.x.x")
 * node lib/listener.js

2) set up as many providers you want.  estimate a max of 200 clients can be started per pouchdb provider on average hardware.

3) navigate to the repo where the test will be running from and edit it's `config/perf.js`:
 * set => providers : ["172.x.x.1", "172.x.x.2", ...]
 
4) `node perf/run.js`

The numClients will be distributed across providers.  You can have a mix of ios/android/pouch providers all in the same array.  
But this assumes you can start an equal amount of clients for each provider.  In most cases it's best to start 2 different perf tests.
1 that runs against pouchdb providers with many clients/provider, and another that runs against ios with fewer clients.

Also note statcollection will only work against perf tests where an ios provider can be detected so you should only specify perfdb
in the enviornment where ios providers are specified.

## Perf stat analysis
During the test run, stats can be pushed to perfdb set in `config/perf.js`.  This can be any couchdb compliant endpoint.  By default there is an internal pouchdb instance started for storing stats, but this instance is stopped at the end of the run.  For persisted stat data, it's recommend you use a public couchdb our couchcloud.

When the test is being run you will see the statcollector printing latency stats, as this is what's currently collected.  One possible way to do post-run analysis is to create a couchdb view on the data in perfdb using the testid that is printed out in the console when tests starts:

* sample start log
`{ err: null,
  ok:
   { testid: 'perf_1566814',
     numClients: 100,
`

* view over test data for testid perf_1566814
`function(doc) {
   if(doc._id.indexOf("perf_1566814") != -1){
  	emit(doc.elapsed_time, [ doc['directsg-change'].avg, doc.change.avg, (doc.docs_written - doc.docs_relayed)]);
   }
}`

this will give key's that match elapsed_time of test and values that correspond to delay stats


## Troubleshooting

`killall LiteServ` is your friend.
