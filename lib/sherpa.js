RegExp.escape = function(text) {
  if (!arguments.callee.sRE) {
    var specials = [
      '/', '.', '*', '+', '?', '|',
      '(', ')', '[', ']', '{', '}', '\\'
    ];
    arguments.callee.sRE = new RegExp(
      '(\\' + specials.join('|\\') + ')', 'g'
    );
  }
  return text.replace(arguments.callee.sRE, '\\$1');
}

Sherpa = {
  SplitRegex: /\//,
  Router: function(options) {
    this.routes = {};
    this.root = new Sherpa.Node();
    this.requestKeys = options && options['requestKeys'] || ['method'];
  },
  Path: function(route, uri) {
    this.route = route;
    var sys = require('sys');

    sys.debug(sys.inspect(uri));
    
    var regex = /(\/|:[a-zA-Z0-9_]+|(?:\\:|[^:\/]+)*)/;
    var splitUri = uri.split(regex);

    this.compiledUri = [];
    
    for (var splitUriIdx = 0; splitUriIdx != splitUri.length; splitUriIdx++) {
      if (splitUri[splitUriIdx].substring(0, 1) == ':') {
        this.compiledUri.push("params['" + splitUri[splitUriIdx].substring(1) + "']");
      } else {
        this.compiledUri.push("'" + splitUri[splitUriIdx] + "'");
      }
    }
    
    this.compiledUri = this.compiledUri.join('+');
    
    this.groups = [];
    
    for (var splitIndex = 0; splitIndex < splitUri.length; splitIndex++) {
      var part = splitUri[splitIndex];
      if (part == '/') {
        sys.debug('adding new group');
        this.groups.push([]);
      } else if (part != '') {
        sys.debug('pushing to last group');
        this.groups[this.groups.length - 1].push(part);
      }
    }
  },
  Route: function(router, uri) {
    var sys = require('sys');
    this.router = router;
    this.requestConditions = {};
    this.matchingConditions = {};
    this.variableNames = [];
    var paths = [""];
    var chars = uri.split('');
    
    var startIndex = 0;
    var endIndex = 1;
    
    for (var charIndex in chars) {
      var c = chars[charIndex];
      if (c == '(') {
        // over current working set, double paths
        for (var pathIndex = startIndex; pathIndex != endIndex; pathIndex++) {
          paths.push(paths[pathIndex]);
        }
        // move working set to newly copied paths
        startIndex = endIndex;
        endIndex = paths.length;
      } else if (c == ')') {
        // expand working set scope
        startIndex -= (endIndex - startIndex);
      } else {
        for (var i = startIndex; i != endIndex; i++) {
          paths[i] += c;
        }
      }
    }
    
    this.partial = false;
    this.paths = [];
    for (var pathsIdx = 0; pathsIdx != paths.length; pathsIdx++) {
      sys.debug("ADDING PATH "+paths[pathsIdx]);
      this.paths.push(new Sherpa.Path(this, paths[pathsIdx]));
    }
  },
  Node: function() {
    this.reset();
  },
  Response: function(path, params) {
    var sys = require('sys');

    sys.debug("path --> "+sys.inspect(path));
    
    this.path = path
    this.route = path.route;
    this.paramsArray = params;
    this.destination = this.route.destination;
    this.params = {};
    for (var varIdx = 0; varIdx != this.path.variableNames.length; varIdx++) {
      this.params[this.path.variableNames[varIdx]] = this.paramsArray[varIdx];
    }
  }
};

