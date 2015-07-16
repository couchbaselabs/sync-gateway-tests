var launcher = require("../lib/launcher"),
  coax = require("coax"),
  async = require("async"),
  common = require("../tests/common"),
  util =  require("util"),
  cb_util = require("../tests/utils/cb_util"),
  test = require("tap").test,
  test_time = process.env.TAP_TIMEOUT || 60,
  test_conf = {timeout: test_time * 1000},
  couchbase = require('couchbase');

var server, sg, app_bucket, shadow_bucket
pulldb = "pull_db",
bucketNames = ["app-bucket", "shadow-bucket"]

var sgShadowBucketDb = "http://localhost:4985/db"  
if (config.provides=="android") sgShadowBucketDb = sgShadowBucketDb.replace("localhost", "10.0.2.2");
var timeoutShadowing = 2000;
var timeoutReplication = 6000;
//decreased for jenkins to avoid TransactionTooLargeException. We should verify with 2M size
// var maxDataSize = 20000000;
var maxDataSize = 100000;


test("delete buckets", test_conf, function (t) {
    common.deleteShadowBuckets(t, bucketNames[0], bucketNames[1], setTimeout(function () {
        t.end();
    }, timeoutReplication * 5));
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

test("create shadow_bucket connection", function(t){
	shadow_bucket = new couchbase.Cluster('127.0.0.1:8091').openBucket(bucketNames[1], function(err) {
		  if (err) {
		    // Failed to make a connection to the Couchbase cluster.
		    throw err;
		  } else{
			  t.end();
		  }
	})
})

test("start sync_gateway", function(t){
  common.launchSGShadowing(t, function(_sg){
    sg  = _sg
    t.end()
  })
})

test("create test database " + pulldb, function(t){
  common.createDBs(t, [ pulldb ])
    setTimeout(function () {
        t.end()
    }, timeoutReplication/2)
})

test("Mobile client start continous replication", function(t) {
console.log("===== Web client to start pull replication url:" +
coax([server, "_replicate"]).pax().toString(), "source:",
sgShadowBucketDb, ">> target:", pulldb)
    coax.post([server, "_replicate"], {
        source : sgShadowBucketDb,
        target : pulldb,
        continuous : true
    }, function(err, info) {
        t.false(err, "create continous replication. error: " + JSON.stringify(err))
        t.end()
    });    
});

test("Adding a document of maximum size to app-bucket and verify it is shadowed correctly", function(t) {
    var docId = "testdoc_max_size";
    data = (new Array(maxDataSize - 321 )).join("x")  // 321 is the size of
														// additional data SG
														// craeted for the doc
    var value = {k : data};
    // console.log("===== Creating doc in app bucket. Doc id:" + docId + " with
	// data size of " + maxDataSize);
    app_bucket.upsert(docId, JSON.stringify( value ), function(err, result) {
        if (err) {
            t.fail("Fail to create document " + docId + " in app_bucket. err: " + JSON.stringify(err))
            throw err;
            cb(err, result)
        } else {
            t.ok(!err, "Document " + docId + " created successfully on app_bucket")
            setTimeout(function () {
                // Check the doc is shadowed to shadow bucket successfully
                shadow_bucket.get(docId, function(err, result) {
                    if (err) {
                        t.fail("Fail to get document " + docId + " in shadow_bucket. err: " + JSON.stringify(err))
                        throw err;
                        cb(err, result)
                    } else {
                        t.equals(JSON.stringify(result.value.k), JSON.stringify(data), "Document " + docId + " shadowed successfully to shadow bucket - same data" )
                        setTimeout(function () {
                            // Mobile client to check the doc replicated to lite
							// db
                            var urlReadDoc = coax([server, pulldb, docId, {attachments: true}]).pax().toString()
                            coax([server, pulldb, docId], function (err, js) {
                                if (err) {
                                    t.fail("Fail to read document " + docId + " in destination lite db. url: " + urlReadDoc + " err: " + JSON.stringify(err) )
                                    t.end()
                                } else {
                                    t.equals(JSON.stringify(js.k), JSON.stringify(data), "Document " + docId + " is replicated to lite db successfully - same data");
                                    t.end()
                                }
                            })
                        }, timeoutReplication*4)
                    }
                }); 
            }, timeoutShadowing*4) 
        }
    });            
});

test("Verify updating a doc with maximum size in app-bucket and check shadowing is done properly", function(t) {
    var docId = "testdoc_max_size";
    data = (new Array(maxDataSize - 368 )).join("y")   // With update,
														// additional revision
														// takes more space
    var value = {k : data};
    // console.log("===== Updating doc in app bucket. Doc id:" + docId + " with
	// data size of " + maxDataSize);
    app_bucket.upsert(docId, JSON.stringify( value ), function(err, result) {
        if (err) {
            t.fail("Fail to create document " + docId + " in app_bucket. err: " + JSON.stringify(err))
            throw err;
            cb(err, result)
        } else {
            t.ok(!err, "Document " + docId + " created successfully on app_bucket")
            setTimeout(function () {
                // Check the doc is shadowed to shadow bucket successfully
                shadow_bucket.get(docId, function(err, result) {
                    if (err) {
                        t.fail("Fail to get document " + docId + " in shadow_bucket. err: " + JSON.stringify(err))
                        throw err;
                        cb(err, result)
                    } else {
                        t.equals(JSON.stringify(result.value.k), JSON.stringify(data), "Document " + docId + " shadowed successfully to shadow bucket - same data" )
                        setTimeout(function () {
                            // Mobile client to check the doc replicated to lite
							// db
                            var urlReadDoc = coax([server, pulldb, docId, {attachments: true}]).pax().toString()
                            coax([server, pulldb, docId], function (err, js) {
                                if (err) {
                                    t.fail("Fail to read document " + docId + " in destination lite db. url: " + urlReadDoc + " err: " + JSON.stringify(err) )
                                    t.end()
                                } else {
                                    t.equals(JSON.stringify(js.k), JSON.stringify(data), "Document " + docId + " is replicated to lite db successfully - same data");
                                    t.end()
                                }
                            })
                        }, timeoutReplication)
                    }
                }); 
            }, timeoutShadowing ) 
        }
    });            
});

test("Verify removing a doc with maximum size in app-bucket and check the doc is no longer accessible from lite db", function(t) {
  var docId = "testdoc_max_size";
  app_bucket.remove(docId, function(err, result) {
      if (err) {
          t.fail("Fail to create document " + docId + " in app_bucket. err: " + JSON.stringify(err))
          throw err;
          cb(err, result)
      } else {
          t.ok(!err, "Document " + docId + " created successfully on app_bucket")
          setTimeout(function () {
              // Mobile client to check the doc not accessible from the lite
				// db
              var urlReadDoc = coax([server, pulldb, docId, {attachments: true}]).pax().toString()
              coax([server, pulldb, docId], function (err, result) {
                  if (err) {
                      t.equals(JSON.stringify(err.status), "404", "expected status code for doc " + docId + " should be 404.  return: " + JSON.stringify(err))
                      t.end()
                  } else {
                      t.fail("Error: Doc " + docId + " was removed from the app bucket but still accessible from lite db.")
                      t.end()
                  }
              })
          }, timeoutReplication)
      }
  });            
});

test("delete buckets", function (t) {
    common.deleteShadowBuckets(t, bucketNames[0],bucketNames[1], setTimeout(function () {
        t.end();
    }, timeoutReplication * 3));
});

test("done", function(t){setTimeout(function() {
    common.cleanup(t, function(json) {
        sg.kill()
        app_bucket.disconnect()
        shadow_bucket.disconnect()
        t.end()
    })
}, timeoutReplication);})
