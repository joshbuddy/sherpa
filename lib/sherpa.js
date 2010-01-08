Sherpa = {
  Router: function() {
    this.root = new Sherpa.Node(null, '/');
    this.routes = {};
  },
  Node: function(parent) {
    this.parent = parent;
    this.lookup = {};
    this.destination = undefined;
    this.value = undefined;
    this.shortcut = [];
  },
  Variable: function(name) {
    this.name = name;
  },
  Route: function(router, final_node) {
    this.router = router;
    this.final_node = final_node;
  }
} 

Sherpa.Router.prototype = {
  add: function(uri, options) {
    var split_uri = uri.split(/([\/\.])/);
    var node = this.root;
    for(var i in split_uri) {
      var part = split_uri[i];
      if (part != '') {
        var first_char = part.substring(0,1)
        if (first_char == ':') {
          var variable_name = part.substring(1);
          if (options && options.matches_with && options.matches_with[variable_name]) {
            node = node.add(options.matches_with[variable_name], new Sherpa.Variable(variable_name));
            node.value.matches_with = options.matches_with[variable_name];
            node.parent.shortcut.push([node.value.matches_with, node]);
          } else {
            node = node.add(null, new Sherpa.Variable(variable_name));
          }
        } else {
          node = node.add(part, part);
        }
      }
    }
    var route = new Sherpa.Route(this, node);
    return route;
  },
  recognize: function(uri) {
    var params = {};
    var position = 0;
    var split_uri = uri.split(/([\/\.])/);
    
    var node = this.root;
    while (uri.length > 0) {
      var position = split_uri.shift().length;
      var part = uri.substring(0, position);
      
      var param_name = undefined;
      var param_value = undefined;
      
      var matched = false;
      
      if (node.shortcut.length != 0) {
        for(var shortcut_index in node.shortcut) {
          if (match = uri.match(node.shortcut[shortcut_index][0])) {
            uri = uri.substring(match[0].length);
            node = node.shortcut[shortcut_index][1];
            if (node.value.name) {
              param_name = node.value.name;
              param_value = match[0];
            }
            matched = true;
            break;
          }
        }
      }
      
      if (!matched && part != '') {
        if (node.lookup[part] !== undefined) {
          node = node.lookup[part];
          uri = uri.substring(position);
          position = 0;
        } else if(node.lookup[null] !== undefined) {
          node = node.lookup[null];
          param_name = node.value.name;
          param_value = part;
          uri = uri.substring(position);
          position = 0;
        } else {
          node = undefined;
        }
      }
      if (node === undefined) {
        return undefined;
      }
      
      if (param_name) {
        params[param_name] = param_value;
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
      if (node.value.name !== undefined) {
        if (node.value.matches_with) {
          if (!params[node.value.name].match(node.value.matches_with)) {
            return undefined;
          } else {
            path_parts.push(params[node.value.name]);
          }
        } else {
          path_parts.push(params[node.value.name]);
        }
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

Sherpa.Route.prototype = {
  name: function(name) {
    this.router.routes[name] = this;
    return this;
  },
  to:   function(destination) {
    this.final_node.destination = destination;
    return this;
  }
}

Sherpa.Node.prototype = {
  add: function(part, value) {
    if (this.lookup[part] === undefined) {
      this.lookup[part] = new Sherpa.Node(this);
      this.lookup[part].value = value;
    }
    return this.lookup[part];
  }
};