Sherpa.Node.prototype = {
  reset: function() {
    this.linear = [];
    this.lookup = {};
    this.catchall = null;
  },
  dup: function() {
    var newNode = new Sherpa.Node();
    for(var idx = 0; idx != this.linear.length; idx++) {
      newNode.linear.push(this.linear[idx]);
    }
    for(var key in this.lookup) {
      newNode.lookup[key] = this.lookup[key];
    }
    newNode.catchall = this.catchall;
    return newNode;
  },
  addLinear: function(regex, count) {
    var newNode = new Sherpa.Node();
    this.linear.push([regex, count, newNode]);
    return newNode;
  },
  addCatchall: function() {
    if (!this.catchall) {
      this.catchall = new Sherpa.Node();
    }
    return this.catchall;
  },
  addLookup: function(part) {
    if (!this.lookup[part]) {
      this.lookup[part] = new Sherpa.Node();
    }
    return this.lookup[part];
  },
  addRequestNode: function() {
    if (!this.requestNode) {
      this.requestNode = new Sherpa.Node();
      this.requestNode.requestMethod = null;
    }
    return this.requestNode;
  },
  find: function(parts, request, params) {
    var sys = require('sys');
    sys.debug("find on parts: " + sys.inspect(parts) + " with params: "+sys.inspect(params)+" partial?"+(this.destination && this.destination.route.partial));
    if (this.requestNode || this.destination && this.destination.route.partial) {
      sys.debug("potential partial match");
      var target = this;
      if (target.requestNode) {
        sys.debug("partial match has a request node");
        target = target.requestNode.findRequest(request);
      }
      sys.debug("finally testing the destination");
      if (target && target.destination && target.destination.route.partial) {
        sys.debug("yup, we have one");
        return new Sherpa.Response(target.destination, params);
      } else {
        sys.debug("nope, movign on");
      }
    }
    if (parts.length == 0) {
      var target = this;
      if (this.requestNode) {
        sys.debug("there is a request node here..");
        target = this.requestNode.findRequest(request);
      }
      if (target) sys.debug("destination?: " + sys.inspect(target.destination));
      return target && target.destination ? new Sherpa.Response(target.destination, params) : undefined;
    } else {
      if (this.linear.length != 0) {
        var wholePath = parts.join('/');
        for (var linearIdx = 0; linearIdx != this.linear.length; linearIdx++) {
          var lin = this.linear[linearIdx];
          var match = lin[0].exec(wholePath);
          sys.debug("matched:"+sys.inspect(match));
          if (match) {
            matchedIndex = match.shift().length;
            var resplitParts = wholePath.substring(matchedIndex).split('/');
            if (resplitParts.length == 1 && resplitParts[0] == '') resplitParts.shift();
            var potentialMatch = lin[2].find(resplitParts, request, params.concat(match));
            if (potentialMatch) return potentialMatch;
          }
        }
      } 
      if (this.lookup[parts[0]]) {
        var potentialMatch = this.lookup[parts[0]].find(parts.slice(1, parts.size), request, params);
        if (potentialMatch) return potentialMatch;
      }
      if (this.catchall) {
        var part = parts.shift();
        params.push(part);
        return this.catchall.find(parts, request, params);
      }
    }
    return undefined;
  },
  findRequest: function(request) {
    var sys = require('sys');
    if (this.requestMethod) {
      sys.debug("there is a request method: " + this.requestMethod);
      sys.debug("the current request has: " + request[this.requestMethod]);
      if (this.linear.length != 0 && request[this.requestMethod]) {
        sys.debug("doing a linear search");
        for (var linearIdx = 0; linearIdx != this.linear.length; linearIdx++) {
          var lin = this.linear[linearIdx];
          var match = lin[0].exec(request[this.requestMethod]);
          sys.debug("matched:"+sys.inspect(match));
          if (match) {
            matchedIndex = match.shift().length;
            var potentialMatch = lin[2].findRequest(request);
            if (potentialMatch) return potentialMatch;
          }
        }
      }
      if (request[this.requestMethod] && this.lookup[request[this.requestMethod]]) {
        sys.debug("doing a lookup search");
        var potentialMatch = this.lookup[request[this.requestMethod]].findRequest(request);
        if (potentialMatch) {
          sys.debug("found one..");
          return potentialMatch;
        }
      }
      if (this.catchall) {
        sys.debug("doing a catchall search");
        return this.catchall.findRequest(request);
      }
      sys.debug("no search succeeded");
    } else if (this.destination) {
      sys.debug("there is a destination");
      return this;
    } else {
      sys.debug("we got nothin'");
      return undefined;
    }
  },
  transplantValue: function() {
    var sys = require('sys');
    sys.debug("transplantValue this.destination:..." + sys.inspect(this.destination));
    sys.debug("transplantValue this.requestNode:..." + sys.inspect(this.requestNode));
    if (this.destination && this.requestNode) {
      sys.debug("there is a destination");
      var targetNode = this.requestNode;
      while (targetNode.requestMethod) {
        sys.debug("adding a catchall");
        targetNode = (targetNode.addCatchall());
      }
      sys.debug("re-applying destination");
      targetNode.destination = this.destination;
      this.destination = undefined;
    } else {
      sys.debug("there is NOT a destination");
      sys.debug(sys.inspect(this.requestNode));
    }
    sys.debug("done transplantValue...");
  },
  compileRequestConditions: function(router, requestConditions) {
    var sys = require('sys');
    //raise(UnsupportedRequestConditionError.new) if (request_options.keys & RequestNode::RequestMethods).size != request_options.size
    var currentNodes = [this];
    var requestMethods = router.requestKeys;
    
    sys.debug("compiling for these request conditions: "+sys.inspect(requestConditions));
    for (var requestMethodIdx in requestMethods) {
      var method = requestMethods[requestMethodIdx];
      sys.debug("looking at method: "+method);
      
      if (requestConditions[method]) {// so, the request method we care about it ..

        sys.debug("we care about this method " + sys.inspect(requestConditions[method]));

        if (currentNodes.length == 1 && currentNodes[0] === this) {
          sys.debug("currentNodes is in the initial state");
          currentNodes = [this.addRequestNode()];
        } else {
          sys.debug("currentNodes is NOT in the initial state");
        }
        
        for (var currentNodeIndex = 0; currentNodeIndex != currentNodes.length; currentNodeIndex++) {
          var currentNode = currentNodes[currentNodeIndex];
          if (!currentNode.requestMethod) {
            currentNode.requestMethod = method
          }

          var masterPosition = requestMethods.indexOf(method);
          var currentPosition = requestMethods.indexOf(currentNode.requestMethod);
          
          if (masterPosition == currentPosition) {
            sys.debug("doing a lookup add on "+method+" "+requestConditions[method]);
            
            if (requestConditions[method].compile) {
              currentNodes[currentNodeIndex] = currentNodes[currentNodeIndex].addLinear(requestConditions[method], 0);
            } else {
              currentNodes[currentNodeIndex] = currentNodes[currentNodeIndex].addLookup(requestConditions[method]);
            }
          } else if (masterPosition < currentPosition) {
            sys.debug("adding to the catchall");
            currentNodes[currentNodeIndex] = currentNodes[currentNodeIndex].addCatchall();
          } else {
            sys.debug("got no where to go...");
            var nextNode = currentNode.dup();
            currentNode.reset();
            currentNode.requestMethod = method;
            currentNode.catchall = nextNode;
            currentNodeIndex--;
          }
        }
        sys.debug("all done");
        
        //current_nodes.flatten!
      } else {
        sys.debug("we don't care about this method");
        for (var currentNodeIndex = 0; currentNodeIndex != currentNodes.length; currentNodeIndex++) {
          sys.debug("examining node "+currentNodeIndex);
          var node = currentNodes[currentNodeIndex];
          if (!node.requestMethod && node.requestNode) {
            sys.debug("using the requestNode");
            node = node.requestNode;
          }
          if (node.requestMethod) {
            currentNodes[currentNodeIndex] = node.addCatchall();
            currentNodes[currentNodeIndex].requestMethod = null;
          }
        }
      }
    }
    this.transplantValue();
    return currentNodes;
  }
};

