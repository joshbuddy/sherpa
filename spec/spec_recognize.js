require('../lib/sherpa')
var minitest = require('./minitest.js/minitest');
minitest.setupListeners();
var assert = require('assert');

minitest.context("Sherpa#recognize()", function () {
  this.setup(function () {
    this.router = new Sherpa.Router();
  });

  this.assertion("should recognize a simple route", function(test) {
    this.router.add('/').to('recognized');
    var sys = require('sys');
    var resposne = this.router.recognize('/');
    sys.debug("RESPONSE!: "+ sys.inspect(resposne.destination));
    assert.equal('recognized', this.router.recognize('/').destination);
    test.finished();
  });
  
  this.assertion("should recognize a simple route", function(test) {
    this.router.add('/test').to('recognized');
    var sys = require('sys');
    var resposne = this.router.recognize('/test');
    sys.debug("RESPONSE!: "+ sys.inspect(resposne.destination));
    assert.equal('recognized', this.router.recognize('/test').destination);
    test.finished();
  });
  
  this.assertion("should recognize a route with a variable", function(test) {
    this.router.add('/:test').to('recognized');
    var response = this.router.recognize('/variable');
    assert.equal('recognized', response.destination);
    assert.deepEqual({test: 'variable'}, response.params);
    test.finished();
  });
  
  this.assertion("should recognize a route with a variable in the middle of the path", function(test) {
    this.router.add('/test-:test-test').to('recognized');
    var response = this.router.recognize('/test-variable-test');
    assert.equal('recognized', response.destination);
    assert.deepEqual({test: 'variable'}, response.params);
    test.finished();
  });
  
  this.assertion("should recognize a route with a variable at the end of the path", function(test) {
    this.router.add('/test/:test').to('recognized');
    var response = this.router.recognize('/test/variable');
    assert.equal('recognized', response.destination);
    assert.deepEqual({test: 'variable'}, response.params);
    test.finished();
  });
  
  this.assertion("should recognize a simple route with optionals", function(test) {
    this.router.add('/(test)').to('recognized');
    assert.equal('recognized', this.router.recognize('/test').destination);
    assert.equal('recognized', this.router.recognize('/').destination);
    test.finished();
  });
  
  this.assertion("should recognize a route based on a request method", function(test) {
    this.router.add('/test').to('any');
    this.router.add('/test').condition({method: 'GET'}).to('get');
    this.router.add('/test').condition({method: 'POST'}).to('post');
    assert.equal('get', this.router.recognize('/test', {method: 'GET'}).destination);
    assert.equal('post', this.router.recognize('/test', {method: 'POST'}).destination);
    assert.equal('any', this.router.recognize('/test', {method: 'PUT'}).destination);
    test.finished();
  });
  
  this.assertion("should recognize a simple route with nested optionals", function(test) {
    this.router.add('/test(/test2(/test3))').to('recognized');
    assert.equal('recognized', this.router.recognize('/test').destination);
    assert.equal('recognized', this.router.recognize('/test/test2').destination);
    assert.equal('recognized', this.router.recognize('/test/test2/test3').destination);
    assert.equal(undefined, this.router.recognize('/test/test3'));
    test.finished();
  });
  
  this.assertion("should recognize a route based on multiple request keys", function(test) {
    this.router = new Sherpa.Router({requestKeys: ['method', 'scheme']});
    this.router.add('/test').condition({method: 'GET', scheme: 'https'}).to('https-get');
    this.router.add('/test').condition({method: 'POST', scheme: 'http'}).to('http-post');
    this.router.add('/test').condition({scheme: 'http'}).to('http-any');
    this.router.add('/test').condition({scheme: 'https'}).to('https-any');
    this.router.add('/test').condition({method: 'POST', scheme: 'https'}).to('https-post');
    this.router.add('/test').condition({method: 'GET', scheme: 'http'}).to('http-get');
    
    assert.equal('http-post', this.router.recognize('/test', {method: 'POST', scheme: 'http'}).destination);
    assert.equal('http-post', this.router.recognize('/test', {method: 'POST', scheme: 'http'}).destination);
    assert.equal('http-any',  this.router.recognize('/test', {method: 'PUT', scheme: 'http'}).destination);
    assert.equal('https-get', this.router.recognize('/test', {method: 'GET', scheme: 'https'}).destination);
    assert.equal('https-get', this.router.recognize('/test', {method: 'GET', scheme: 'https'}).destination);
    assert.equal('https-any', this.router.recognize('/test', {method: 'PUT', scheme: 'https'}).destination);
    test.finished();
  });
  
  this.assertion("should recognize a partial route", function(test) {
    this.router.add('/test').matchPartially().to('recognized')
    assert.equal('recognized', this.router.recognize('/test/testing').destination);
    test.finished();
  });

  this.assertion("should recognize a route with a regex variable in it", function(test) {
    this.router.add('/:test').matchesWith({test: /asd|qwe|\d+/}).to('recognized');
    assert.equal(undefined, this.router.recognize('/variable'))
    assert.equal(undefined, this.router.recognize('/123qwe'))
    assert.equal('recognized', this.router.recognize('/123').destination)
    assert.equal('recognized', this.router.recognize('/qwe').destination)
    assert.equal('recognized', this.router.recognize('/asd').destination)
    test.finished();
  });
  
  this.assertion("should distinguish between identical routes where one has a matchesWith", function(test) {
    this.router.add('/:test').matchesWith({test: /^(asd|qwe|\d+)$/}).to('recognized-regex');
    this.router.add('/:test').to('recognized-nonregex');
    assert.equal('recognized-regex', this.router.recognize('/123').destination)
    assert.equal('recognized-regex', this.router.recognize('/qwe').destination)
    assert.equal('recognized-regex', this.router.recognize('/asd').destination)
    assert.equal('recognized-nonregex', this.router.recognize('/poipio').destination)
    assert.equal('recognized-nonregex', this.router.recognize('/123asd').destination)
    test.finished();
  });
  
  this.assertion("should recognize a route based on a request method", function(test) {
    this.router.add('/test').to('any');
    this.router.add('/test').condition({method: 'GET'}).to('get');
    this.router.add('/test').condition({method: 'POST'}).to('post');
    assert.equal('get', this.router.recognize('/test', {method: 'GET'}).destination);
    assert.equal('post', this.router.recognize('/test', {method: 'POST'}).destination);
    assert.equal('any', this.router.recognize('/test', {method: 'PUT'}).destination);
    test.finished();
  });
  
  
  this.assertion("should recognize a route based on a request method regex", function(test) {
    this.router.add('/test').to('any');
    this.router.add('/test').condition({method: 'DELETE'}).to('delete');
    this.router.add('/test').condition({method: /GET|POST/}).to('get-post');
    assert.equal('get-post', this.router.recognize('/test', {method: 'GET'}).destination);
    assert.equal('get-post', this.router.recognize('/test', {method: 'POST'}).destination);
    assert.equal('delete', this.router.recognize('/test', {method: 'DELETE'}).destination);
    assert.equal('any', this.router.recognize('/test', {method: 'PUT'}).destination);
    test.finished();
  });

  
});