
var launcher = require("../lib/launcher"),
    coax = require("coax"),
    common = require("../tests/common"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    cb_util = require("./utils/cb_util"),
    test = require("tap").test,
    sudo = require('sudo'),
    test_time = process.env.TAP_TIMEOUT || 30,
    test_conf = {timeout: test_time * 1000};

var numDocs=(parseInt(config.numDocs) || 100)*5;

var server, sg1, sg2, sg2, sgdb,
// local dbs
    dbs = ["mismatch-restart-one", "mismatch-restart-two"];

var timeoutReplication=0;
if (config.DbUrl.indexOf("http") > -1){
    timeoutReplication=5000;
}

console.time(module.filename.slice(__filename.lastIndexOf(require('path').sep)+1, module.filename.length -3));

test("delete buckets", test_conf, function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        cb_util.deleteBucket(t, config.DbBucket,
            setTimeout(function () {
                t.end()
            }, timeoutReplication * 10));
    } else {
        t.end()
    }
});

test("create buckets", test_conf, function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        cb_util.createBucket(t, config.DbBucket, setTimeout(function () {
            t.end();
        }, timeoutReplication * 6));
    } else {
        t.end()
    }
});

test("start test client", function(t){
    common.launchClient(t, function(_server){
        server = _server
        setTimeout(function () {
            t.end()
        }, timeoutReplication*3)
    })
})

// start sync gateway
test("start syncgateway", function(t){
    common.launchSGWithParams(t, 9888, config.DbUrl, config.DbBucket, function(_sg1){
        sg1  = _sg1
        t.end()
    })
})

// create all dbs
test("create test databases", function(t){
    common.createDBs(t, dbs)
    sgdb1 = sg1.db.pax().toString()
})

test("load databases", test_conf, function(t){
    t.equals(numDocs/2, Math.floor(numDocs/2), "numDocs must be an even number")
    common.createDBDocs(t, {numdocs : numDocs/2, dbs : [dbs[0]], docgen : "channels"})
})

test("setup continuous push and pull from both client database", function(t) {
    if (config.provides=="android"){
        sgdb1 = sgdb1.replace("localhost", "10.0.2.2")
    }
    common.setupPushAndPull(server, dbs[0], sgdb1, function(err, ok){
        t.false(err, 'replication one ok')
        common.setupPushAndPull(server, dbs[1], sgdb1, function(err, ok){
            t.false(err, 'replication two ok')
            t.end()
        })
    })
})

test("verify dbs have same number of docs", test_conf, function(t) {
    common.verifyNumDocs(t, dbs, numDocs/2)
})

test("kill CB", test_conf, function(t) {
    if (/^linux/.test(process.platform) && (config.DbUrl.indexOf("http") > -1)) {
        var child = sudo(['/etc/init.d/couchbase-server', 'stop']);
        child.stdout.on('data', function (data) {
            console.log(data.toString());
            t.end();
        });
    } else {
        t.end();
    }
})

test("reload databases after restart", test_conf, function(t){
    common.updateDBDocs(t, {dbs : [dbs[0]],
        numrevs : 5,
        numdocs : numDocs/2})

})

test("load databases", test_conf, function(t){
    common.createDBDocs(t, {numdocs : numDocs, dbs : [dbs[1]], docgen : "channels"})
})

// restart CB
test("restart CB", test_conf, function(t){
    if (/^linux/.test(process.platform) && (config.DbUrl.indexOf("http") > -1)) {
        var child = sudo(['/etc/init.d/couchbase-server', 'start']);
        child.stdout.on('data', function (data) {
            console.log(data.toString());
            t.end();
        });
    } else {
        t.end();
    }
})

test("reload databases after restart", test_conf, function(t){
    common.updateDBDocs(t, {dbs : [dbs[1]],
        numrevs : 5,
        numdocs : numDocs})

})

test("verify db[0] have same number of docs", test_conf, function (t) {
    common.verifyNumDocs(t, [dbs[0]], numDocs * 3 / 2)
})

test("verify db[1] have same number of docs", test_conf, function (t) {
    common.verifyNumDocs(t, [dbs[1]], numDocs * 3 / 2)
})

test("verify cbl changes on dbs[0]", function (t) {
    common.verifyChanges(coax([server, dbs[0]]), function (db_one_ids, db_one_dup_ids, db_one_seqs, db_one_dup_seqs) {
        var one_ids_list = Object.keys(db_one_ids), db_one_seqs_list = Object.keys(db_one_seqs)
        t.equals(one_ids_list.length, numDocs * 3 / 2, "dbs[0] correct number of docs in _all_docs")
        t.equals(db_one_seqs_list.length, numDocs * 3 / 2, "dbs[0] correct number of docs in _changes")
        t.equals(db_one_dup_ids.length, 0, "dbs[0] duplicate ids in changes " + db_one_dup_ids)
        t.equals(db_one_dup_seqs.length, 0, "dbs[0] duplicate seqs in changes")

        common.verifyChanges(coax([server, dbs[0]]), function (db_two_ids, db_two_dup_ids, db_two_seqs, db_two_dup_seqs) {
            var db_two_idslist = Object.keys(db_two_ids), db_two_seqs_list = Object.keys(db_two_seqs)

            t.equals(db_two_idslist.length, numDocs * 3 / 2, "dbs[0] correct number of docs in _all_docs")
            t.equals(db_two_seqs_list.length, numDocs * 3 / 2, "dbs[0] correct number of docs in _changes")
            t.equals(db_two_dup_ids.length, 0, "dbs[0] duplicate ids in changes")
            t.equals(db_two_dup_seqs.length, 0, "dbs[0] duplicate seqs in changes")

            var missing_from_one = [], missing_from_two = []
            for (var i = db_two_idslist.length - 1; i >= 0; i--) {
                if (!db_one_ids[db_two_idslist[i]]) {
                    missing_from_one.push(db_two_idslist[i])
                }
            }
            ;
            for (var i = one_ids_list.length - 1; i >= 0; i--) {
                if (!db_two_ids[one_ids_list[i]]) {
                    missing_from_two.push(one_ids_list[i])
                }
            }
            ;
            t.equals(0, missing_from_one.length, "dbs[0] missing changes in one " + missing_from_one.join())
            t.equals(0, missing_from_two.length, "dbs[0] missing changes in two" + missing_from_two.join())
            t.end()
        })
    })
})

