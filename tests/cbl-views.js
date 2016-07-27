var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util = require("util"),
    eventEmitter = common.ee,
    docgens = common.generators,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000};
test = require("tap").test;

var server, db;

var module_name = '\r\n\r\n>>>>>>>>>>>>>>>>>>>' + module.filename.slice(__filename.lastIndexOf(require('path').sep)
        + 1, module.filename.length - 3) + '.js ' + new Date().toString()
console.time(module_name);
console.error(module_name)


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
test("start test client", test_conf, function (t) {
    var i = 1;
    (function loop() {
        common.launchClient(t, function (_server) {
            server = _server
            coax([server, "_session"], function (err, ok) {
                try {
                    if (ok.ok == true) {
                        t.end()
                    } else {
                        return new Error("LiteServ was not run?: " + ok)
                    }
                } catch (err) {
                    console.error(err, "will restart LiteServ..." + i++ + " times")
                    setTimeout(function () {
                        console.log(i)
                        if (i < 6) {
                            loop()
                        } else {
                            console.error("can't run LiteServ...")
                            t.end()
                        }
                    }, 9000)
                }
            })
        })
    }());
})

// create all dbs
test("create test database", function (t) {
    db = coax([server, 'cbl_views']);

    db(function (err, ok) {

        // always attempt to recreate db
        db.del(function () {
            db.put(function (err, ok) {
                t.false(err, "test db reachable");
                t.end();
            });
        });
    });
});

test("simple map function", function (t) {

    // ddoc spec
    var designDoc = {
        _id: "_design/test",
        views: {
            basic: {
                map: "function(doc) { if (doc._id && doc.foo) emit(doc._id, doc.foo) }",
            }
        }
    };

    // create 10 docs
    common.createDBDocs(t, {
        dbs: ["cbl_views"],
        docgen: 'foobar',
        numdocs: 10
    }, 'docs_created')

    eventEmitter.on('docs_created', function (err, json) {

        t.false(err, "docs_created");

        db.post(designDoc, function (e, js) {
            t.false(e, "can create design doc");
            var view = db(['_design', 'test', '_view', 'basic']);
            view(function (e, js) {
                t.equals(js.rows.length, 10);
                t.equals(js.rows[0].value, docgens.foobar().foo);
                t.end();
            });

        });

    });
});

test("total_rows attribute on view query result", function (t) {

    var view = db(['_design', 'test', '_view', 'basic']);
    // descending
    view({
        descending: true
    }, function (e, js) {
        t.equals(js.total_rows, 10, "descending total_rows");
    })

    // key
    view({
        key: "cbl_views_5"
    }, function (e, js) {
        t.equals(js.total_rows, 10, "key total_rows");
    })

    // keys
    view({
        keys: '["cbl_views_3", "cbl_views_4", "cbl_views_5"]',
    }, function (e, js) {
        t.equals(js.total_rows, 10, "keys total_rows");
    })

    // startkey
    view({
        startkey: "cbl_views_5"
    }, function (e, js) {
        t.equals(js.total_rows, 10, "startkey total_rows");
    })

    // endkey
    view({
        endkey: "cbl_views_5",
        inclusive_end: false
    }, function (e, js) {
        t.equals(js.total_rows, 10, "endkey total_rows");
    })

    // limit
    view({
        limit: "5"
    }, function (e, js) {
        t.equals(js.total_rows, 10, "limit total_rows");
    })

    // include_docs
    view({
        include_docs: true
    }, function (e, js) {
        t.equals(js.total_rows, 10, "include_docs total_rows");
    })

    // update_seq
    view({
        update_seq: true,
    }, function (e, js) {
        t.equals(js.total_rows, 10, "update_seq total_rows");
    })

    // mixed
    view({
        update_seq: true,
        include_docs: false,
        startkey: "cbl_views_5"
    }, function (e, js) {
        t.equals(js.total_rows, 10, "mixed total_rows");
        setTimeout(function () {
            t.end();
        }, 2000);
    });
});

