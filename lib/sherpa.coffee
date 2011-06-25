util = require 'util'

root.Sherpa = class Sherpa
  constructor: (@callback) ->
    @root = new Node()
    @routes = {}
  match: (request) ->
    request = new Request(request)
    @root.match(request)
    if request.destinations.length > 0
      response = new Response(request)
      response.invoke()
    else if @callback?
      @callback(request.underlyingRequest)
  findSubparts: (part) ->
    subparts = []
    while match = part.match(/\\.|[:*][a-z0-9_]+|[^:*\\]+/)
      part = part.slice(match.index, part.length)
      subparts.push part.slice(0, match[0].length)
      part = part.slice(match[0].length, part.length)
    subparts
  url: (name, params) ->
    @routes[name].url(params)
  add: (rawPath, opts) ->
    paths = [""]
    chars = rawPath.split('')
    startIndex = 0
    endIndex = 1
    matchesWith = opts?.matchesWith || {}
    routeName = opts?.name
    for charIndex in [0...chars.length]
      c = chars[charIndex]
      switch c
        when '('
          # over current working set, double paths
          paths.push(paths[pathIndex]) for pathIndex in [startIndex...endIndex]
          # move working set to newly copied paths
          startIndex = endIndex
          endIndex = paths.length
        when ')'
          startIndex -= endIndex - startIndex
        else
          paths[pathIndex] += c for pathIndex in [startIndex...endIndex]

    pathSet = for path in paths
      node = @root
      variableNames = []
      parts = path.split('/')
      compiledPath = []
      escape = (str) ->
        str.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1')
      for part in parts
        if part == ''
        else
          compiledPath.push "'/'"
          subparts = @findSubparts(part)
          nextNode = if subparts.length == 1
            part = subparts[0]
            switch part[0]
              when ':'
                variableName = part.slice(1, part.length)
                compiledPath.push "params['#{variableName}']"
                variableNames.push(variableName)
                if matchesWith[variableName]? then new SpanningRegexMatcher(matchesWith[variableName], [0], []) else new Variable() 
              when '*'
                compiledPath.push "params['#{variableName}'].join('/')"
                variableName = part.slice(1, part.length)
                variableNames.push(variableName)
                new Glob()
              else
                compiledPath.push "'#{part}'"
                new Lookup(part)
          else
            capturingIndicies = []
            splittingIndicies = []
            captures = 0
            spans = false
            regexSubparts = for part in subparts
              switch part[0]
                when '\\' then escape(part[1].chr)
                when ':', '*'
                  if part[0] == '*'
                    spans = true
                  captures += 1
                  name = part.slice(1, part.length)
                  variableNames.push(name)
                  if part[0] == '*'
                    splittingIndicies.push(captures)
                    compiledPath.push "params['#{name}'].join('/')"
                  else
                    capturingIndicies.push(captures)
                    compiledPath.push "params['#{name}']"
                  if spans
                    if matchesWith[name]? then "((?:#{matchesWith[name].source}\\/?)+)" else '(.*?)'
                  else
                    "(#{(matchesWith[name]?.source || '[^/]*?')})"
                else
                  compiledPath.push "'#{part}'"
                  escape(part)
            regexp = new RegExp("#{regexSubparts.join('')}$")
            if spans
              new SpanningRegexMatcher(regexp, capturingIndicies, splittingIndicies)
            else
              new RegexMatcher(regexp, capturingIndicies, splittingIndicies)
          node = node.add(nextNode)
      if opts?.conditions?
        node = node.add(new RequestMatcher(opts.conditions))
      path = new Path(node, variableNames)
      path.partial = !!opts?.partial
      path.compiled = if compiledPath.length == 0 then "'/'" else compiledPath.join('+')
      path
    route = new Route(pathSet, matchesWith)
    @routes[routeName] = route if routeName?
    route

  class Response
    constructor: (@request, @position) ->
      @position ||= 0
    next: ->
      if @position == @destinations.length - 1
        false
      else
        new Response(@request, @position + 1).invoke()
    invoke: ->
      @request.destinations[@position].destination(@request.underlyingRequest, @request.destinations[@position].params)

  class Node
    constructor: ->
      @type ||= 'node'
      @matchers = []
    add: (n) ->
      if !@matchers[@matchers.length - 1]?.usable(n)
        @matchers.push(n)
      @matchers[@matchers.length - 1].use(n)
    usable: (n) -> n.type == @type
    match: (request) ->
      m.match(request) for m in @matchers
    superMatch: Node::match
    use: (n) -> this

  class Lookup extends Node
    constructor: (part) ->
      @part = part  
      @type = 'lookup'
      @map = {}
      super
    match: (request) ->
      if @map[request.path[0]]?
        request = request.clone()
        part = request.path.shift()
        @map[part].match(request)
    use: (n) ->
      @map[n.part] ||= new Node()
      @map[n.part]
  
  class Variable extends Node
    constructor: ->
      @type ||= 'variable'
      super
    match: (request) ->
      if request.path.length > 0
        request = request.clone()
        request.variables.push(request.path.shift())
        super(request)
      
  class Glob extends Variable
    constructor: ->
      @type = 'glob'
      super
    match: (request) ->
      if request.path.length > 0
        original_request = request
        globbed_variable = []
        while request.path.length > 0
          request = request.clone()
          globbed_variable.push(request.path.shift())
          request.variables.push(globbed_variable)
          @superMatch(request)

  class RegexMatcher extends Node
    constructor: (@regexp, @capturingIndicies, @splittingIndicies) ->
      @type ||= 'regex'
      super
    match: (request) ->
      if request.path[0]? and match = request.path[0].match(@regexp)
        request = request.clone()
        request.path.shift()
        request.variables.push(match[i].split('/')) for i in @splittingIndicies # fixme, this needs the correct order applied
        request.variables.push(match[i]) for i in @capturingIndicies
        super(request)
    usable: (n) ->
      n.type == @type && n.regexp == @regexp && n.capturingIndicies == @capturingIndicies && n.splittingIndicies == @splittingIndicies
    
  class SpanningRegexMatcher extends RegexMatcher
    constructor: (@regexp, @capturingIndicies, @splittingIndicies) ->
      @type = 'spanning'
      super
    match: (request) ->
      if request.path.length > 0
        wholePath = request.path.join('/')
        if match = wholePath.match(@regexp)
          request = request.clone()
          request.variables.push(match[i].split('/')) for i in @splittingIndicies
          request.variables.push(match[i]) for i in @capturingIndicies
          request.splitPath(wholePath.slice(match.index + match[0].length, wholePath.length))
          @superMatch(request)
      
  class RequestMatcher extends Node
    constructor: (@conditions) ->
      @type = 'request'
      super
    match: (request) ->
      conditionCount = 0
      satisfiedConditionCount = 0
      for type, matcher of @conditions
        val = request.underlyingRequest[type]
        conditionCount++
        v = if matcher instanceof Array
          matching = ->
            for cond in matcher
              if cond.exec?
                return true if matcher.exec(val)
              else
                return true if cond == val
            false
          matching()
        else
          if matcher.exec? then matcher.exec(val) else matcher == val
        satisfiedConditionCount++ if v
      if conditionCount == satisfiedConditionCount
        super(request)
    usable: (n) ->
      n.type == @type && n.conditions == @conditions

  class Path extends Node
    constructor: (@parent, @variableNames) ->
      @type = 'path'
      @partial = false
    match: (request) ->
      if @partial or request.path.length == 0
        request.destinations.push({destination: @route.destination, request: request, params: @constructParams(request)})
    constructParams: (request) ->
      params = {}
      for i in [0...@variableNames.length]
        params[@variableNames[i]] = request.variables[i]
      params
    url: (rawParams) ->
      rawParams = {} unless rawParams?
      params = {}
      for key in @variableNames
        params[key] = if @route.default? then rawParams[key] || @route.default[key] else rawParams[key]
        return undefined if !params[key]?
      for name in @variableNames
        if @route.matchesWith[name]?
          match = params[name].match(@route.matchesWith[name])
          return undefined unless match? && match[0].length == params[name].length
      path = if @compiled == '' then '' else eval(@compiled)
      if path?
        delete rawParams[name] for name in @variableNames
        path

  class Route
    constructor: (@pathSet, @matchesWith) ->
      path.route = this for path in @pathSet
    to: (@destination) ->
      @pathSet = path.parent.add(path) for path in @pathSet
    url: (params) ->
      path = undefined
      for pathIdx in [(@pathSet.length - 1)..0]
        path = @pathSet[pathIdx].url(params)
        break if path?
      if path?
        path = encodeURI(path)
        query = ''
        for key, val of params
          query += (if query == '' then '?' else '&')
          query += encodeURIComponent(key).replace(/%20/g, '+')
          query += '='
          query += encodeURIComponent(params[key]).replace(/%20/g, '+');
        "#{path}#{query}"
      else
        undefined

  class Request
    constructor: (@underlyingRequest, @callback) ->
      @variables = []
      @destinations = []
      if @underlyingRequest?
        @path = @splitPath(@underlyingRequest.url)
        @path.shift() if @path[0] == ''
    toString: -> "<Request path: /#{@path.join('/') } #{@path.length}>"
    splitPath: (path) ->
      @path = if /^\/?$/.exec(path) then [] else require('url').parse(path).pathname.split('/')
    clone: ->
      c = new Request()
      c.path = @path.slice(0, @path.length)
      c.variables = @variables.slice(0, @variables.length)
      c.underlyingRequest = @underlyingRequest
      c.callback = @callback
      c.destinations = @destinations
      c
