'use strict';

var
Deferred = require('promised-io/promise').Deferred,
Client = require('promised-io/http-client').Client,
request = require('request'),
sha1 = require('sha1'),
md5 = require('md5-jkmyers'),
// cw = require('catiline'),
worker;

/* global importScripts */
function _startWorker() {
	worker = cw({
		fingerprint: function(options, cb) {
			importScripts('sha1');
			importScripts('md5-jkmyers');

			util.fingerprint(options.data).then(cb);
		}
	});
}

var util = {

	apiHost: 'https://api.copy.com',

    /**
     * Generate the HTTP headers need for a given Cloud API method.
     *
     * @param  string $method API method
     *
     * @return array  contains headers to use for HTTP requests
     */
	getHeaders: function(method) {
        var headers = {};
        if (method == 'has_object_parts_v2' || method == 'send_object_parts_v2' || method == 'get_object_parts_v2') {
            headers['Content-Type'] = 'application/octet-stream';
        }

        headers['X-Api-Version'] = '1.0';
        headers['X-Client-Type'] = 'API';
        // FIXME: need to test this more fuzzily
        // headers['X-Client-Time'] = Date();

        return headers;
	},

    /**
     * Return which cloud API end point to use for a given method.
     *
     * @param  string $method API method
     *
     * @return string uri of endpoint without leading slash
     */
	getEndpoint: function(method) {
        if (method == 'has_object_parts_v2' || method == 'send_object_parts_v2' || method == 'get_object_parts_v2') {
	        return 'jsonrpc_binary';
        } else {
            return 'jsonrpc';
        }
	},

    /**
     * Create and execute https request to send data.
     *
     * @param  string  $method         API method
     * @param  string  $data           raw request
     * @param  boolean $decodeResponse true to decode response
     *
     * @return mixed  result from https
     */
    post: function() {
    	if (typeof XMLHttpRequest === 'undefined')
	    	return util.postNode.apply(this, arguments);
	    else
	    	throw new Error('No network implementation');
    },
	postNode: function(method, data, decodeResponse, isTest) {
		var
		deferred = new Deferred(),
		options = {
			method: 'POST',
			headers: util.getHeaders(method),
			url: util.apiHost + '/' + util.getEndpoint(method),
			body: data,
		};

		// for testing
		if (isTest) {
			return { options: options };
		} else {
		    request(options, function(error, response, body) {
				if (error) {
					deferred.reject(error);
				} else {
					if (decodeResponse) {
						deferred.resolve(util.decodeResponse(body));
					} else {
						deferred.resolve(body);
					}
				}
			});

		    return deferred.promise;
		}
	},
    postNodeStream: function() {
		    	
    },



	/**
	 * JSON encode request data.
	 *
	 * @param  string method Cloud API method
	 * @param  array  json   contains data to be encoded
	 *
	 * @return string JSON formatted request body
	 */
	encodeRequest: function(method, json) {
		var
		request = {
	        jsonrpc: '2.0',
	        id: 0,
	        method: method,
	        params: json
		};

		return JSON.stringify(request).replace('\\/','/');
	},

	/**
	 * Decode a JSON response.
	 *
	 * @param string $response JSON response
	 *
	 * @return array JSON decoded string
	 */
	decodeResponse: function(response)
	{
	    var result = JSON.parse(response);

	    if (result.error) {
	        throw new Error('Error: ' + result.error.message, result.error.code);
	    }

	    return result;
	},

	/**
	 * Generate the fingerprint for a string of data.
	 *
	 * @param string data Data part to generate the fingerprint for.
	 *
	 * @return string Fingerprint for data.
	**/
	fingerprint: function(data, async) {
		// doesn't work quite yet
		if (async) {
			// var deferred = new Deferred();
			// setTimeout(function() {
			// 	deferred.resolve(md5(data) + sha1(data));
			// }, 500);
			// return deferred.promise;
			if (!worker) _startWorker();
			return worker.fingerprint(data);
		} else {
			return md5(data) + sha1(data);
		}
	}
};

exports.Util = util;