test("test query filters", function (t) {

    var view = db(['_design', 'test', '_view', 'basic']);

    // descending
    view({
        descending: true
    }, function (e, js) {
        t.equals(e, null);
        var oks = js.rows.filter(function (row, i) {
            return (row.key == "cbl_views_" + (9 - i));
        })
        t.equals(oks.length, 10, "descending");
    })

    // key
    view({
        key: "cbl_views_5"
    }, function (e, js) {
        t.equals(js.rows[0].key, "cbl_views_5", "key");
    })

    // keys
    view({
        keys: '["cbl_views_3", "cbl_views_4", "cbl_views_5"]',
    }, function (e, js) {
        t.equals(js.rows[0].key, "cbl_views_3", "keys");
        t.equals(js.rows[1].key, "cbl_views_4", "keys");
        t.equals(js.rows[2].key, "cbl_views_5", "keys");
    })

    // startkey
    view({
        startkey: "cbl_views_5"
    }, function (e, js) {
        var oks = js.rows.filter(function (row, i) {
            return (row.key == "cbl_views_" + (i + 5));
        })
        t.equals(oks.length, 5, "startkey");
    })

    // endkey
    view({
        endkey: "cbl_views_5",
        inclusive_end: false
    }, function (e, js) {
        var oks = js.rows.filter(function (row, i) {
            return (row.key == "cbl_views_" + (i));
        })
        t.equals(oks.length, 5, "endkey");
    })

    // limit
    view({
        limit: "5"
    }, function (e, js) {
        var oks = js.rows.filter(function (row, i) {
            return (row.key == "cbl_views_" + (i));
        })
        t.equals(oks.length, 5, "limit");
    })

    // include_docs
    view({
        include_docs: true
    }, function (e, js) {
        var oks = js.rows.filter(function (row, i) {
            return (row.doc.foo == docgens.foobar().foo &&
            row.doc._id == "cbl_views_" + i);
        })
        t.equals(oks.length, 10, "include_docs");
    })

    // update_seq
    view({
        update_seq: true
    }, function (e, js) {
        t.equals(js.update_seq, 11, "update_seq:" + JSON.stringify(js));
    })

    // skip
    view({
        skip: "5"
    }, function (e, js) {
        if (!e) {
            var oks = js.rows.filter(function (row, i) {
                return (row.key == "cbl_views_" + (i + 5));
            })
            t.equals(oks.length, 5);
        } else {
            t.fail("skip: " + util.inspect(e));
        }
        setTimeout(function () {
            t.end();
        }, 5000);
    });

})

test("delete db docs", function (t) {
    common.deleteDBDocs(t, ["cbl_views"], 10);
})

test("create player docs", function (t) {
    common.createDBDocs(t, {
        dbs: ["cbl_views"],
        docgen: 'player',
        numdocs: 10
    });
})


test("update ddoc with player view", function (t) {

    var ddoc = db(['_design', 'test']);
    ddoc(function (err, js) {
        js.views['player'] = {
            map: "function(doc) { if(doc.joined) emit(doc.joined, doc.points) }",
            reduce: "function(keys, values, rereduce) { result = 0; for (i=0;i<values.length;i++) { result += values[i] }; return result  }"
        };
        db.post(js, function (e, js) {
            t.false(e, "can update design doc");
            t.end();
        });
    });

})

// https://github.com/couchbase/couchbase-lite-java-core/issues/880
// https://github.com/couchbase/couchbase-lite-java-core/issues/1312
test("test array keys", function (t) {

    var view = db(['_design', 'test', '_view', 'player']);
    view({
        startkey: [2013, 7, 2],
        reduce: false
    }, function (e, js) {
        if (typeof js.rows == 'undefined') {
            t.false(e, "view failed with startkey: [2013, 7, 2], reduce: false: " + JSON.stringify(e));
            t.fail("js.rows not found for view with startkey: [2013, 7, 2], reduce: false; " + js);
            t.end();
            return;
        } else {
            var oks = js.rows.filter(function (row, i) {
                return row.key[2] == (i + 2);
            })
            t.equals(oks.length, 8, "startkey array");
        }
    })

    // TODO these should be individual tests
    // view({ startkey : [2013, 7, 2], startkey_docid : "cbl_views_8", reduce : false},
    //   function(e, js){
    //     var oks = js.rows.filter(function(row, i){
    //       console.log(row)
    //       return row.key[2] == (i+4)
    //     })
    //     t.equals(oks.length, 8, "startkey array")
    // })


    view({
        group: true
    }, function (e, js) {
        if (typeof js.rows == 'undefined') {
            t.false(e, "view failed with { group : true}: " + JSON.stringify(e));
            t.fail("js.rows not found for view with { group : true}: " + js);
            t.end();
            return;
        } else {
            var oks = js.rows.filter(function (row, i) {
                return row.value == (i);
            })
            t.equals(oks.length, 10, "group true");
        }
    })

    view({
        group: true,
        group_level: 2
    }, function (e, js) {
        if (typeof js.rows == 'undefined') {
            t.false(e, "view failed with { group : true, group_level : 2}: " + JSON.stringify(e));
            t.fail("js.rows not found for view with { group : true, group_level : 2}: " + js);
            t.end();
            return;
        } else {
            t.equals(js.rows[0].key.length, 2, "group level=2 keys length");
            t.equals(js.rows[0].value, 45, "group_level=2 value");
        }
    })

    view({
        group: true,
        group_level: 1
    }, function (e, js) {
        if (typeof js.rows == 'undefined') {
            t.false(e, "view failed with { group : true, group_level : 1}: " + JSON.stringify(e));
            t.fail("js.rows not found for view with { group : true, group_level : 1}: " + js);
            t.end();
            return;
        } else {
            t.equals(js.rows[0].key.length, 1, "group level=1 keys length");
            t.equals(js.rows[0].value, 45, "group_level=1 value");
            t.end();
        }
    });
})

test("done", function (t) {
    common.cleanup(t, function (json) {
        t.end();
    }, console.timeEnd(module_name));
});