var launcher = require("../lib/launcher"),
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util =  require("util"),
    test = require("tap").test,
    eventEmitter = common.ee,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000},
    cb_util = require("../tests/utils/cb_util"),
    couchbase = require('couchbase');

var server, sg, gateway, app_bucket
pushdb = "sb_sg_restart_revs_limit",
    bucketNames = ["sync_gateway", "default"]

var sgShadowBucketDb = "http://localhost:4985/sync_gateway"
if (config.provides=="android") sgShadowBucketDb = sgShadowBucketDb.replace("localhost", "10.0.2.2");

var numDocs= parseInt(config.numDocs) || 100;
var timeoutReplication = 5000;
var updatedData = "updated data";

test("delete buckets", test_conf, function (t) {
    common.deleteShadowBuckets(t, bucketNames[0], bucketNames[1], setTimeout(function () {
        t.end();
    }, timeoutReplication * 10));
});

test("create buckets", test_conf, function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        cb_util.createBucket(t, bucketNames[0])
        cb_util.createBucket(t, bucketNames[1], setTimeout(function () {
            t.end();
        }, timeoutReplication * 6));
    } else {
        t.end()
    }
});

test("start test client", test_conf, function(t){
    common.launchClient(t, function(_server){
        server = _server
        setTimeout(function () {
            t.end()
        }, timeoutReplication*3)
    })
})

    // kill sync gateway
    test("kill syncgateway", function (t) {
        common.kill_sg(t, function () {
            t.end()
        })
    })

test("start sync gateway", function(t){
    common.launchSGShadowing(t, __dirname+"/../config/sb_sg_restart_revs_limit.json", function(_sg){
        sg  = _sg
        t.end()
    })
})

test("create app_bucket connection", function(t){
    app_bucket = new couchbase.Cluster('127.0.0.1:8091').openBucket(bucketNames[1], function(err) {
        if (err) {
            // Failed to make a connection to the Couchbase cluster.
            throw err;
        } else{
            t.end();
        }
    })
})

test("create test database " + pushdb, function(t){
    common.createDBs(t, [ pushdb ])
    t.end()
})

test("Create " + numDocs + " documents in lite db", function(t){
    setTimeout(function () {
        common.createDBDocs(t, {
            numdocs: numDocs,
            dbs: [ pushdb ],
            docgen: 'channels'
        });
        t.end();
    }, timeoutReplication);
})

test("Mobile client start continous push replication", function(t) {
    setTimeout(function () {
        console.log(coax([server, "_replicate"]).pax().toString(), "source:", pushdb, ">>  target:", sgShadowBucketDb);
        coax.post([server, "_replicate"], {
            source : pushdb,
            target : sgShadowBucketDb,
            continuous : true
        }, function(err, info) {
            t.false(err, "replication created")
            t.end();
        });
    }, timeoutReplication);
});

test("Verify that the created docs are shadowed to app-bucket", function(t){
    setTimeout(function () {
        async.times(numDocs, function(i, cb){
            var docId = pushdb + "_" + i;
            var timestamp = 0
            app_bucket.get(docId, function(err, result) {
                if (err) {
                    t.fail("Fail to get document " + docId + " in app_bucket. err: " + JSON.stringify(err))
                    throw err;
                    cb(err, result)
                } else {
                    t.ok(!err, "the document " + docId + " is shadowed to app_bucket successfully. err: " + JSON.stringify(err))
                    cb(err, result)
                }
            })
        }, function(err, result){
            t.end()
        })
    }, timeoutReplication);
})

