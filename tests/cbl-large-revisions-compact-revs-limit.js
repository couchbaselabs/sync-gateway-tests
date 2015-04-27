var launcher = require("../lib/launcher"),
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util = require("util"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 600,
    test_conf = {timeout: test_time * 4000};

var server, sg, gateway,
// local dbs
    dbs = ["large-revisions-revslimit"];


config.SyncGatewayAdminParty= __dirname+"/../config/admin_party_cb_revslimit.json"
//module.exports.SyncGatewayAdminParty = __dirname+"/admin_party_cb_revslimit.json"

var numDocs = parseInt(config.numDocsMaxRevs) || 2;
var timeoutReplication = 10000;
var numRevs = parseInt(config.numRevs) || 20;

if (config.provides == "android" || config.DbUrl.indexOf("http") > -1) timeoutReplication = timeoutReplication * numDocs;

test("cleanup cb bucket", function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        coax.post([config.DbUrl + "/pools/default/buckets/" + config.DbBucket + "/controller/doFlush"],
            {
                "auth": {
                    "passwordCredentials": {
                        "username": "Administrator",
                        "password": "password"
                    }
                }
            }, function (err, js) {
                t.false(err, "flush cb bucket")
            },
            setTimeout(function () {
                t.end();
            }, 5000));
    } else {
        t.end();
    }
})

// start client endpoint
test("start test client", function (t) {
    common.launchClient(t, function (_server) {
        server = _server
        t.end()
    })
})

// start sync gateway
test("start syncgateway", function (t) {
    common.launchSG(t, function (_sg) {
        sg = _sg
        gateway = sg.url
        t.end()
    })
})

// create all dbs
test("create test databases", function (t) {
    common.createDBs(t, dbs)
})

test("load databases", test_conf, function (t) {
    common.createDBDocs(t, {numdocs: numDocs, dbs: dbs})
})

// setup push replication to gateway
test("set push replication to gateway", function (t) {
    var gatewayDB = coax([gateway, config.DbBucket]).pax().toString()
    if (config.provides == "android") gatewayDB = gatewayDB.replace("localhost", "10.0.2.2")
    async.series([
        function (sgpush) {

            async.mapSeries(dbs, function (db, cb) {

                coax([server, "_replicate"]).post({
                    source: db,
                    target: gatewayDB,
                    continuous : true,
                }, function (err, ok) {
                    t.equals(err, null,
                        util.inspect({_replicate: db + " -> " + gatewayDB}))
                    cb(err, ok)
                })

            }, sgpush)
        }/*,
         function(sgpull){

         async.mapSeries(dbs, function(db, cb){

         coax([server, "_replicate"]).post({
         source : gatewayDB,
         target : db,
         continuous : true,
         }, function(err, ok){

         t.equals(err, null,
         util.inspect({_replicate : db+" <- " + gatewayDB}))
         i++
         cb(err, ok)
         })

         }, sgpull)
         }*/], function (err, json) {
        t.false(err, "setup push replication to gateway")
        t.end()
    })

})

test("verify replicated num-docs=" + numDocs, test_conf, function (t) {
    common.verifySGNumDocs(t, [sg], numDocs)
})

test("doc update on SG", test_conf, function (t) {
    // start updating docs
    common.updateSGDocs(t, {
        dbs: [sg],
        numrevs: numRevs * 4
    })
})

test("doc update on liteServ", test_conf, function (t) {
    // start updating docs
    common.updateDBDocs(t, {
        dbs: dbs,
        numrevs: numRevs * 4,
        numdocs: numDocs
    })
})

// setup pull replication from gateway
test("set pull replication from gateway", test_conf, function (t) {
    var gatewayDB = coax([gateway, config.DbBucket]).pax().toString()
    if (config.provides == "android") gatewayDB = gatewayDB.replace("localhost", "10.0.2.2")
    async.series([
            function (sgpull) {

                async.mapSeries(dbs, function (db, cb) {

                    coax([server, "_replicate"]).post({
                        source: gatewayDB,
                        target: db,
                        continuous : true,
                    }, function (err, ok) {
                        t.equals(err, null,
                            util.inspect({_replicate: db + " <- " + gatewayDB}))
                        cb(err, ok)
                    })

                }, sgpull)
            }]
        , function (err, info) {
            setTimeout(function () {
//		  t.false(err, "replication created")
//		  console.log("info", info)
//		  gatewayDB = coax([gateway, config.DbBucket]).pax().toString()
//		  coax([gatewayDB, "_all_docs"],function(err, allDocs){
//			  console.log(allDocs)
//			  t.false(err, "sg database exists")
//			  t.ok(allDocs, "got _all_docs repsonse")
//			  console.log("sg doc_count", coax([gatewayDB, "_all_docs"]).pax().toString(), allDocs.total_rows);
//			  t.equals(allDocs.total_rows, numDocs, "all docs replicated")
//			  //t.equals(allDocs.update_seq, numDocs*3 + 1, "update_seq correct")
                t.end()
//		  })
            }, 0)
        })
})

test("verify num Revs1", test_conf, function (t) {
    setTimeout(function () {
        console.log(timeoutReplication)
        common.verifyNumRevsLessRevsLimit(t, dbs, numDocs, 10)
    }, timeoutReplication*4);
})

test("delete conflicts in docs", test_conf, function (t) {
    common.deleteDBConflictDocs(t, dbs, numDocs)
})

test("verify conflicts deleted in docs", test_conf, function (t) {
    common.verifyNoConflictsDocs(t, dbs, numDocs)
})

test("verify doc revisions", test_conf, function (t) {
    //create, update on liteServ( delete & delete conflicts is not included)
    common.verifyDocsRevisions(t, dbs, numDocs, numRevs * 4 + 1 + "-")
})

test("verify num Revs2", test_conf, function (t) {
    common.verifyNumRevsLessRevsLimit(t, dbs, numDocs, 1)
})

test("delete db docs", test_conf, function (t) {
    common.deleteDBDocs(t, dbs, numDocs)
})

test("load databases", test_conf, function (t) {
    common.createDBDocs(t, {numdocs: numDocs, dbs: dbs})
})

test("update docs", test_conf, function (t) {
    // start updating docs
    common.updateDBDocs(t, {dbs: dbs, numrevs: 5 * numRevs, numdocs: numDocs})
})

test("verify num Revs3", test_conf, function (t) {
    common.verifyNumRevsLessRevsLimit(t, dbs, numDocs, numRevs * 5 + 2)
})

test("verify doc revisions 9*numrevs + 3-", test_conf, function (t) {
    //create, update, delete, create, update*5
    common.verifyDocsRevisions(t, dbs, numDocs, 9 * numRevs + 3 + "-")
})

test("verify num Revs2", test_conf, function (t) {
    setTimeout(function () {
        common.verifyNumRevsLessRevsLimit(t, dbs, numDocs, 10)
    }, timeoutReplication);

})

test("delete db docs", test_conf, function (t) {
    common.deleteDBDocs(t, dbs, numDocs)
})

test("cleanup cb bucket", function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        coax.post([config.DbUrl + "/pools/default/buckets/" + config.DbBucket + "/controller/doFlush"],
            {
                "auth": {
                    "passwordCredentials": {
                        "username": "Administrator",
                        "password": "password"
                    }
                }
            }, function (err, js) {
                t.false(err, "flush cb bucket")
            },
            setTimeout(function () {
                t.end();
            }, 5000));
    } else {
        t.end();
    }
})

test("done", function (t) {
    common.cleanup(t, function (json) {
        sg.kill()
        t.end()
    })
})