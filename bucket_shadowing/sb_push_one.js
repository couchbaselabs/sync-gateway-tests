var launcher = require("../lib/launcher"),
  coax = require("coax"),
  async = require("async"),
  common = require("../tests/common"),
  cb_util = require("../tests/utils/cb_util"),
  util =  require("util"),
  test = require("tap").test,
  test_time = process.env.TAP_TIMEOUT || 100,
  test_conf = {timeout: test_time * 1000},
  cb_util = require("../tests/utils/cb_util"),
  couchbase = require('couchbase');

var server, sg
var pushdb = "push_db"
var bucketNames = ["app-bucket", "shadow-bucket"]

var sgShadowBucketDbLH = "http://localhost:4985/db"
var sgShadowBucketDb = "http://localhost:4985/db"
if (config.provides=="android") sgShadowBucketDb = sgShadowBucketDbLH.replace("localhost", "10.0.2.2");

var timeoutReplication = 6000;
var docId = "testdoc";
var value_data = Math.random().toString(5).substring(4);
var value_json = {_id : docId,
            data: value_data,   
            at: new Date()};
var value = JSON.stringify( value_json );
var app_bucket;

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
    }, timeoutReplication*2)
  })
})

// kill sync gateway
test("kill syncgateway", function (t) {
    common.kill_sg(t, function () {
        t.end()
    })
})

test("start sync gateway", test_conf, function(t){
    common.launchSGShadowing(t, __dirname+"/../config/gateway_config_shadow_localhost.json", function(_sg){
    sg  = _sg
    t.end()
  })
})

test("create app_bucket connection", function(t){
    app_bucket = new couchbase.Cluster('127.0.0.1:8091').openBucket(bucketNames[0], function(err) {
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

test("Load one doc into lite pushdb", function(t){
  setTimeout(function () {
    coax.put([server,pushdb, docId], value_json, function(err, ok){
        if (err){
            t.false(err, "error loading doc.  url: " + coax.put([server, pushdb, docId]).pax().toString() +" err: " + JSON.stringify(err));
            t.end()
        } else {
            t.equals(docId, ok.id, "Doc " + docId + " created");
            t.end();
        }
    });
  }, timeoutReplication);  
})

test("Mobile client start continous push replication", function(t) {
    console.log(coax([server, "_replicate"]).pax().toString(), "source:", pushdb, ">>  target:", sgShadowBucketDb);
    coax.post([server, "_replicate"], {
        source : pushdb,
        target : sgShadowBucketDb,
        continuous : true
    }, function(err, info) {
        t.false(err, "error starting continous push replication. error:" + JSON.stringify(err))
        t.end();
    });
});

test("Verify that the doc is replicated to sync_gateway", test_conf, function(t) {
    setTimeout(function () {
        coax([sgShadowBucketDbLH, "_all_docs"],function(err, allDocs){
            t.false(err, "sg database exists");
            t.ok(allDocs, "got _all_docs response");
            t.equals(allDocs.update_seq, 2, "sg sequence number correct")
            t.end();
        });
    }, timeoutReplication*2);
});

test("Verify that the doc is shadowed to app-bucket", test_conf, function(t) {
    setTimeout(function () {
        app_bucket.get(docId, function(err, result) {
            if (err) {
                t.end();
                throw err;
            } else {
                t.equals(JSON.stringify(result.value.at), JSON.stringify(value_json.at), "Document shadowed successfully to app bucket - same timestamp");
                t.equals(JSON.stringify(result.value.data), JSON.stringify(value_json.data), "Document shadowed successfully to app bucket - same data");
                t.end();
            }
        });
    }, timeoutReplication);
});

test("Update the doc in lite pushdb", function(t){
    // get the document revision and update the revision
    coax([server, pushdb, docId], function (err, doc) {
        if (err || (!doc) || doc == undefined) {
            t.fail("unable to get doc rev for url:" + coax([server, pushdb, docId]).pax().toString() + ", err:" + err + ", json:" + doc);
            t.end();
        } else {
            // Change the date and data of the doc
            doc.data = "222222"
            doc.at = new Date()
            value_json.data = doc.data
            value_json.at = doc.at
            // put updated doc
            coax.put([server, pushdb, docId], doc, function(err, ok){
                if (err){
                    t.false(err, "error updating doc.  url: " + coax.put([server,pushdb, docId]).pax().toString() +" err: " + JSON.stringify(err));
                    t.end()
                } else {
                    t.equals(docId, ok.id, "Doc " + docId + " updated");
                    t.end();
                }
            })
        }
    })
})

test("Verify the updated document is shadowed to app-bucket", test_conf, function(t) {
    setTimeout(function () {
        app_bucket.get(docId, function(err, result) {
            if (err) {
                throw err;
                t.end();
            } else {
                t.equals(JSON.stringify(result.value.at), JSON.stringify(value_json.at), "Document shadowed successfully to app bucket - same timestamp");
                t.equals(JSON.stringify(result.value.data), JSON.stringify(value_json.data), "Document shadowed successfully to app bucket - same data");
                t.end();
            }
        });
    }, timeoutReplication);
});

test("Mobile client remove the doc in lite and verify the change is shadowed to app-bucke", function(t) {
    // get the document revision and delete the revision
    coax([server, pushdb, docId], function (err, doc) {
        if (err || (!doc) || doc == undefined) {
            t.fail("unable to get doc rev for url:" + coax([server, pushdb, docId]).pax().toString() + ", err:" + err + ", json:" + doc);
            t.end();
        } else {
            // delete doc
            coax.del([server, pushdb, docId, {rev : doc._rev}], function (err, json) {
                t.equals(json.ok, true, "doc is deleted")
                setTimeout(function () {
                    app_bucket.get(docId, function(err, result) {
                        console.log(err, result)
                        t.equals(JSON.stringify(err), "{\"message\":\"The key does not exist on the server\",\"code\":13}", "The deleted document is removed at app bucket")
                        t.end()
                    });
                }, timeoutReplication);
            })
        }
    })
});

test("Re-load the deleted doc into lite pushdb", function(t){
    coax.put([server,pushdb, docId], value_json, function(err, ok){
        if (err){
            t.false(err, "error loading doc.  url: " + coax.put([server,pushdb, docId]).pax().toString() +" err: " + JSON.stringify(err));
            t.end()
        } else {
            t.equals(docId, ok.id, "Doc " + docId + " created");
            t.end();
        }
    });
})

test("Verify that the doc is shadowed to app-bucket", test_conf, function(t) {
    setTimeout(function () {
        app_bucket.get(docId, function(err, result) {
            if (err) {
                throw err;
                t.end();
            } else {
                t.equals(JSON.stringify(result.value.at), JSON.stringify(value_json.at), "Document shadowed successfully to app bucket - same timestamp");
                t.equals(JSON.stringify(result.value.data), JSON.stringify(value_json.data), "Document shadowed successfully to app bucket - same data");
                t.end();
            }
        });
    }, timeoutReplication);
});

test("delete buckets", test_conf, function (t) {
    common.deleteShadowBuckets(t, bucketNames[0],bucketNames[1], setTimeout(function () {
        t.end();
    }, timeoutReplication * 4));
});

test("done", function(t){setTimeout(function() {
    common.cleanup(t, function(json) {
        sg.kill()
        app_bucket.disconnect()
        t.end()
    })
}, timeoutReplication);})