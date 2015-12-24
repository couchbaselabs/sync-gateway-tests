var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn
    common = require("../tests/common"),
    conf_file = process.env.CONF_FILE || 'local',
    cb_util = require("./utils/cb_util"),
    config = require('../config/' + conf_file),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000};


test("delete buckets", test_conf, function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        cb_util.deleteBucket(t, config.DbBucket,
            setTimeout(function () {
                t.end()
            }, 40000));
    } else {
        t.end();
    }
});

test("kill LiteServ on android", test_conf, function (t) {
    if (config.provides == "android") {
        spawn('adb', ["shell", "am", "force-stop", "com.couchbase.liteservandroid"]);
        setTimeout(function(){
            t.end();
        }, 4000)
    } else {
        t.end();
    }
});

test("create buckets", test_conf, function (t) {
    if (config.DbUrl.indexOf("http") > -1) {
        cb_util.createBucket(t, config.DbBucket, setTimeout(function () {
            t.end();
        }, 40000));
    } else {
        t.end();
    }
});