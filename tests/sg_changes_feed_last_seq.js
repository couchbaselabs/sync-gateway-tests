var launcher = require("../lib/launcher"),
    coax = require("coax"),
    common = require("../tests/common"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 2500};


var serve, port = 8888, server = "http://localhost:" + port + "/"
var admin_server = "http://localhost:" + (port + 1) + "/"

// kill sync gateway
test("kill syncgateway", function (t) {
    common.kill_sg(t, function () {
        t.end()
    })
})

test("can launch a Sync Gateway", function (t) {
    serve = launcher.launchSyncGateway({
        port: port,
        dir: __dirname + "/../tmp/sg",
        path: config.SyncGatewayPath,
        configPath: config.SyncGatewayAdminParty
    })
    serve.once("ready", function (err) {
        t.false(err, "no error, Sync Gateway running on our port")
        coax(server, function (err, ok) {
            t.false(err, "no error, Sync Gateway reachable")
            t.end()
        })
    });
});

test("can get db info", function (t) {
    coax([server, config.DbBucket]).get(function (err, ok) {
        t.ok(ok, "created database")
        t.equals(ok.db_name, config.DbBucket, "correct name")
        t.end()
    })
})

test("can write and read", function (t) {
    var doc = coax([server, config.DbBucket, "docid"])
    console.log(doc.pax.toString())
    doc.put({"ok": true}, function (err, ok) {
        console.log(err, ok)
        t.false(err, "saved")
        t.equals(ok.id, "docid")
        doc.get(function (err, ok) {
            t.false(err, "loaded")
            t.end()
        })
    })
})

test("can write and read in admin server", function (t) {
    var doc = coax([admin_server, config.DbBucket, "admin_docid"])
    console.log(doc.pax.toString())
    doc.put({"ok": true}, function (err, ok) {
        console.log(err, ok)
        t.false(err, "saved")
        t.equals(ok.id, "admin_docid")
        doc.get(function (err, ok) {
            t.false(err, "loaded")
            t.end()
        })
    })
})

test("longpoll feed since_int", test_conf, function (t) {
    var docInterval, db = coax([server, config.DbBucket])
    db.get(["_changes", {feed: "longpoll"}], function (err, changes) {
        t.false(err, "got changes")
        t.ok(changes.results, "results array")
        setTimeout(function () {
            db.get(["_changes", {feed: "longpoll", since: changes.last_seq}], function (err, newchanges) {
                t.false(err, "got changes")
                t.ok(newchanges.results, "results array")
                console.log("last_seq", newchanges.last_seq)
                setTimeout(function () {
                    db.get(["_changes", {feed: "longpoll", since: newchanges.last_seq}], function (err, newchanges2) {
                        t.false(err, "got changes")
                        t.ok(newchanges2.results, "results array")
                        console.log("last_seq", newchanges2.last_seq)
                        if (docInterval) {
                            clearInterval(docInterval)
                        }
                        t.end()
                    })
                }, 500)
            })
        }, 1000)
    })
    var docidCount = 0;
    docInterval = setInterval(function () {
        for (var i = 10 - 1; i >= 0; i--) {
            db.put("newchange_int_" + docidCount, {"ok": true}, function (err, ok) {
                t.false(err, "put doc")
                // t.ok(ok.id, "newchange"+docidCount)
            });
            docidCount++
        }
    }, 300)
})

test("longpoll feed since_string", test_conf, function (t) {
    var docInterval, db = coax([server, config.DbBucket])
    db.get(["_changes", {feed: "longpoll"}], function (err, changes) {
        t.false(err, "got changes");
        t.ok(changes.results, "results array");
        setTimeout(function () {
            db.get(["_changes", {feed: "longpoll", since: "" + changes.last_seq}], function (err, newchanges) {
                t.false(err, "got changes")
                t.ok(newchanges.results, "results array")
                console.log("last_seq", newchanges.last_seq)
                setTimeout(function () {
                    db.get(["_changes", {
                        feed: "longpoll",
                        since: "" + newchanges.last_seq
                    }], function (err, newchanges2) {
                        t.false(err, "got changes")
                        t.ok(newchanges2.results, "results array")
                        console.log("last_seq", newchanges2.last_seq)
                        if (docInterval) {
                            clearInterval(docInterval)
                        }
                        t.end()
                    })
                }, 500)
            })
        }, 500)
    })
    var docidCount = 0;
    docInterval = setInterval(function () {
        for (var i = 10 - 1; i >= 0; i--) {
            db.put("newchange_str_" + docidCount, {"ok": true}, function (err, ok) {
                t.false(err, "put doc")
                // t.ok(ok.id, "newchange"+docidCount)
            });
            docidCount++
        }
    }, 300)
})


test("longpoll feed since_ramge", function (t) {
    var docInterval, db = coax([server, config.DbBucket])
    setTimeout(function () {
        db.get(["_changes", {}], function (err, changes) {
            t.false(err, "got changes")
            t.ok(changes.results, "results array")
            var temp = "\"" + changes.last_seq + "::" + (parseInt(changes.last_seq) + 10) + "\"";
            db.get(["_changes", {since: temp}], function (err, newchanges) {
                t.false(err, "got changes")
                t.ok(newchanges.results, "results array")
                console.log("last_seq", newchanges.last_seq)
                setTimeout(function () {
                    var tmp = "\"" + (parseInt(changes.last_seq) + 10) + "::" + (parseInt(newchanges.last_seq) + 50) + "\"";
                    db.get(["_changes", {since: tmp}], function (err, newchanges2) {
                        setTimeout(function () {
                            t.false(err, "got changes " + err)
                            t.ok(newchanges2.results, "results array")
                            console.log("last_seq", newchanges2.last_seq)
                            if (docInterval) {
                                clearInterval(docInterval)
                            }
                            t.end()
                        }, 500)
                    })
                }, 600)
            })
        })
    }, 900)
    var docidCount = 0;
    docInterval = setInterval(function () {
        for (var i = 10 - 1; i >= 0; i--) {
            db.put("newchange_range_" + docidCount, {"ok": true}, function (err, ok) {
                t.false(err, "put doc")
                // t.ok(ok.id, "newchange"+docidCount)
            });
            docidCount++
        }
    }, 100)
})

//TODO add new tests for https://github.com/couchbase/sync_gateway/issues/1088

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
                t.end()
            }, test_time * 2))
    } else {
        t.end()
    }
})

test("exit", function (t) {
    serve.kill()
    t.end()
})
