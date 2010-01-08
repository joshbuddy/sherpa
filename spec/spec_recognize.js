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
    router.add('/:test', {matches_with: {test: /asd|qwe|\d+/}}).to('recognized');
    assertEqual(undefined, router.recognize('/variable'))
    assertEqual(undefined, router.recognize('/123qwe'))
    assertEqual('recognized', router.recognize('/123').destination)
    assertEqual('recognized', router.recognize('/qwe').destination)
    assertEqual('recognized', router.recognize('/asd').destination)
  });
});