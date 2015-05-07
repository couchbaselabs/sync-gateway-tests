var launcher = require("../lib/launcher"),
  coax = require("coax"),
  async = require("async"),
  common = require("../tests/common"),
  util =  require("util"),
  conf_file = process.env.CONF_FILE || 'local',
  config = require('../config/' + conf_file),
  test = require("tap").test,
  test_time = process.env.TAP_TIMEOUT || 60,
  test_conf = {timeout: test_time * 1000};

var server, sg, gateway,
 // local dbs
 dbs = ["api-revision1"];

//var numDocs=parseInt(config.numDocs) || 10;
var numDocs= 100;
var timeoutReplication = 5000;
if (config.provides=="android" || config.DbUrl.indexOf("http") > -1) timeoutReplication = 500 * numDocs;



// start client endpoint
test("start test client", function(t){
  common.launchClient(t, function(_server){
    server = _server
    t.end()
  })
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
  common.createDBs(t, dbs)
})


// setup push replication to gateway
test("set push replication to gateway", function(t){

  var i = 0
  var gatewayDB = coax([gateway, config.DbBucket]).pax().toString()
  if (config.provides=="android") gatewayDB = gatewayDB.replace("localhost", "10.0.2.2")
  async.series([
    function(sgpush){

      async.mapSeries(dbs, function(db, cb){

        coax([server, "_replicate"]).post({
            source : db,
            target : gatewayDB,
            continuous : true,
          }, function(err, ok){
            t.equals(err, null,
              util.inspect({_replicate : db+" -> " + gatewayDB}))
            i++
            cb(err, ok)
          })

      }, sgpush)
    }], function(err, json){
      t.false(err, "setup push replication to gateway")
      t.end()
    })

})

test("load databases", test_conf, function(t){
  common.createDBDocs(t, {numdocs : numDocs, dbs : dbs})
})

test("verify replicated num-docs=" + numDocs, test_conf, function(t){
  common.verifySGNumDocs(t, [sg], numDocs)
})

test("doc update on SG", test_conf, function(t){
  // start updating docs
  common.updateSGDocs(t, {dbs : [sg],numrevs : 1})
})



test("doc update on liteServ", test_conf, function(t){
  // start updating docs
  //setInterval(common.updateDBDocs,5000,t,{dbs:dbs,numrevs:10,numdocs:numDocs})
  
  common.updateDBDocs(t, {dbs : dbs,
                          numrevs : 10,
                          numdocs : numDocs})


})


test("done", function(t){
  setTimeout(function() {
    common.cleanup(t, function(json){
      sg.kill()
      t.end()
    })  
  }, 240000)
  
  
})










