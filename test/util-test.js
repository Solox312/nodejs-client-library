/*jshint node:true */
'use strict';

var vows = require('vows'),
    assert = require('assert'),
    util = require('../lib/util').Util;

vows.describe('Utility Functions').addBatch({
	'When using the post function': {
		topic: util,
		'we get expected response from an API post': function(topic) {
			assert.deepEqual(topic.post('update_objects', { derp: 1 }, false, true),
				{
					options: {
				        method: 'POST',
				        headers: topic.getHeaders('update_objects'),
				        url: topic.apiHost + '/jsonrpc',
				        body: { derp: 1 }
					}
				}
			);
		}
	},
	'When using the getHeaders function': {
		topic: util,
		'we get expected headers for a normal method': function (topic) {
			assert.deepEqual(topic.getHeaders('update_objects'),
				{ 'X-Api-Version': '1.0', 'X-Client-Type': 'API' });
		},
		'we get expected headers for send_object_parts_v2': function (topic) {
			assert.deepEqual(topic.getHeaders('send_object_parts_v2'),
				{ 'X-Api-Version': '1.0', 'X-Client-Type': 'API', 'Content-Type': 'application/octet-stream' });
		}
	},
	'When using the getEndpoint function': {
		topic: util,
		'we get expected headers for a normal method': function (topic) {
			assert.equal(topic.getEndpoint('update_objects'),
				'jsonrpc');
		},
		'we get expected headers for send_object_parts_v2': function (topic) {
			assert.equal(topic.getEndpoint('send_object_parts_v2'),
				'jsonrpc_binary');
		}
	},
    'When using the encodeRequest function': {
        topic: util,
        'we get a valid JSON from a method and params': function (topic) {
            assert.equal(topic.encodeRequest('do_thing', { key1: 'value1', key2: 'value2' }),
            	'{"jsonrpc":"2.0","id":0,"method":"do_thing","params":{"key1":"value1","key2":"value2"}}');
        },
        'we get a valid JSON from a method no params': function (topic) {
            assert.equal(topic.encodeRequest('do_thing', {}),
            	'{"jsonrpc":"2.0","id":0,"method":"do_thing","params":{}}');
        }

    },
    // 'When using the decodeResponse function': {
    //     topic: util,
    //     'we get a valid object from an API response': function (response) {
    //         assert.equal(util.encodeRequest(method, params),
    //         	'');
    //     }
    // },
    'When using the fingerprint function': {
        topic: util,
        'we get the expected fingerprint from a 0-byte string': function(topic) {
            assert.equal(topic.fingerprint(''),
            	'd41d8cd98f00b204e9800998ecf8427eda39a3ee5e6b4b0d3255bfef95601890afd80709');
        },
        'we get the expected fingerprint from an 8-byte string': function(topic) {
            assert.equal(topic.fingerprint('starlord'),
	        	'208ab3ac7222c0b11f04b8a9193c6713ce0487f2852a2a7df0a6617fd011f4debe47fe3e');
        },
    }
	// 'When using the fingerprint function asynchronously (in a web worker)': {
	// 	topic: function() {
	// 		util.fingerprint('starlord', true).then(this.callback);
	// 	},
	// 	'we get the expected fingerprint asynchronously from an 8-byte string': function(topic) {
	// 		assert.equal(topic,
	// 			'208ab3ac7222c0b11f04b8a9193c6713ce0487f2852a2a7df0a6617fd011f4debe47fe3e');
	// 	},
	// },

}).export(module);