test("Update the doc in lite pushdb", function(t){
    async.times(numDocs, function(i, cb){
        var docId = pushdb + "_" + i;
        coax([server, pushdb, docId], function (err, doc) {
            if (err || (!doc) || doc == undefined) {
                t.fail("unable to get doc rev for url:" + coax([server, pushdb, docId]).pax().toString() + ", err:" + err + ", json:" + doc);
                cb(err, doc);
            } else {
                doc.data = updatedData
                coax.put([server, pushdb, docId], doc, function(err, ok){
                    if (err){
                        t.false(err, "error updating doc.  url: " + coax.put([server,pushdb, docId]).pax().toString() +" err: " + JSON.stringify(err));
                    } else {
                        t.equals(docId, ok.id, "Doc " + docId + " updated successfully in lite db");
                        cb(err, ok)
                    }
                })
            }
        })
    }, function(err, result){
        t.end()
    })
})

test("Verify that the updated doc are shadowed to app-bucket", function(t){
    setTimeout(function () {
        async.times(numDocs, function(i, cb){
            var docId = pushdb + "_" + i;
            var timestamp = 0
            app_bucket.get(docId, function(err, result) {
                if (err) {
                    t.fail("Fail to get document " + docId + " in app_bucket. err: " + JSON.stringify(err))
                    throw err;
                    cb(err, result)
                } else {
                    t.equals(JSON.stringify(result.value.data), "\"" + updatedData + "\"", "the updated doc " + docId + " doc has been shadowed to app_bucket - same data ")
                    t.ok(!err, "the document " + docId + " is shadowed to app_bucket successfully. err: " + JSON.stringify(err))
                    cb(err, result)
                }
            })
        }, function(err, result){
            t.end()
        })
    }, timeoutReplication);
})

test("kill SG", function(t) {
    sg.kill()
    t.end()
})

test("re-start sync_gateway", test_conf, function(t){
    // start updating docs
    common.updateDBDocs(t, {dbs : [ pushdb ],
        numrevs : 100,
        numdocs : numDocs})
    // run compaction while documents are updating
    eventEmitter.once("docsUpdating", function(){
        setTimeout(function () {
            common.launchSGShadowing(t, __dirname+"/../config/sb_sg_restart_revs_limit.json", function(_sg){
                console.log("launchSGShadowing!!!!!!!!!!!!!")
                sg  = _sg
                gateway = sg.url
                //t.end()
            })
        }, timeoutReplication)
        //t.end()
        //common.compactDBs(t, [dbs[0]], emitsdefault)
    })
})


/*test("Mobile client remove the doc in lite", function(t) {
    async.times(numDocs, function(i, cb){
        var docId = pushdb + "_" + i;
        coax([server, pushdb, docId], function (err, result) {
            if (err || (!result) || result == undefined) {
                t.fail(true, "unable to get doc rev for url:" + coax([server, pushdb, docid]).pax().toString() + ", err:" + err + ", result:" + result);
                cb(err, result)
            } else {
                coax.del([server, pushdb, docId, {rev : result._rev}], function (err, json) {
                    t.equals(json.ok, true, "doc " + docId + " is deleted")
                })
                cb(err, result)
            }
        })
    }, function(err, result){
        t.end()
    })
})

test("Web client verifies the deleted docs are no longer in app-bucket", function(t) {
    setTimeout(function () {
        async.times(numDocs, function(i, cb){
            var docId = pushdb + "_" + i;
            app_bucket.get(docId, function(err, result) {
                if (err) {
                    t.equals(JSON.stringify(err.message), "\"The key does not exist on the server\"", "The deleted document is removed at app bucket")
                    cb(err, result)
                } else {
                    t.fail("Document " + docId + " still existed: " + result)
                    cb(err, result)
                }
            })
        }, function(err, result){
            t.end()
        })
    }, timeoutReplication);
});
*/

test("delete buckets", test_conf, function (t) {
    common.deleteShadowBuckets(t, bucketNames[0],bucketNames[1], setTimeout(function () {
        t.end();
    }, timeoutReplication * 5));
});


test("done", function(t){setTimeout(function() {
    common.cleanup(t, function(json) {
        sg.kill()
        app_bucket.disconnect()
        t.end()
    })
}, timeoutReplication);})
