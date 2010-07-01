require('../lib/sherpa/nodejs')

var sys = require("sys"), http = require("http");

http.createServer(new Sherpa.NodeJs([
  ['/hello', function (request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello World\n");
    response.close();
  }],
  ['/hello/:name', {matchesWith: {name: /\d+/}}, function (request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello Number "+request.sherpaResponse.params['name']+"\n");
    response.close();
  }],
  ['/hello/:name', function (request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello "+request.sherpaResponse.params['name']+"\n");
    response.close();
  }],
  ['/hello/:name', {conditions:{method: 'POST'}}, function (request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello POSTY "+request.sherpaResponse.params['name']+"\n");
    response.close();
  }],
  ['not found', function (request, response) {
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("I can't find what you're looking for..");
    response.close();
  }]

]).listener()).listen(8000);
sys.puts("Server running at http://127.0.0.1:8000/");


