var http = require("http")

var common = module.exports = {

	http_get_api : function(t, options, expectedStatus, callback) {
		var request = http.get(options, function(response) {
			var body = '';

			response.on('data', function(chunk) {
				body += chunk;
			})

			response.on('error', function(e) {
				logger.error("Got error: " + e.message);
				t.fail("ERROR ");
			})

			response.on('end', function() {
				logger.info(response.statusCode + " from http://"
						+ options.host + ":" + options.port + "/"
						+ options.path);
				if (response.statusCode == '200'
						|| response.statusCode == '201') {
					t.equals(response.statusCode, expectedStatus,
							"wrong response status code " + response.statusCode
									+ ". Expected: " + expectedStatus);
					try {
						body = JSON.parse(body);
					} catch (err) {
						logger.info("not json format of response body");
					}
					callback(body);
				} else {
					if (response.statusCode == expectedStatus.toString()) {
						console.log("got expected status: ", expectedStatus);
						try {
							body = JSON.parse(body);
						} catch (err) {
							logger.info("not json format of response body");
						}
						callback(body);
					} else {
						t.fail("wrong response status code "
								+ response.statusCode + ". Expected: "
								+ expectedStatus + "; from http://"
								+ options.host + ":" + options.port + "/"
								+ options.path + " for :"
								+ JSON.stringify(options));
					}
					t.end();
				}
				;

			});
		});
	},

	http_post_api : function(t, post_data, options, expectedStatus, callback) {
		var body = '';
		var req = http.request(options, function(response) {

			response.setEncoding('utf8');

			response.on('data', function(chunk) {
				console.log(chunk);
				body += chunk;
				callback(body);
			})

			response.on('error', function(e) {
				logger.error("Got error: " + e.message);
				t.fail("ERROR ");
				t.end();
			})

			response.on('end', function() {
				logger.info(response.statusCode + " from http://"
						+ options.host + ":" + options.port + options.path);

				if (response.statusCode == '200'
						|| response.statusCode == '201'
						|| response.statusCode == '202') {
					if (expectedStatus !== "OK") {
						t.equals(response.statusCode, expectedStatus,
								"response status code " + options.path + ": "
										+ response.statusCode + ". Expected: "
										+ expectedStatus);
					}
					try {
						body = JSON.parse(body);
					} catch (err) {
						logger.warn("not json format:" + body);
					}
					logger.info(callback);
					callback(body);
					t.end();
				} else {
					if (response.statusCode == expectedStatus.toString()) {
						console.log("got expected status " + options.path
								+ ": ", expectedStatus);
						try {
							body = JSON.stringify(JSON.parse(body));
						} catch (err) {
							logger.info("not json format of response body",
									options.path, body);
						}
						callback(body);
					} else {
						t.fail("wrong response status code "
								+ response.statusCode + " from http://"
								+ options.host + ":" + options.port
								+ options.path + " for :"
								+ JSON.stringify(options) + " with data: "
								+ post_data);

						callback(body);
					}
					t.end();
				}
				;
			});
		});
		logger.info(post_data);
		req.write(post_data);
		req.end();
	},

}