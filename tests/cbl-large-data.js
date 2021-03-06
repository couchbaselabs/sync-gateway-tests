var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    common = require("../tests/common"),
    ee = common.ee,
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {
        timeout: test_time * 1000
    };

var server, sg, gateway,
    // local dbs
    dbs = ["bigtable"];

var numDocs = parseInt(config.numDocs) || 100;

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
    var i=1;
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
                    console.error(err, "will restart LiteServ..." + i++ +" times")
                    setTimeout(function () {
                        console.log(i)
                        if (i<6) {
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
test("create test databases", function (t) {
    common.createDBs(t, dbs);
});

test("load databases with large JSON ~4MB", test_conf, function (t) {
    common.createDBDocs(t, {
        numdocs: numDocs,
        dbs: dbs,
        docgen: 'inlineTextLargeJSON'
    }, 'emits-created');

    ee.once('emits-created', function (e, js) {
        t.false(e, "created basic local docs with large JSON ~4MB");

        // get doc
        coax([server, dbs[0], dbs[0] + "_0"], function (e, js) {

            if (e) {
                console.log(e);
                t.fail("unable to retrieve doc with large json: " + dbs[0] + "/" + dbs[0] + "_0");
                t.end()
            } else {

                var docid = js._id;
                coax([server, dbs[0], docid, {
                    attachments: true,
                }], function (e, js) {

                    if (e) {
                        console.log(e);
                        t.fail("read doc with large json data");
                    }

                    var docdata = js.jsooooon;
                    if (docdata == undefined) {
                        t.fail("unable to get large json data from doc")
                        t.end();
                    } else {
                        t.equals(docdata.length, 4000000 - 1);
                        t.equals(docdata, (new Array(4000000)).join("x"));
                        t.end();
                    }
                });
            }
        });

    });
});

// delete all dbs
test("delete test databases", function(t){
    common.deleteDBs(t, dbs)
})

test("done", function (t) {
    common.cleanup(t, function (json) {
        t.end();
    }, console.timeEnd(module_name));
});