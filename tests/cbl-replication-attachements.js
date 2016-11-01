var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
  coax = require("coax"),
  async = require("async"),
  common = require("../tests/common"),
  util =  require("util"),
  conf_file = process.env.CONF_FILE || 'local',
  config = require('../config/' + conf_file),
  test = require("tap").test,
  test_time = process.env.TAP_TIMEOUT || 30000,
  test_conf = {timeout: test_time * 1000};

var server, sg, gateway,
 // local dbs
 dbs = ["cbl-replication-attach1"];
 // sg->local dbs
 sgdbs = ["cbl-replication-attach2"];

var numDocs = 5;

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
    sg  = _sg;
    gateway = sg.url;
    t.end();
  });
});

// create all dbs
test("create test databases", function(t){
    var alldbs = dbs.concat(sgdbs);
    common.createDBs(t, alldbs);
});


// setup push/pull replication to gateway
test("set push/pull replication to gateway", function(t){

  var i = 0;
  var gatewayDB = coax([gateway, config.DbBucket]).pax().toString();
  if (config.provides=="android") gatewayDB = gatewayDB.replace("localhost", "10.0.2.2");
  async.series([
    function(sgpush){

      async.mapSeries(dbs, function(db, cb){

        coax([server, "_replicate"]).post({
            source : db,
            target : gatewayDB,
            continuous : true,
          }, function(err, ok){
            t.equals(err, null,
              util.inspect({_replicate : db+" -> " + gatewayDB}));
            i++;
            cb(err, ok);
          });

      }, sgpush);
    },
    function(sgpull){

      async.mapSeries(sgdbs, function(db, cb){

        coax([server, "_replicate"]).post({
            source : gatewayDB,
            target : db,
            continuous : true,
          }, function(err, ok){

            t.equals(err, null,
              util.inspect({_replicate : db+" <- " + gatewayDB}));
            i++;
            cb(err, ok);
          });

      }, sgpull);
    }], function(err, json){
            t.false(err, "setup push pull replication to gateway");
            t.end();
    });

})

//size of attachment GGate_BIG.JPG 2,358,797 bytes
test("load databases", test_conf, function(t){
  common.createDBDocs(t, {numdocs : numDocs, dbs : dbs, docgen: 'inlinePngtBigAtt'});
})


test("delete db docs", test_conf, function(t){
  common.deleteDBDocs(t, dbs, numDocs);
})


// load databases
test("load databases", test_conf, function(t){
  common.createDBDocs(t, {numdocs : numDocs, dbs : dbs, docgen: 'inlinePngtBigAtt'});
})

// check dbs
test("verify local-replicated in dbs: 0", test_conf, function(t){
  common.verifyNumDocs(t, dbs, numDocs);
})

// purge all dbs
test("purge dbs", test_conf, function(t){
  common.purgeDBDocs(t, dbs, numDocs);
});

// check dbs
test("verify local-replicated in dbs: 0", test_conf, function(t){
  common.verifyNumDocs(t, dbs, 0);
})

test("cleanup cb bucket", test_conf, function(t){
    if (config.DbUrl.indexOf("http") > -1){
    coax.post([config.DbUrl + "/pools/default/buckets/" + config.DbBucket + "/controller/doFlush"],
	    {"auth":{"passwordCredentials":{"username":"Administrator", "password":"password"}}}, function (err, js){
	      t.false(err, "flush cb bucket");
	    },
	    setTimeout(function(){
		 t.end();
	            }, test_time * 2));
	}else{
	    t.end();
	};
})

// delete all dbs
test("delete test databases", function(t){
    common.deleteDBs(t, dbs.concat(sgdbs))
})

test("done", function(t){
  common.cleanup(t, function(json){
    sg.kill();
    t.end();
  }, console.timeEnd(module_name));
});