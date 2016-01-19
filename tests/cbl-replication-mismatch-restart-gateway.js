var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    common = require("../tests/common"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    cb_util = require("./utils/cb_util"),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000};

var numDocs=(parseInt(config.numDocs) || 100)*5;

var server, sg1
  // local dbs
 dbs = ["mismatch-restart-sg-one", "mismatch-restart-sg-two"];

var timeoutReplication=0;
if (config.DbUrl.indexOf("http") > -1){
	timeoutReplication=5000;
}

var module_name = '\r\n\r\n>>>>>>>>>>>>>>>>>>>' + module.filename.slice(__filename.lastIndexOf(require('path').sep)
        + 1, module.filename.length - 3) + '.js ' + new Date().toString()
console.time(module_name);
console.error(module_name)


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

// kill sync gateway
test("kill syncgateway", function (t) {
    common.kill_sg(t, function () {
        },
        setTimeout(function(){
            t.end();
        }, 2000))
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
  common.createDBDocs(t, {numdocs : numDocs/2, dbs : dbs, docgen : "channels"})
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
  common.verifyNumDocs(t, dbs, numDocs)
})

test("kill sg", function(t){
    for (var i = 0; i < dbs.length; i++) {
    dburl = coax([server, dbs[i]]).pax().toString()
    coax(dburl, function (err, json) {
        if (err) {
            t.fail("failed to get db info from " + dburl +":" + err)
        } else {
            count = json.doc_count
            console.log("doc count in " + dburl + ": " + count)
        }
    })
}
sg1.kill()
t.end()
})

// restart sync gateway
test("restart syncgateway", function(t){
  common.launchSGWithParams(t, 9888, config.DbUrl, config.DbBucket, function(_sg1){
    sg1  = _sg1
    t.end()
  })
})

test("reload databases after restart", test_conf, function(t){
    common.updateDBDocs(t, {dbs : [dbs[0]],
        numrevs : 5,
        numdocs : numDocs/2})
    t.end()

})

test("verify dbs have same number of docs", test_conf, function(t) {
  common.verifyNumDocs(t, dbs, numDocs)
  t.end()
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
                console.log(err, 'ignore ....')
            },
            setTimeout(function () {
                t.end();
            }, test_time * 2));
    } else {
        t.end();
    }
})

// delete all dbs
test("delete test databases", function(t){
    common.deleteDBs(t, dbs)
    t.end()
})

test("done", function(t){
  common.cleanup(t, function(json){
    sg1.kill()
    t.end()
  }, console.timeEnd(module_name));
});