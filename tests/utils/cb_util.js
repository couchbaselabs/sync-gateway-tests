var http = require("http"), coax = require("coax"), async = require("async"), tstart = process
		.hrtime(), follow = require("follow"), events = require('events'), util = require("util"), fs = require('fs'), logger = require("../../lib/log"), listener = require('../../lib/listener'), conf_file = process.env.CONF_FILE
		|| 'local', config = require('../../config/' + conf_file), common = require("../common");

var cb_util = module.exports = {

	createBucket : function(t, appBucket) {
		var options = {
			host : "localhost",
			port : 8091,
			path : '/pools/default/buckets',
			method : 'POST',
			auth : "Administrator:password",
			headers : {
				'Content-Type' : 'application/x-www-form-urlencoded',
			}
		};
		var post_data = "name="
				+ appBucket
				+ "&parallelDBAndViewCompaction=false&autoCompactionDefined=false&threadsNumber=3&replicaIndex=0&replicaNumber=1&saslPassword=&authType=sasl&ramQuotaMB=200&bucketType=membase&flushEnabled=1";

		common.http_post_api(t, post_data, options, "OK", function(callback) {
		})
	},

	deleteBucket : function(t, bucket) {
		var post_data = 'STR';
		var options = {
			host : "localhost",
			port : 8091,
			path : "/pools/default/buckets/" + bucket,
			auth : "Administrator:password",
			method : 'DELETE',
			headers : {
				'Content-Type' : 'text/html'
			}
		};
		// console.log(options);
		common.http_post_api(t, post_data, options, undefined, function(callback) {
		});
	},

}