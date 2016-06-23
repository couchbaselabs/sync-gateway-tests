var spawn = require('child_process').spawn,
  fork = require('child_process').fork,
  conf_file = process.env.CONF_FILE || 'local',
  config = require('../config/' + conf_file);

exports.launchSyncGateway = function(opts){

  db = "walrus:"
  bucket = "db"

  if ('db' in opts)
    db = opts.db

  if ('bucket' in opts)
    bucket = opts.bucket

  var argv = [
    "-interface", ":"+opts.port,
    "-adminInterface", ":"+(opts.port + 1),
    "-url", db,
    "-bucket", bucket,
  ]
  if (opts.configPath)
    argv.push(opts.configPath)

  console.log("running", opts.path, argv)

  var sg = spawn(opts.path, argv);
  sg.stdout.pipe(process.stdout)
  sg.stderr.pipe(process.stderr)

  sg.stderr.on("data",function(data) {
      if (data.toString().indexOf("Starting server on :" + opts.port) !== -1) {
          setTimeout(function () {
              sg.emit("ready")
          }, (function () {
              return 1000;
          })())
      }
      console.log("" + data);
  })

  sg.on("error", function(err){
    console.log("error from sync_gateway spawn", opts.path, argv, err)
  })

  sg.url = "http://localhost:"+opts.port+"/"

  process.on("exit", function(){
    sg.kill()
  })
  return sg;
}

exports.launchSyncGatewayWithConfig = function(opts) {
    var argv = []
    argv.push(opts.configPath)

    console.log("running", opts.path, argv)

    var sg = spawn(opts.path, argv);
    sg.stdout.pipe(process.stdout)
    sg.stderr.pipe(process.stderr)

    sg.stderr.on("data", function(data) {
        if (data.toString().indexOf("Starting server on :" + opts.port) !== -1) {
            setTimeout(function() {
                sg.emit("ready")
            }, (function() {
                return 3000;
            })())
        }
        console.log("" + data);
    });

    sg.on("error", function(err) {
        console.log("error from sync_gateway spawn", opts.path, argv, err)
    });

    sg.url = "http://localhost:" + opts.port + "/"

    process.on("exit", function() {
        sg.kill()
    })
    return sg;
}

exports.launchSyncGatewayCommon = function(path, config, params, sg_port, exp_err){

    console.log("running", path, config, params)

    if (config === undefined) {
        if(params === undefined ){
            var sg = spawn(path);
        } else{
            var sg = spawn(path, params);
        }
    } else {
        if(params === undefined ){
            var sg = spawn(path, [config]);
        } else{
            var sg = spawn(path, [config], params);
        }
    }

    sg.stdout.pipe(process.stdout)
    sg.stderr.pipe(process.stderr)

    sg.stderr.on("data",function(data) {
        if(exp_err!==null && exp_err!==undefined && data.toString().indexOf(exp_err)!== -1){
            return null;
        } else
        if ((data.toString().indexOf("Starting server on :" + sg_port) !== -1) ||
            (data.toString().indexOf("Starting server on localhost:" + sg_port) !== -1)) {
            setTimeout(function () {
                sg.emit("ready")
            }, (function () {
                return 1000;
            })())
        }
        console.log("" + data);
    })

    sg.on("error", function(err){
        console.log("error from sync_gateway spawn", path, config, params, err)
    })

    sg.url = "http://localhost:"+sg_port+"/"

    process.on("exit", function(){
        sg.kill()
    })
    return sg;
}


exports.launchLiteServ = function(opts) {
	var argv = [ "--port", opts.port ];

	if (opts.dir) {
		argv.push("--dir")
		argv.push(opts.dir)
	}

  if (config.storageEngine) {
    argv.push("--storage")
    argv.push(config.storageEngine)
    console.log("Using storage type: " + config.storageEngine)
  }

	if (config.provides == "android") {

    if (config.provides == "android") {
      var liteserv = spawn("./../start_liteserv_android.sh", [opts.port]);
    }

	} else {
    argv.push("-Log");
    argv.push("YES");
    argv.push("-LogSync");
    argv.push("YES");
    argv.push("-LogCBLRouter");
    argv.push("YES");
    argv.push("-LogRemoteRequest");
    argv.push("YES");

		var liteserv = spawn(opts.path, argv)
	}

	liteserv.stderr.on("data", function(data) {
		// on Mac
		if ((data.toString().indexOf("is listening on port " + opts.port) !== -1)
			|| (data.toString().indexOf("is listening at ") != -1)) {
			liteserv.emit("ready")
			}
        console.error("" + data);
		})

	liteserv.stdout.on("data", function(data) {
		// on Android
		if (data.toString().indexOf("has extras") != -1) {
			console.error("LiteServAndroid launched on " + opts.port)
			setTimeout(function() {
				liteserv.emit("ready")
			}, (function() {
				return process.env.SLEEP_AFTER_LAUNCH || 8000;
			})())
		}
		console.error("" + data);
	})

	process.on("exit", function() {
		if (config.provides == "android") {
			spawn('adb', [ "shell", "am", "force-stop", "com.couchbase.liteservandroid" ]);
		} else {
			liteserv.kill()
		}

	})

	liteserv.url = "http://localhost:" + opts.port
	process.setMaxListeners(2000)

	return liteserv;
}

exports.launchEmbeddedClient = function(opts){

  var port = opts.port

  var pdb = fork("lib/pouch.js", [port])

  pdb.on('message', function(data) {
    console.log(data)
    pdb.emit("ready")
  });

  pdb.kill = function(){
    process.kill(pdb.pid)
  }
  return pdb;

}