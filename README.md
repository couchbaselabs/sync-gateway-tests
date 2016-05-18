## Sync Gateway REST API Functional Tests

Since Couchbase Mobile relies on a REST protocol for sync, we can test it at the REST level.

We can also drive the clients from a REST interface, having them apply load to server components.

### Node.js
Important!! For Android, you need https://nodejs.org/dist/v0.10.36/node-v0.10.36.pkg

# VM Setup
If you are using couchbase server as the backing sync_gateway datastore, you need to setup a local centos vm

1. Follow setup here - https://github.com/couchbaselabs/mobile-testkit#spin-up-machines-on-vagrant
1. Install server
 
   ```
   $ git clone https://github.com/couchbaselabs/mobile-testkit.git
   cd mobile-testkit/
      
   # Create inventory to install server on running in vagrant on box
   
   $ local_cb_file="resources/cluster_configs/local_cb"
   $ echo '[couchbase_servers]' > $local_cb_file
   $ echo 'cb1 ansible_host=192.168.33.10' >> $local_cb_file
   $ export CLUSTER_CONFIG=$local_cb_file
   
   $ ansible_cfg_file="libraries/provision/ansible/playbooks/ansible.cfg"
   
   # Create ansible config
   $ echo '[defaults]' > $ansible_cfg_file
   $ echo 'remote_user = vagrant' >> $ansible_cfg_file
   
   # install  server on vagrant vm
   $ python libraries/provision/install_couchbase_server.py --version=${COUCHBASE_SERVER_VERSION}
   
   # Delete the buckets
   $ cd keywords/
   $ python -c "from CouchbaseServer import CouchbaseServer; s = CouchbaseServer(); s.delete_buckets('http://192.168.33.10:8091');"
   
   # Create db bucket
   $ python -c "from CouchbaseServer import CouchbaseServer; s = CouchbaseServer(); s.create_bucket('http://192.168.33.10:8091', 'db');"
   
   $ cd ../..
   ```

# How to run these tests with MacOSX LiteServ

**Install sync_gateway**
```
$ python install_sync_gateway.py --version=1.2.0-79
$ export SYNCGATE_PATH=/Users/{user}/{path-to-repo}/sync-gateway-tests/binaries/couchbase-sync-gateway/bin/sync_gateway
```

**Install MacOSX LiteServ**
The following command will go and get MacOSX LiteServ 1.2.0-101
```
$ ./get_liteserv_ios.sh 1.2.0 101
$ export LITESERV_PATH=/{user}/{path-to-repo}/sync-gateway-tests/binaries/liteserv-macosx/LiteServ
```

**Install npm dependencies**
```
$ rm -rf node_modules
$ npm install
```

**Set conf to point to MacOSX configuration**

Running against walrus
```
$ export CONF_FILE=local
```

Running against cb server
```
$ export CONF_FILE=local_cb
```


**Run tests**
NOTE: All tests must be run from the root directory

```
$ npm test 2>&1 | tee results.tap
```

**Run an individual test**

```
$ node tests/cbl-database.js
```

## How to run tests against Android LiteServ

 - Download an Android emultator and Android SDK

- Make sure to set the following enviroment variables
```
$ export ANDROID_HOME="/Users/{user}/Library/Android/sdk/"
$ export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

**Install sync_gateway**
```
$ python install_sync_gateway.py --version=1.2.0-79
$ export SYNCGATE_PATH=/Users/{user}/{path-to-repo}/sync-gateway-tests/binaries/couchbase-sync-gateway/bin/sync_gateway
```

**Start android emulator**
```
$ ./start_emulator.sh 23
```

**Get, build, and deploy LiteServ**
```
$ ./build_and_deploy_liteserv.sh master
```

You should see ListServ running in the emulator with an empty login: and password:


If you have node installed, make sure you have the following version
```
$ node -v
v0.10.36
```

If you do not have this version, please removed node and download https://nodejs.org/dist/v0.10.36/node-v0.10.36.pkg

**Install test dependencies**

```
$ rm -rf node_modules
$ npm install
```

Running against walrus
```
$ export CONF_FILE=local_android
```
Running against cb server
```
$ export CONF_FILE=local_android_cb
```

**Run tests**
NOTE: All tests must be run from the root directory

```
$ npm test 2>&1 | tee results.tap
```

**Run an individual test**
NOTE: Individual tests must be run from the `tests/` directory

```
cd tests/
$ node cbl-database.js
```

**Kill emulator**
 ```
 $ ./kill_emulator.sh
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
