require('../sherpa');

exports.Sherpa = Sherpa;

var url = require('url');

Sherpa.NodeJs = function (routes) {
  this.routes = routes;
};

Sherpa.NodeJs.prototype = {
  listener: function() {
    var router = new Sherpa.Router();
    var notFound = function(req, res) {
      res.writeHead(404, {});
      res.end();
    }

    for(var key in this.routes) {
      if (this.routes[key][0] == 'not found') {
        notFound = this.routes[key][1];
      } else {
        switch(this.routes[key].length) {
          case 2:
            router.add(this.routes[key][0]).to(this.routes[key][1]);
            break;
          case 3:
            router.add(this.routes[key][0]).withOptions(this.routes[key][1]).to(this.routes[key][2]);
            break;
          default:
            throw("must be 2 or 3");
        }
      }
    }

    return function(httpRequest, httpResponse) {
      var requestUrl = url.parse(httpRequest.url)
      var response = router.recognize(requestUrl.pathname, httpRequest);
      if (response) {
        httpRequest.sherpaResponse = response;
        response.destination(httpRequest, httpResponse);
      } else {
        notFound(httpRequest, httpResponse);
      }
    }

  }
}

