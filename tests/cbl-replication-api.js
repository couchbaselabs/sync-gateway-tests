var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util = require("util"),
    cb_util = require("./utils/cb_util"),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000};

var server, sg, gateway,
  // local dbs
 dbs = ["api-test-once-push"],
 pulldbs = ["api-test-once-pull"];

var numDocs=parseInt(config.numDocs) || 100;
var timeoutReplication = 5000;
if (config.provides=="android" || config.DbUrl.indexOf("http") > -1) timeoutReplication = 300 * numDocs;

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
test("start test client", function (t) {
    common.launchClient(t, function (_server) {
        server = _server
        coax([server, "_session"], function (err, ok) {
            try {
                console.error(ok)
                t.equals(ok.ok, true, "api exists")
                if (ok.ok == true) {
                    t.end()
                }
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
test("start syncgateway", function(t){
  common.launchSG(t, function(_sg){
    sg  = _sg
    gateway = sg.url
    t.end()
  })
})

// create all dbs
test("create test databases", function(t){
  common.createDBs(t, dbs.concat(pulldbs))
})

test("load databases", function(t){
  common.createDBDocs(t, {numdocs : numDocs, dbs : dbs})
})

test("push replication should close connection on completion", test_conf, function(t) {
  var sgdb = sg.db.pax().toString();
  if (config.provides=="android") sgdb = sgdb.replace("localhost", "10.0.2.2");
  var lite = dbs[0];
  console.log(coax([server, "_replicate"]).pax().toString(), "source:", lite, ">>  target:", sgdb);
  coax.post([server, "_replicate"], {
    source : lite,
    target : sgdb
  }, function(err, info) {
	  setTimeout(function () {
		  t.false(err, "replication created");
		  console.log("info", info);
		  sgdb = sg.db.pax().toString()
		  coax([sgdb, "_all_docs"],function(err, allDocs){
			  t.false(err, "sg database exists");
			  t.ok(allDocs, "got _all_docs response");
			  console.log("sg doc_count", coax([sgdb, "_all_docs"]).pax().toString(), allDocs.total_rows);
			  t.equals(allDocs.total_rows, numDocs, "all docs replicated");
			  //t.equals(allDocs.update_seq, numDocs + 1, "update_seq correct")
			  t.end();
		  });
	  }, timeoutReplication);
  });
});

test("pull replication should close connection on completion", test_conf, function(t) {
  var sgdb = sg.db.pax().toString()
  if (config.provides=="android") sgdb = sgdb.replace("localhost", "10.0.2.2")
  var lite = pulldbs[0]
  console.log(coax([server, "_replicate"]).pax().toString(), "source:", sgdb, ">>  target:", lite)
  coax.post([server, "_replicate"], {
    source : sgdb,
    target : lite
  }, function(err, info) {
    t.false(err, "replication created")
    setTimeout(function () {
    coax([server, lite], function(err, dbinfo){
      t.false(err, "lite database exists")
      t.ok(dbinfo, "got an info response")
      console.log("lite dbinfo ", coax([server, lite]).pax().toString(), dbinfo)
      t.equals(dbinfo.doc_count, numDocs, "all docs replicated")
      t.end()
    })
    }, timeoutReplication)
  })
})

test("cleanup cb bucket", test_conf, function(t){
    if (config.DbUrl.indexOf("http") > -1){
    coax.post([config.DbUrl + "/pools/default/buckets/" + config.DbBucket + "/controller/doFlush"],
	    {"auth":{"passwordCredentials":{"username":"Administrator", "password":"password"}}}, function (err, js){
	      t.false(err, "flush cb bucket")
	    },
	    setTimeout(function(){
		 t.end();
	            }, test_time * 2));
	}else{
	    t.end();
	}
})

// delete all dbs
test("delete test databases", function(t){
  common.deleteDBs(t, dbs.concat(pulldbs))
})

test("done", function(t){
  common.cleanup(t, function(json){
    sg.kill()
    t.end()
  }, console.timeEnd(module_name));
});
