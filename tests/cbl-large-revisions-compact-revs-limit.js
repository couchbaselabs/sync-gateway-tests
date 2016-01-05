var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util = require("util"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 5000};


var server, sg, gateway,
// local dbs
    dbs = ["large-revisions-revslimit"];

config.SyncGatewayAdminParty = __dirname + "/../config/admin_party_revslimit.json"
if (config.DbUrl.indexOf("http") > -1) config.SyncGatewayAdminParty = __dirname + "/../config/admin_party_cb_revslimit.json"

var numDocs = parseInt(config.numDocsMaxRevs) || 10;
var timeoutReplication = 5000;
var numRevs = parseInt(config.numRevs)*2 || 20;

if (config.provides == "android" || config.DbUrl.indexOf("http") > -1) timeoutReplication = 1000 * numDocs;

var module_name = '\r\n\r\n>>>>>>>>>>>>>>>>>>>' + module.filename.slice(__filename.lastIndexOf(require('path').sep)
        + 1, module.filename.length - 3) + '.js ' + new Date().toString()
console.time(module_name);
console.error(module_name)


test("cleanup cb bucket", test_conf, function (t) {
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
            }, timeoutReplication*6));
    } else {
        t.end();
    }
})

test("kill LiteServ", function (t) {
    if (config.provides == "android") {
        spawn('adb', ["shell", "am", "force-stop", "com.couchbase.liteservandroid"])
        setTimeout(function () {
            t.end()
        }, 3000)
    } else {
        t.end()
    }
})

// start client endpoint
test("start test client", function (t) {
    common.launchClient(t, function (_server) {
        server = _server
        coax([server, "_session"], function (err, ok) {
            try {
                console.error(ok)
                t.equals(ok.ok, true, "api exists")
                if (ok.ok == true) {
                    t.end()
                } else {  return new Error("LiteServ was not run?: " + ok)}
            } catch (err) {
                console.error(err, "will restart LiteServ...")
                common.launchClient(t, function (_server) {
                    server = _server
                    t.end()
                }, setTimeout(function () {
                }, 3000))
            }
        })
    })
})

// kill sync gateway
test("kill syncgateway", function (t) {
    common.kill_sg(t, function () {
        },
        setTimeout(function(){
            t.end();
        }, 2000))
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
                    continuous: true,
                }, function (err, ok) {
                    t.equals(err, null,
                        util.inspect({_replicate: db + " -> " + gatewayDB}))
                    cb(err, ok)
                })

            }, sgpush)
        }], function (err, json) {
        t.false(err, "setup push replication to gateway")
        t.end()
    })
})

test("verify replicated num-docs=" + numDocs, test_conf, function (t) {
    common.verifySGNumDocs(t, [sg], numDocs)
})

test("doc update on SG", test_conf, function (t) {
    // start updating docs
    console.log("start updating SG docs...", numRevs * 4, " numRevs")
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
                        continuous: true,
                    }, function (err, ok) {
                        t.equals(err, null,
                            util.inspect({_replicate: db + " <- " + gatewayDB}))
                        cb(err, ok)
                    })

                }, sgpull)
            }]
        , function (err, info) {
            setTimeout(function () {
                t.false(err, "replication created")
                console.log("info", info)
                gatewayDB = coax([gateway, config.DbBucket]).pax().toString()
                coax([gatewayDB, "_all_docs"], function (err, allDocs) {
                    console.log(allDocs)
                    t.false(err, "sg database exists")
                    t.ok(allDocs, "got _all_docs response")
                    console.log("sg doc_count", coax([gatewayDB, "_all_docs"]).pax().toString(), allDocs.total_rows);
                    t.equals(allDocs.total_rows, numDocs, "all docs replicated")
                    t.equals(allDocs.update_seq, 2*numRevs*numDocs*4 + numDocs + 1, "update_seq correct")
                    t.end()
                })
            }, timeoutReplication)
        })
})

// compact db
test("compact db", test_conf, function (t) {
    common.compactDBs(t, dbs)
})

test("verify num Revs1", test_conf, function (t) {
    setTimeout(function () {
        common.verifyNumRevsLessRevsLimit(t, dbs, numDocs, 10)
    }, timeoutReplication);
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

test("load databases 2", test_conf, function (t) {
    common.createDBDocs(t, {numdocs: numDocs, dbs: dbs})
})

test("update docs", test_conf, function (t) {
    console.log("start updating docs...", 5 * numRevs, "numRevs")
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

test("compact db", test_conf, function (t) {
    common.compactDBs(t, dbs)
})

test("verify num Revs4", test_conf, function (t) {
    setTimeout(function () {
        common.verifyNumRevsLessRevsLimit(t, dbs, numDocs, 10)
    }, timeoutReplication);
})

test("delete db docs", test_conf, function (t) {
    common.deleteDBDocs(t, dbs, numDocs)
})

test("cleanup cb bucket", test_conf, function (t) {
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
            }, timeoutReplication*6));
    } else {
        t.end();
    }
})

// delete all dbs
test("delete test databases", function(t){
    common.deleteDBs(t, dbs)
    setTimeout(function () {
        t.end()
    }, 5000)
})

test("done", function (t) {
    common.cleanup(t, function (json) {
        sg.kill()
    }, console.timeEnd(module_name));
    setTimeout(function () {
        t.end();
    }, 5000)
});