# Copy.com API Node.js Client Library 

Welcome to the official [Copy.com](http://www.copy.com) Node.js Client Library!

## Status

This client library is currently in extremely early stages, and is not ready for production. For a list of all the things wrong, check out the list of [Issues](https://github.com/copy-app/nodejs-client-library/issues).

Once we hit version 0.3.0, it will be safe to use this Client Library in your projects.

## Installation

```bash
$ npm install copyapi
```

## Example Usage

```js
var express = require('express');
var app = express();
var copyapi = require('copyapi');
var port = 3000;

// Enabling Express.js sessions, which rely on a coookie
app.use(express.cookieParser('SupERseCREt'));
app.use(express.session());

// Setting the consumer key, consumer secret, and callback URL
copyapi.configure({
	consumer_key: 'CoNsumERkEy',
	consumer_secret: 'ConSUMerSecREt',
	callback_url: 'http://localhost:' + port + '/get_access_token',
});

// Landing page
app.get('/', function(req, res) {
	console.log("GET /");

	res.send('<a href="/get_request_token">Get Request Token</a>');
});

// Gets a request token, then redirects user to authorize screen
app.get('/get_request_token', function(req, res) {
	console.log("GET /get_request_token");

	copyapi.getRequestToken(function(error, request_pair, redirect_url) {
		if (error) { res.send("ERROR GETTING REQUEST TOKEN:\n" + error); return; }

		// Store the Request Token and Request Secret in the users session
		req.session.request_pair = request_pair;

		console.log("REQUEST TOKEN: " + request_pair.token + "\nREQUEST SECRET: " + request_pair.secret);

		res.redirect(redirect_url);
	});
});

// Third party redirects user back to this page, where we then request an access token
app.get('/get_access_token', function(req, res) {
	console.log("GET /get_access_token");

	copyapi.getAccessToken(req.session.request_pair, req.query.oauth_verifier, function(error, access_pair) {
		if (error) { res.send("ERROR GETTING AT" + error); return; }

		console.log("ACCESS TOKEN: " + access_pair.token + "\nACCESS TOKEN SECRET: " + access_pair.secret);

		// We no longer need these request details, so lets delete them
		delete req.session.request_pair;

		// Storing the Access Token and Access Secret in the users session
		req.session.access_pair = access_pair;

		res.send('Done getting Access Token!<br />\n<a href="/api_call_get_user">Make an API Call</a>');
	});
});

// Here we make a sample API call
app.get('/api_call_get_user', function(req, res) {
	console.log("GET /api_call_get_user");

	copyapi.getUser(req.session.access_pair, function(error, user, code) {
		if (error) { res.send("ERROR TALKING TO API:\n" + error); return; }

		res.send(
			"Name: " + user.first_name + " " + user.last_name + "<br />\n" + 
			"Usage: " + ((user.storage.used / user.storage.quota) * 100).toFixed(2) + "%<br />\n"
		);
	});
});

app.get('/api_call_set_user/:first_name/:last_name', function(req, res) {
	console.log("GET /api_call_set_user");
	console.log("FIRST_NAME: " + req.params.first_name);
	console.log("LAST_NAME: " + req.params.last_name);

	copyapi.setUser(req.session.access_pair, req.params.first_name, req.params.last_name, function(error, user, code) {
		if (error) { res.send("ERROR TALKING TO API:\n" + error); return; }

		res.send(
			"Name: " + user.first_name + " " + user.last_name + "<br />\n"
		);
	});
});

app.get('/api_call_get_path/*', function(req, res) {
	console.log("GET /api_call_get_path");
	console.log("PATH: " + req.params[0]);

	copyapi.getPath(req.session.access_pair, req.params[0], function(error, data) {
		if (error) { res.send("ERROR TALKING TO API:\n" + error); return; }

		res.send(data);
	});
});

app.listen(port);
```

## License

BSD
