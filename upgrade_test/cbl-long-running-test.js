var launcher = require("../lib/launcher"),
  coax = require("coax"),
  async = require("async"),
  common = require("../tests/common"),
  util =  require("util"),
  conf_file = process.env.CONF_FILE || 'local',
  config = require('../config/' + conf_file),
  test = require("tap").test,
  test_time = process.env.TAP_TIMEOUT || 3600,
  test_conf = {autoend: true,timeout: test_time * 1000};

var server, sg, gateway,
 // local dbs
 dbs = ["local_db"];

var numDocs = 100;
var numRevs = 1;
var timeoutReplication = 50000;
var timer = 0;



console.time(module.filename.slice(__filename.lastIndexOf(require('path').sep)+1, module.filename.length -3));

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

// 1 minute, count = 12
// 10 minutes,count = 120
var count = 150;
test("doc update on liteServ", test_conf, function(t){
  // each iteration generates one timer of 5 secs
  // Need to run a total duration of 30 mins
  // Total iterations = 30 * 60 / 5 = 360 

  for (var i = 0; i < count ; i++) {
    setTimeout(function(){
        common.updateDBDocs(t, {dbs : dbs, numrevs : numRevs, numdocs : numDocs}); 
        console.log("i'm done",timer);
      }, timer);

    console.log("timer value=",timer)
    timer = timer + 5000;
  }
  console.log("completed doc updates!")

})

// count * numRevs + 1
test("verify doc revisions", test_conf, function (t) {
    timeObject = setTimeout(function(){ 
      common.verifyDocsRevisions(t, dbs, numDocs, (count * numRevs) + 1 + "-") },timer+1000);
})

test("done",test_conf, function(t){
  setTimeout(function(){ 
    
    common.cleanup(t, function(json){
      sg.kill()
      t.end()}, console.timeEnd(module.filename.slice(__filename.lastIndexOf(require('path').sep)+1, module.filename.length -3))); },timer+5000) }
  );




