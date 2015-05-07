var http = require('http');
var qs = require('querystring')

var count = 0

http.createServer(function (req, res) {

        var body = ''
        req.on('data',function(data) {
                body += data;
        })

        req.on('end',function() {
                var post = qs.parse(body)

                console.log(post)
                count++
                console.log(count)
        })

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('hello!');
}).listen(9091, 'localhost');



console.log('Server running at http://localhost:9091/');

