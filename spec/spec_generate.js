require('../lib/sherpa')

describe("Sherpa - generate", function() {
  it("should generate a simple route", function() {
    var router = new Sherpa.Router();
    router.add('/test').name('simple');
    assertEqual('/test', router.generate('simple'));
  });

  it("should generate a route with a variable in it", function() {
    var router = new Sherpa.Router();
    router.add('/:test').name('with_variable');
    assertEqual('/var', router.generate('with_variable', {test: 'var'}));
  });

  it("should generate a route with a regex variable in it", function() {
    var router = new Sherpa.Router();
    router.add('/:test', {matchesWith: {test: /asd|qwe|\d+/}}).name('with_variable');
    assertEqual(undefined, router.generate('with_variable', {test: 'variable'}))
    assertEqual(undefined, router.generate('with_variable', {test: '123qwe'}))
    assertEqual('/123', router.generate('with_variable', {test: '123'}))
    assertEqual('/qwe', router.generate('with_variable', {test: 'qwe'}))
    assertEqual('/asd', router.generate('with_variable', {test: 'asd'}))
  });

  it("should generate a route with a optionals in it", function() {
    var router = new Sherpa.Router();
    router.add('/(:test)').name('with_optional');
    assertEqual('/', router.generate('with_optional'))
    assertEqual('/hello', router.generate('with_optional', {test: 'hello'}))
  });

  it("should generate a route with nested optionals in it", function() {
    var router = new Sherpa.Router();
    router.add('/(:test(/:test2))').name('with_optional');
    assertEqual('/', router.generate('with_optional'))
    assertEqual('/hello', router.generate('with_optional', {test: 'hello'}))
    assertEqual('/hello/world', router.generate('with_optional', {test: 'hello', test2: 'world'}))
    assertEqual('/?test2=hello', router.generate('with_optional', {test2: 'hello'}))
  });

  it("should generate extra params as a query string after", function() {
    var router = new Sherpa.Router();
    router.add('/:test', {matchesWith: {test: /asd|qwe|\d+/}}).name('with_variable');
    assertEqual('/123?foo=bar', router.generate('with_variable', {test: '123', foo: 'bar'}))
  });

});