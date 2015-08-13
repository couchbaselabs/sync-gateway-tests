var launcher = require("../lib/launcher"),
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util =  require("util"),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000},
    cb_util = require("../tests/utils/cb_util");


test("start sync_gateway", function(t){
    common.launchSGWithConfigParams(t, undefined, undefined, 4984, "sync_gateway", null, function(_sg){
        sg  = _sg
        sg.kill()
        t.end()
    })
})

test("start sync_gateway", function(t){
    sgconfig = undefined
    common.launchSGWithConfigParams(t, sgconfig, ["-bucket", "db"], 4984, "db", null, function(_sg){
        sg  = _sg
        sg.kill()
        t.end()
    })
})


test("start sync_gateway", function(t){
    sgconfig = undefined
    common.launchSGWithConfigParams(t, sgconfig, ["-interface", ":22"], 22, "sync_gateway", "Failed to start HTTP server on :22: listen tcp :22: bind: permission denied", function(_sg){
        sg  = _sg
        sg.kill()
        t.end()
    })
})