test("verify cbl changes on dbs[1]", function (t) {
    common.verifyChanges(coax([server, dbs[1]]), function (db_one_ids, db_one_dup_ids, db_one_seqs, db_one_dup_seqs) {
        var one_ids_list = Object.keys(db_one_ids), db_one_seqs_list = Object.keys(db_one_seqs)
        t.equals(one_ids_list.length, 3 * numDocs / 2, "dbs[1] correct number of docs in _all_docs")
        t.equals(db_one_seqs_list.length, 3 * numDocs / 2, "dbs[1] correct number of docs in _changes")
        t.equals(db_one_dup_ids.length, 0, "dbs[1] duplicate ids in changes " + db_one_dup_ids)
        t.equals(db_one_dup_seqs.length, 0, "dbs[1] duplicate seqs in changes")

        common.verifyChanges(coax([server, dbs[1]]), function (db_two_ids, db_two_dup_ids, db_two_seqs, db_two_dup_seqs) {
            var db_two_idslist = Object.keys(db_two_ids), db_two_seqs_list = Object.keys(db_two_seqs)

            t.equals(db_two_idslist.length, 3 * numDocs / 2, "dbs[1] correct number of docs in _all_docs")
            t.equals(db_two_seqs_list.length, 3 * numDocs / 2, "dbs[1] correct number of docs in _changes")
            t.equals(db_two_dup_ids.length, 0, "dbs[1] duplicate ids in changes")
            t.equals(db_two_dup_seqs.length, 0, "dbs[1] duplicate seqs in changes")

            var missing_from_one = [], missing_from_two = []
            for (var i = db_two_idslist.length - 1; i >= 0; i--) {
                if (!db_one_ids[db_two_idslist[i]]) {
                    missing_from_one.push(db_two_idslist[i])
                }
            }
            ;
            for (var i = one_ids_list.length - 1; i >= 0; i--) {
                if (!db_two_ids[one_ids_list[i]]) {
                    missing_from_two.push(one_ids_list[i])
                }
            }
            ;
            t.equals(0, missing_from_one.length, "dbs[1] missing changes in one " + missing_from_one.join())
            t.equals(0, missing_from_two.length, "dbs[1] missing changes in two" + missing_from_two.join())
            t.end()
        })
    })
})

test("verify sync gateway changes feed has all docs in it", test_conf, function (t) {
    var db = coax(sg1.db.pax().toString())

    db("_changes", function (err, data) {
        console.log(data)
        var changes = data.results.map(function (r) {
            return r.id
        });
        db("_all_docs", function (err, view) {
            var docs = view.rows;
            var missing = [];

            docs.forEach(function (d) {
                if (changes.indexOf(d.id) == -1) {
                    missing.push(d.id)
                }
            })

            var changeIds = {}, dupIds = [];
            var changeSeqs = {}, dupSeqs = [];

            data.results.forEach(function (r) {
                if (changeIds[r.id]) {
                    dupIds.push(r.id)
                }
                changeIds[r.id] = true

                if (changeSeqs[r.seq]) {
                    dupSeqs.push(r.seq)
                }
                changeSeqs[r.seq] = true
            })

            t.equals(docs.length, numDocs * 3 / 2, "correct number of docs in _all_docs:" + docs.length)
            //t.equals(changes.length, numDocs + 1, "correct number of docs in _changes:" + changes.length)
            console.log("missing " + missing.length + ", ids:", missing.join(', '))
            console.log("duplicate change ids " + dupIds.length + ", ids:", dupIds.join(', '))
            console.log("duplicate change seqs " + dupSeqs.length + ", seqs:", dupSeqs.join(', '))

            t.equals(dupIds.length, 0, "duplicate ids in changes:" + dupIds.length)
            t.equals(dupSeqs.length, 0, "duplicate seqs in changes:" + dupSeqs.length)
            t.equals(missing.length, 0, "missing changes:" + missing.length)


            t.end()
        })

    })
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
            }, test_time * 100));
    } else {
        t.end();
    }
})

test("done", function (t) {
    common.cleanup(t, function (json) {
        sg1.kill()
        t.end()
    }, console.timeEnd(module.filename.slice(__filename.lastIndexOf(require('path').sep)+1, module.filename.length -3)));
});