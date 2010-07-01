require('../lib/sherpa')
var minitest = require('./minitest.js/minitest');
minitest.setupListeners();
var assert = require('assert');

minitest.context("Sherpa#generate()", function () {
  this.setup(function () {
    this.router = new Sherpa.Router();
  });

  this.assertion("should generate a simple route", function (test) {
    this.router.add('/test').name('simple').compile();
    assert.equal('/test', this.router.generate('simple'));
    test.finished();
  });

  this.assertion("should generate a route with a variable in it", function (test) {
    this.router.add('/:test').name('with_variable').compile();
    assert.equal('/var', this.router.generate('with_variable', {test: 'var'}));
    test.finished();
  });
  
  this.assertion("should generate a route with a regex variable in it", function(test) {
    this.router.add('/:test').matchesWith({test: /asd|qwe|\d+/}).name('with_variable').compile();
    assert.equal(undefined, this.router.generate('with_variable', {test: 'variable'}))
    assert.equal(undefined, this.router.generate('with_variable', {test: '123qwe'}))
    assert.equal('/123', this.router.generate('with_variable', {test: '123'}))
    assert.equal('/qwe', this.router.generate('with_variable', {test: 'qwe'}))
    assert.equal('/asd', this.router.generate('with_variable', {test: 'asd'}))
    test.finished();
  });
  
  this.assertion("should generate a route with a optionals in it", function(test) {
    this.router.add('/(:test)').name('with_optional').compile();
    assert.equal('/', this.router.generate('with_optional'))
    assert.equal('/hello', this.router.generate('with_optional', {test: 'hello'}))
    test.finished();
  });
  
  this.assertion("should generate a route with nested optionals in it", function(test) {
    this.router.add('/(:test(/:test2))').name('with_optional').compile();
    assert.equal('/', this.router.generate('with_optional'))
    assert.equal('/hello', this.router.generate('with_optional', {test: 'hello'}))
    assert.equal('/hello/world', this.router.generate('with_optional', {test: 'hello', test2: 'world'}))
    assert.equal('/?test2=hello', this.router.generate('with_optional', {test2: 'hello'}))
    test.finished();
  });
  
  this.assertion("should generate extra params as a query string after", function(test) {
    this.router.add('/:test', {matchesWith: {test: /asd|qwe|\d+/}}).name('with_variable').compile();
    assert.equal('/123?foo=bar', this.router.generate('with_variable', {test: '123', foo: 'bar'}));
    test.finished();
  });
  
  this.assertion("should generate extra params as a query string after", function(test) {
    this.router.add('/:test', {matchesWith: {test: /asd|qwe|\d+/}}).name('with_variable').compile();
    assert.equal('/123?foo=bar', this.router.generate('with_variable', {test: '123', foo: 'bar'}));
    test.finished();
  });
  
  this.assertion("should escape values in the URI", function(test) {
    this.router.add('/:test').name('with_variable').compile();
    assert.equal('/%5B%20%5D+=-', this.router.generate('with_variable', {test: '[ ]+=-'}))
    test.finished();
  });
  
  this.assertion("should escape values in the query string", function(test) {
    this.router.add('/').name('simple').compile();
    assert.equal('/?test+and+more=%5B+%5D%2B%3D-', this.router.generate('simple', {"test and more": '[ ]+=-'}))
    test.finished();
  });
});