'use strict';

const express = require('express');
const ApiParser = require('./libs/parser').ApiParser;
const ApiCache = require('./libs/cache').ApiCache;

/**
 * NODE_ENV === 'production'
 */
const app = express();
app.set('trust proxy', true);

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, ' +
    'x-client-id');
  next();
});

const sendError = (res, message, code) => {
  res.set('Content-Type', 'application/json');
  res.status(code).send({
    error: true,
    message: message
  }).end();
};

app.get('/', function(req, res) {
  let params = req.query;
  let apiFile = params.api;
  if (!apiFile) {
    sendError(res, 'API file not specified.', 400);
    return;
  }
  let cache = new ApiCache();
  let parser = new ApiParser(apiFile);
  cache.get(apiFile).then((existing) => {
    if (!existing) {
      return Promise.resolve();
    }
  })
  .catch((e) => {
    console.log(e);
    // run anyway.
  })
  .then((previous) => {
    if (previous) {
      parser.setPreviousData(previous);
    }
    return parser.run();
  })
  .then((result) => {
    if (!result.cached) {
      cache.save(apiFile, result.etag, result.time, result.api).catch((e) => {
        console.error('Save error: ', e);
      });
    }
    res.status(200).send(result.api);
  }).catch((e) => {
    console.error(e);
    sendError(res, e.message, 400);
  });

});

// Start the server
var server = app.listen(process.env.PORT || '8080', function() {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
