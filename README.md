# Copy.com API Node.js Client Library 

## Installation

	npm install copyapi

## Example Usage

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

		copyapi.getRequestToken(function(error, request_token, request_secret, redirect_url) {
			if (error) { res.send("ERROR GETTING REQUEST TOKEN:\n" + error); return; }

			// Store the Request Token and Request Secret in the users session
			req.session.request_token = request_token;
			req.session.request_secret = request_secret;

			console.log("REQUEST TOKEN: " + request_token + "\nREQUEST SECRET: " + request_secret);

			res.redirect(redirect_url);
		});
	});

	// Third party redirects user back to this page, where we then request an access token
	app.get('/get_access_token', function(req, res) {
		console.log("GET /get_access_token");

		copyapi.getAccessToken(req.session.request_token, req.session.request_secret, req.query.oauth_verifier, function(error, access_token, access_secret) {
			if (error) { res.send("ERROR GETTING AT" + error); return; }

			console.log("ACCESS TOKEN: " + access_token + "\nACCESS TOKEN SECRET: " + access_secret);

			// We no longer need these request details, so lets delete them
			delete req.session.request_token, req.session.request_secret;

			// Storing the Access Token and Access Secret in the users session
			req.session.access_token = access_token;
			req.session.access_secret = access_secret;

			res.send('Done getting Access Token!<br />\n<a href="/api_call">Make an API Call</a>');
		});
	});

	// Here we make a sample API call
	app.get('/api_call', function(req, res) {
		console.log("GET /api_call");

		copyapi.getUser(req.session.access_token, req.session.access_secret, function(error, user, code) {
			if (error) { res.send("ERROR TALKING TO API:\n" + error); return; }

			res.send(
				"Name: " + user.first_name + " " + user.last_name + "<br />\n" + 
				"Usage: " + ((user.storage.used / user.storage.quota) * 100).toFixed(2) + "%<br />\n"
			);
		});
	});

	app.listen(port);

## License

BSD
