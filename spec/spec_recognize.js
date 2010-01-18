require('../lib/sherpa')

describe("Sherpa - recognize", function() {
  it("should recognize a simple route", function() {
    var router = new Sherpa.Router();
    router.add('/test').to('recognized');
    assertEqual('recognized', router.recognize('/test').destination);
  });

  it("should recognize a route with a variable in it", function() {
    var router = new Sherpa.Router();
    router.add('/:test').to('recognized');
    var response = router.recognize('/variable');
    assertEqual('recognized', response.destination);
    assertEqual({test: 'variable'}, response.params);
  });

  it("should recognize a route with a regex variable in it", function() {
    var router = new Sherpa.Router();
    router.add('/:test', {matchesWith: {test: /asd|qwe|\d+/}}).to('recognized');
    assertEqual(undefined, router.recognize('/variable'))
    assertEqual(undefined, router.recognize('/123qwe'))
    assertEqual('recognized', router.recognize('/123').destination)
    assertEqual('recognized', router.recognize('/qwe').destination)
    assertEqual('recognized', router.recognize('/asd').destination)
  });
  
  it("should distinguish between identical routes where one has a matchesWith", function() {
    var router = new Sherpa.Router();
    router.add('/:test', {matchesWith: {test: /^(asd|qwe|\d+)$/}}).to('recognized-regex');
    router.add('/:test').to('recognized-nonregex');
    assertEqual('recognized-nonregex', router.recognize('/poipio').destination)
    assertEqual('recognized-nonregex', router.recognize('/123asd').destination)
    assertEqual('recognized-regex', router.recognize('/123').destination)
    assertEqual('recognized-regex', router.recognize('/qwe').destination)
    assertEqual('recognized-regex', router.recognize('/asd').destination)
  });
  
  it("should recognize a route based on a request method", function() {
    var router = new Sherpa.Router();
    router.add('/test').to('any');
    router.add('/test', {conditions:{method: 'GET'}}).to('get');
    router.add('/test', {conditions:{method: 'POST'}}).to('post');
    assertEqual('get', router.recognize('/test', {method: 'GET'}).destination);
    assertEqual('post', router.recognize('/test', {method: 'POST'}).destination);
    assertEqual('any', router.recognize('/test', {method: 'PUT'}).destination);
  });

  it("should recognize a route based on multiple request keys", function() {
    var router = new Sherpa.Router({requestKeys: ['method', 'scheme']});
    router.add('/test', {conditions:{method: 'GET', scheme: 'https'}}).to('https-get');
    router.add('/test', {conditions:{method: 'POST', scheme: 'http'}}).to('http-post');
    router.add('/test', {conditions:{scheme: 'http'}}).to('http-any');
    router.add('/test', {conditions:{scheme: 'https'}}).to('https-any');
    router.add('/test', {conditions:{method: 'POST', scheme: 'https'}}).to('https-post');
    router.add('/test', {conditions:{method: 'GET', scheme: 'http'}}).to('http-get');
    
    assertEqual('https-get', router.recognize('/test', {method: 'GET', scheme: 'https'}).destination);
    assertEqual('https-get', router.recognize('/test', {method: 'GET', scheme: 'https'}).destination);
    assertEqual('https-any', router.recognize('/test', {method: 'PUT', scheme: 'https'}).destination);
    assertEqual('http-post', router.recognize('/test', {method: 'POST', scheme: 'http'}).destination);
    assertEqual('http-post', router.recognize('/test', {method: 'POST', scheme: 'http'}).destination);
    assertEqual('http-any', router.recognize('/test', {method: 'PUT', scheme: 'http'}).destination);
    
  });

  it("should recognize a route based on a request method regex", function() {
    var router = new Sherpa.Router();
    router.add('/test').to('any');
    router.add('/test', {conditions:{method: 'DELETE'}}).to('delete');
    router.add('/test', {conditions:{method: /GET|POST/}}).to('get-post');
    assertEqual('get-post', router.recognize('/test', {method: 'GET'}).destination);
    assertEqual('get-post', router.recognize('/test', {method: 'POST'}).destination);
    assertEqual('delete', router.recognize('/test', {method: 'DELETE'}).destination);
    assertEqual('any', router.recognize('/test', {method: 'PUT'}).destination);
  });

  
});