var OAuth = require('OAuth');

var CopyApi = function() {
	var self = this;

	var url_api 			= 'http://api.copy.local/rest/',
		url_request 		= 'http://api.copy.local/oauth/request',
		url_access 			= 'http://api.copy.local/oauth/access',
		url_authorize		= 'http://www.copy.local/applications/authorize',
		oauth 				= null;

	self.oauth = null;

	self.callback_url = null;

	self.consumer = {
		key: null,
		secret: null,
	};

	/**
	 * Sets some required default values, and instantiates the main oauth object
	 */
	self.configure = function(details) {
		self.consumer.key = details.consumer_key;
		self.consumer.secret = details.consumer_secret;
		self.callback_url = details.callback_url;

		self.oauth = new OAuth.OAuth(
			url_request, url_access,
			self.consumer.key, self.consumer.secret,
			'1.0A', null, 'HMAC-SHA1', null,
			{
				// This is technically only required for API operations, not the OAuth handshake
				// but the Node OAuth library doesn't allow it on a per-request basis
				'X-Api-Version': 1,
				'Accept': 'application/json',
			}
		);
	};

	/**
	 * Asks the Copy API for a Request Token
	 * TODO: Allow a permissions object to be passed in
	 */
	self.getRequestToken = function(callback) {
		self.oauth.getOAuthRequestToken({
			oauth_callback: self.callback_url
		}, function(error, request_token, request_secret) {
			if (error) {
				callback(error);
				return;
			}

			if (!request_token || !request_secret) {
				callback("Invalid Request Token or Request Secret from server: Token: " + request_token + ", Secret: " + request_secret);
				return;
			}

			callback(error, request_token, request_secret, url_authorize + '?oauth_token=' + request_token);
		});
	};

	/**
	 * Asks the Copy API for an Access Token
	 */
	self.getAccessToken = function(request_token, request_secret, verifier, callback) {
		self.oauth.getOAuthAccessToken(request_token, request_secret, verifier, function(error, access_token, access_secret) {
			if (error) {
				callback(error);
				return;
			}

			callback(null, access_token, access_secret);
		});
	};

	/**
	 * This method performs a raw API request to the API. The third party developer shouldn't need to have to call this.
	 * @param method string The HTTP method (GET, POST, PUT, DELETE)
	 * @param endpoint string The URL endpoint (everything past /rest/)
	 * @param body The request body (used for POST and PUT requests)
	 * @param callback The function to be executed when the request is complete
	 */
	self.rawRequest = function(method, endpoint, body, access_token, access_secret, callback) {
		// TODO: Currently only works with get requests, ignoring body
		self.oauth[method](url_api + endpoint,
			access_token, access_secret,
			function (error, data, response) {
				if (error) {
					// Request Error
					callback(error);
					return;
				}

				try {
					var parsed_response = JSON.parse(data);
				} catch (parse_error) {
					// Parse Error
					callback(parse_errore);
				} finally {
					callback(null, parsed_response, 200); // TODO: Get real status code
				}
			}
		);
	};

	/**
	 * Function to grab user information
	 * @param access_token string
	 * @param access_secret string
	 * @param callback function
	 */
	self.getUser = function(access_token, access_secret, callback) {
		self.rawRequest('get', 'user', null, access_token, access_secret, callback);
	};
};

module.exports = new CopyApi();
