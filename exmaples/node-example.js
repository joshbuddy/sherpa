require('../lib/sherpa')

var sys = require("sys"), http = require("http");

http.createServer(new Sherpa.interfaces.NodeJs([
  ['/hello', function (request, response) {
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("Hello World\n");
    response.finish();
  }],
  ['/hello/:name', {matchesWith: {name: /^\d+$/}}, function (request, response) {
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("Hello Number "+request.sherpaResponse.params['name']+"\n");
    response.finish();
  }],
  ['/hello/:name', function (request, response) {
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("Hello "+request.sherpaResponse.params['name']+"\n");
    response.finish();
  }],
  ['/hello/:name', {conditions:{method: 'POST'}}, function (request, response) {
    response.sendHeader(200, {"Content-Type": "text/plain"});
    response.sendBody("Hello POSTY "+request.sherpaResponse.params['name']+"\n");
    response.finish();
  }],
  ['not found', function (request, response) {
    response.sendHeader(404, {"Content-Type": "text/plain"});
    response.sendBody("I can't find what you're looking for..");
    response.finish();
  }]
  
]).listener()).listen(8000);
sys.puts("Server running at http://127.0.0.1:8000/");


