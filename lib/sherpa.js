var sys = require("sys")

Sherpa = function() {
  this.root = new Node(null, '/');
  this.routes = {};
};

Node = function(parent) {
  this.parent = parent;
  this.lookup = {};
  this.destination = undefined;
  this.value = undefined;
};

Variable = function(name) {
  this.name = name;
}

Route = function(router, final_node) {
  this.router = router;
  this.final_node = final_node;
}

Route.prototype = {
  name: function(name) {
    this.router.routes[name] = this;
  }
}

Node.prototype = {
  add: function(part, value) {
    if (this.lookup[part] === undefined) {
      this.lookup[part] = new Node(this);
      this.lookup[part].value = value;
    }
    return this.lookup[part];
  }
};

Sherpa.prototype = {
  add: function(route, destination) {
    sys.puts(route);
    var split_route = route.split(/([\/\.])/);
    var node = this.root;
    for(var i in split_route) {
      var part = split_route[i];
      if (part != '') {
        var first_char = part.substring(0,1)
        if (first_char == ':') {
          node = node.add(null, new Variable(part.substring(1)));
        } else {
          node = node.add(part, part);
        }
      }
    }
    node.destination = destination;
    return new Route(this, node);
  },
  recognize: function(uri) {
    var params = {};
    var parts = uri.split(/([\/\.])/);
    var node = this.root;
    for (var i in parts) {
      var part = parts[i];
      if (part != '') {
        if (node.lookup[part] !== undefined) {
          node = node.lookup[part];
        } else if(node.lookup[null] !== undefined) {
          node = node.lookup[null];
          params[node.value.name] = part;
        } else {
          node = undefined;
        }
      }
      if (node === undefined) {
        return undefined;
      }
    }
    
    if (node.destination === undefined) {
      return undefined;
    } else {
      return {'destination': node.destination, 'params': params};
    }
  },
  generate: function(name, params) {
    var path_parts = [];
    var route = this.routes[name];
    var node = route.final_node;
    
    while (node && node.value) {
      sys.debug("examining "+sys.inspect(node));
      if (node.value.name !== undefined) {
        path_parts.push(params[node.value.name]);
      } else {
        path_parts.push(node.value);
      }
      node = node.parent;
    }
    var path = '';
    for(var i in path_parts) {
      path += path_parts[path_parts.length - i - 1];
    }
    return path;
  }
};

var sherpa = new Sherpa();
sherpa.add('/test/:test2', 'testing').name('test')
sys.debug(sys.inspect(sherpa.root))

sys.debug(sys.inspect(sherpa.recognize('/test')))
sys.debug(sys.inspect(sherpa.recognize('/test/testing')))
sys.debug(sys.inspect(sherpa.generate('test', {'test2': 'variable'})))