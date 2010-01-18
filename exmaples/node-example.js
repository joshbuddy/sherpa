require('../lib/sherpa')

var sys = require("sys"), http = require("http");

http.createServer(new Sherpa.interfaces.NodeJs({
  '/hello': {to: function (request, response) {
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("Hello World\n");
    response.finish();
  }},
  '/hello/:name': {to: function (request, response) {
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("Hello "+request.sherpaResponse.params['name']+"\n");
    response.finish();
  }},
  'not found': {to: function (request, response) {
    response.sendHeader(404, {"Content-Type": "text/plain"});
    response.sendBody("I can't find what you're looking for..");
    response.finish();
  }}
  
}).listener()).listen(8000);
sys.puts("Server running at http://127.0.0.1:8000/");