Sherpa.Router.prototype = {
  generate: function(name, params) {
    return this.routes[name].generate(params);
  },
  add: function(uri) {
    return new Sherpa.Route(this, uri);
  },
  recognize: function(path, request) {
    if (path.substring(0,1) == '/') path = path.substring(1);
    return this.root.find(path == '' ? [] : path.split(/\//), request, []);
  }
};

Sherpa.Route.prototype = {
  name: function(routeName) {
    this.router.routes[routeName] = this;
    return this;
  },
  matchPartially: function() {
    this.partial = true;
    return this;
  },
  matchesWith: function(matches) {
    for (var matchesKey in matches) {
      this.matchingConditions[matchesKey] = matches[matchesKey];
    }
    return this;
  },
  compile: function() {
    for(var pathIdx = 0; pathIdx != this.paths.length; pathIdx++) {
      this.paths[pathIdx].compile();
      for (var variableIdx = 0; variableIdx != this.paths[pathIdx].variableNames.length; variableIdx++) {
        if (this.variableNames.indexOf(this.paths[pathIdx].variableNames[variableIdx]) == -1) this.variableNames.push(this.paths[pathIdx].variableNames[variableIdx]);
      }
    }
  },
  to: function(destination) {
    this.compile();
    this.destination = destination;
    return this;
  },
  condition: function(conditions) {
    for (var conditionKey in conditions) {
      this.requestConditions[conditionKey] = conditions[conditionKey];
    }
    return this;
  },
  generate: function(params) {
    if (params == undefined || this.paths.length == 1) {
      return this.paths[0].generate(params);
    } else {
      for(var pathIdx = 0; pathIdx != this.paths.length == 1; pathIdx++) {
        var path = this.paths[pathIdx].generate(params);
        if (path) return path;
      }
      return undefined;
    }
  }
};

Sherpa.Path.prototype = {
  generate: function(params) {
    var sys = require('sys');
    sys.debug("path generate for "+sys.inspect(params) + " from "+sys.inspect(this.variableNames));
    for (var paramsKey in params) {
      if (this.variableNames.indexOf(paramsKey) == -1) return undefined;
    }
    sys.debug("passed for "+sys.inspect(params));
    for(var varIdx = 0; varIdx != this.variableNames.length; varIdx++) {
      sys.debug("testing: "+this.variableNames[varIdx] + " --> " + this.route.matchingConditions[this.variableNames[varIdx]]);
      if (this.route.matchingConditions[this.variableNames[varIdx]]) {
        if (this.route.matchingConditions[this.variableNames[varIdx]].exec(params[this.variableNames[varIdx]].toString()) != params[this.variableNames[varIdx]].toString()) {
          sys.debug("regex exec didn't work...");
          return undefined;
        } else {
          sys.debug("regex exec worked");
        }
      } else {
        sys.debug("matchesWith doesn't exist...");
      }
    }
    return eval(this.compiledUri);
  },
  compile: function() {
    var sys = require('sys');
    sys.debug("groups:"+sys.inspect(this.groups));
    
    this.variableNames = [];
    var currentNode = this.route.router.root;
    for(var groupIdx = 0; groupIdx != this.groups.length; groupIdx++) {
      var group = this.groups[groupIdx];
      sys.debug(groupIdx);
      sys.debug(sys.inspect(group));
      if (group.length > 1) {
        var pattern = '^';
        for (var partIndex = 0; partIndex != group.length; partIndex++) {
          var part = group[partIndex];
          var captureCount = 0
          if (part.substring(0,1) == ':') {
            var variableName = part.substring(1);
            this.variableNames.push(variableName);
            pattern += this.route.matchingConditions[variableName] ? this.route.matchingConditions[variableName].toString() : '(.*?)'
            captureCount += 1
          } else {
            pattern += RegExp.escape(part);
          }
        }
        sys.debug("PATTERN:" + sys.inspect(pattern));
        currentNode = currentNode.addLinear(new RegExp(pattern), captureCount);
      } else if (group.length == 1) {
        var part = group[0];
        if (part.substring(0,1) == ':') {
          var variableName = part.substring(1);
          this.variableNames.push(variableName);
          if (this.route.matchingConditions[variableName]) {
            currentNode = currentNode.addLinear(this.route.matchingConditions[variableName], 1);
          } else {
            currentNode = currentNode.addCatchall();
          }
        } else {
          currentNode = currentNode.addLookup(part);
        }
      }
    }
    var nodes = currentNode.compileRequestConditions(this.route.router, this.route.requestConditions);
    for (var nodeIdx = 0; nodeIdx != nodes.length; nodeIdx++) {
      sys.debug("adding a destination to " + sys.inspect(nodes[nodeIdx]));
      nodes[nodeIdx].destination = this;
    }
  }
};

Sherpa.Response.prototype = {
};