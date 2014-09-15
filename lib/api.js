'use strict';

var
util = require('./util').Util,
Deferred = require('promised-io/promise').Deferred,
extend = require('extend'),
stream = require('stream'),
Readable = stream.Readable,
streamifier = require('streamifier'),
api = {

	/**
	 * Constructor
	 *
	 * @param string $consumerKey    OAuth consumer key
	 * @param string $consumerSecret OAuth consumer secret
	 * @param string $accessToken    OAuth access token
	 * @param string $tokenSecret    OAuth token secret
	 */
	// __construct: function($consumerKey, $consumerSecret, $accessToken, $tokenSecret) {}

	/**
	 * Upload a file from a string
	 *
	 * @param string $path full path containing leading slash and file name
	 * @param string $data binary data
	 *
	 * @return object described in createFile()
	 */
	uploadFromString: function(path, data) {
        return api.uploadFromStream(path, streamifier.createReadStream(data));
    },

	/**
	 * Upload a file from a stream resource
	 *
	 * @param string $path full path containing leading slash and file name
	 * @param resource $stream resource to read data from
	 *
	 * @return object described in createFile()
	 */
	uploadFromStream: function(path, stream) {
	    var PART_SIZE = 1048576, part, parts;

		while (part) {
			part = stream.read(PART_SIZE);
			parts.push(util.sendData(part));
		}

		return api.createFile('/' + path, parts);
	},

	/**
     * Read a file to a string
     *
     * @param string $path full path containing leading slash and file name
     *
     * @return array contains key of contents which contains binary data of the file
     */
    readToString: function($path) {
        var stream = util.readToStream($path);
        // $object['contents'] = stream_get_contents($object['stream']);
        // fclose($object['stream']);
        // unset($object['stream']);

        var output = '';

        stream.on('data', function(chunk) {
        	output += chunk.toString();
        });

        return output;
    },

    /**
     * Read a file to a stream
     *
     * @param string $path full path containing leading slash and file name
     *
     * @return array contains key of stream which contains a stream resource
     */
    readToStream: function(path) {
    	// create a readable stream
        var stream = new Readable();

        // obtain the list of parts for the file (should be an array of one)
        var files = util.listPath('/' . path, { include_parts: true });

		if (!files || files.length !== 1) {
			throw new Error('Could not find file at path: ' + path);
		}

        // found it, verify its a file
        var file = files.pop();
        if (file.type !== 'file') {
            throw new Error('Could not find file at path: ' + path);
        }

        // obtain each part and add it to the stream
        _.each(file.revisions[0].parts, function(part) {
        	var data = util.getPart(part.fingerprint, part.size);
        	stream.push(data);
        });

        return stream;
    },

	uploadFromDOMFile: function(file) {},

	/**
	 * Send a request to remove a given file.
	 *
	 * @param string $path full path containing leading slash and file name
	 *
	 * @return bool true if the file was removed successfully
	 */
	removeFile: function(path)
	{
		return api.updateObject('remove', path, { object_type: 'file' });
	},

	/**
	 * Send a request to remove a given dir.
	 *
	 * @param string $path full path containing leading slash and dir name
	 *
	 * @return bool true if the dir was removed successfully
	 */
	removeDir: function(path)
	{
		return api.updateObject('remove', path, { object_type: 'dir' });
	},

	/**
	 * Copy an item
	 *
	 * Object structure:
	 * {
	 *  object_id: "4008"
	 *  path: "/example"
	 *  type: "dir" || "file"
	 *  share_id: "0"
	 *  share_owner: "21956799"
	 *  company_id: NULL
	 *  size: filesize in bytes, 0 for folders
	 *  created_time: unix timestamp, e.g. "1389731126"
	 *  modified_time: unix timestamp, e.g. "1389731126"
	 *  date_last_synced: unix timestamp, e.g. "1389731126"
	 *  removed_time: unix timestamp, e.g. "1389731126" or empty string for non-deleted files/folders
	 *  mime_type: string
	 *  revisions: array of revision objects
	 * }
	 *
	 * @param string $source_path full path containing leading slash and file name
	 * @param string $destination_path full path containing leading slash and file name
	 *
	 * @return stdClass using structure as noted above
	 */
	copy: function(source_path, destination_path) {
		return api.updateObject('rename', source_path, { new_path: destination_path });
	},

	/**
	 * List objects within a path
	 *
	 * Object structure:
	 * {
	 *  object_id: "4008"
	 *  path: "/example"
	 *  type: "dir" || "file"
	 *  share_id: "0"
	 *  share_owner: "21956799"
	 *  company_id: NULL
	 *  size: filesize in bytes, 0 for folders
	 *  created_time: unix timestamp, e.g. "1389731126"
	 *  modified_time: unix timestamp, e.g. "1389731126"
	 *  date_last_synced: unix timestamp, e.g. "1389731126"
	 *  removed_time: unix timestamp, e.g. "1389731126" or empty string for non-deleted files/folders
	 *  mime_type: string
	 *  revisions: array of revision objects
	 * }
	 *
	 * @param  string $path              full path with leading slash and optionally a filename
	 * @param  array  $additionalOptions used for passing options such as include_parts
	 *
	 * @return array List of file/folder objects described above.
	 */
	listPath: function(path, additionalOptions) {
        var
        deferred = new Deferred(),
        list_watermark = false,
        output = [],
        request;

        // do {
        // var herp = function() {
            request = extend({
            	path: path,
            	max_items: 100,
            	list_watermark: list_watermark
			}, additionalOptions || {});

           util.post('list_objects', util.encodeRequest('list_objects', request), true).then(function(result) {
	            // add the children if we got some, otherwise add the root object itself to the return
	            if (result.result.children && result.result.children.length) {
	                output = extend(output, result.result.children);
	                list_watermark = result.result.list_watermark;
	            } else {
	                output.push(result.result.object);
	            }
	            deferred.resolve(output);
            });
       // };
        // } while (result.result.more_items);

        return deferred.promise;
	},

	/**
	 * Create a dir
	 *
	 * Object structure:
	 * {
	 *  object_id: "4008"
	 *  path: "/example"
	 *  type: "dir"
	 *  share_id: "0"
	 *  share_owner: "21956799"
	 *  company_id: NULL
	 *  size: filesize in bytes, 0 for folders
	 *  created_time: unix timestamp, e.g. "1389731126"
	 *  modified_time: unix timestamp, e.g. "1389731126"
	 *  date_last_synced: unix timestamp, e.g. "1389731126"
	 *  removed_time: unix timestamp, e.g. "1389731126" or empty string for non-deleted files/folders
	 * }
	 *
	 * @param string $path      full path containing leading slash and dir name
	 * @param bool   $recursive true to create parent directories
	 *
	 * @return object described above.
	 */
	createDir: function(path, recursive)
	{
		var request = {
			object_type: 'dir',
			recurse: (typeof recursive === 'undefined') || recursive,
		};

		return api.updateObject('create', path, request);
	},

	/**
	 * Create a file with a set of data parts
	 *
	 * Object structure:
	 * {
	 *  object_id: "4008"
	 *  path: "/example"
	 *  type: "file"
	 *  share_id: "0"
	 *  share_owner: "21956799"
	 *  company_id: NULL
	 *  size: filesize in bytes, 0 for folders
	 *  created_time: unix timestamp, e.g. "1389731126"
	 *  modified_time: unix timestamp, e.g. "1389731126"
	 *  date_last_synced: unix timestamp, e.g. "1389731126"
	 *  removed_time: unix timestamp, e.g. "1389731126" or empty string for non-deleted files/folders
	 *  mime_type: string
	 *  revisions: array of revision objects
	 * }
	 *
	 * @param string $path  full path containing leading slash and file name
	 * @param array  $parts contains arrays of parts returned by \Barracuda\Copy\API\sendData
	 *
	 * @return object described above.
	 */
	createFile: function(path, parts) {
        var request = {
        	object_type: 'file',
        	parts: []
        },
        offset = 0;

        for (var part in parts) {
        	request.parts.push({
        		fingerprint: part.fingerprint,
        		offset: offset,
        		size: part.size
        	});
			offset += part.size;
        }

        request.size = offset;

        return api.updateObject('create', path, request);
	},

	/**
	 * Send a piece of data
	 *
	 * @param  string $data    binary data
	 * @param  int    $shareId setting this to zero is best, unless share id is known
	 *
	 * @return array  contains fingerprint and size, to be used when creating a file
	 */
	sendData: function(data, shareId) {
		var
		deferred = new Deferred(),

		// generate a part hash
		fingerprint = util.fingerprint(data),
		part_size = data.length;

		// default shareid to 0
		shareId = shareId || 0;

		// see if the cloud has this part, and send if needed
		api.hasPart(fingerprint, part_size, shareId).then(function(result) {
			if (result) {
				api.sendPart(fingerprint, part_size, data, shareId).then(function() {
					// return information about this part
					deferred.resolve({ fingerprint: fingerprint, size: part_size });
				}, function() {
					throw new Error('Got an error from api.sendPart.');
				});
			}
		}, function() {
			throw new Error('Got an error from api.hasPart.');
		});

		return deferred.promise;
	},

	/**
	 * Send a data part
	 *
	 * @param string $fingerprint md5 and sha1 concatenated
	 * @param int    $size        number of bytes
	 * @param string $data        binary data
	 * @param int    $shareId     setting this to zero is best, unless share id is known
	 *
	 */
	sendPart: function(fingerprint, size, data, shareId) {
		var
		deferred = new Deferred(),
		request = {
			parts: [{
				share_id: shareId,
				fingerprint: fingerprint,
				size: size,
				data: 'BinaryData-0-' + size
			}]
		};

		// They must match
		if (util.fingerprint(data) !== fingerprint) {
			deferred.reject(new Error('Failed to validate part hash'));
		}

		util.post('send_object_parts_v2', this.encodeRequest('send_object_parts_v2', request) + String.fromCharCode(0) + data, true).then(function(result) {
			if (result.result.has_failed_parts) {
				deferred.reject(new Error('Error sending part: ' + result.result.failed_parts[0].message));
			} else {
				deferred.resolve(result);
			}
		});

		return deferred.promise;
	},

	/**
	 * Check to see if a part already exists
	 *
	 * @param  string $fingerprint md5 and sha1 concatenated
	 * @param  int    $size        number of bytes
	 * @param  int    $shareId     setting this to zero is best, unless share id is known
	 * @return bool   true if part already exists
	 */
	hasPart: function(fingerprint, size, shareId) {
		var
		deferred = new Deferred(),
		request = {
			parts: [
				{
					share_id: shareId,
					fingerprint: fingerprint,
					size: size
				}
			]
		};

		util.post('has_object_parts_v2', util.encodeRequest('has_object_parts_v2', request), true).then(function(result) {
			if (!result.result.needed_parts) {
				deferred.resolve(true);
			} else {
				var part = result.result.needed_parts[0];
				if (part.message) {
					deferred.reject(new Error('Error checking for part: ' + part.message));
				} else {
					deferred.resolve(false);
				}
			}
		});

		return deferred.promise;
	},

	/**
	 * Get a part
	 *
	 * @param  string $fingerprint md5 and sha1 concatinated
	 * @param  int    $size        number of bytes
	 * @param  int    $shareId     setting this to zero is best, unless share id is known
	 *
	 * @return string binary data
	 */
	getPart: function(fingerprint, size, shareId) {
		var
		deferred = new Deferred(),
		request = {
			parts: [
				{
					share_id: shareId,
					fingerprint: fingerprint,
					size: size
				}
			]
		};

		util.post('get_object_parts_v2', util.encodeRequest('get_object_parts_v2', request)).then(function(result) {
			var null_offset, binary, json, json_decoded;

			// Find the null byte
			null_offset = result.indexOf(String.fromCharCode(0));

			// Grab the binary payload
			binary = result.substr(null_offset + 1, result.length - null_offset);
			if (!binary) {
				deferred.reject(new Error('Error getting part data'));
				return;
			}

			// Grab the json payload
			json = (binary) ? result.substr(0, null_offset) : result;
			if (!json) {
				deferred.reject(new Error('Error getting part data'));
				return;
			}

			json_decoded = JSON.parse(json);

			// check for errors
			if (json_decoded.error) {
				deferred.reject(new Error('Error getting part data'));
				return;
			}

			if (json_decoded.result.parts[0].message) {
				deferred.reject(new Error('Error getting part data: ' + json_decoded.result.parts[0].message));
				return;
			}

			// Get the part data (since there is only one part the binary payload should just be the data)
			if (binary.length !== size) {
				deferred.reject(new Error('Error getting part data'));
			}

			deferred.resolve(binary);
		});
	},

	/**
	 * Update meta object
	 *
	 * Object structure:
	 * {
	 *  object_id: "4008"
	 *  path: "/example"
	 *  type: "dir" || "file"
	 *  share_id: "0"
	 *  share_owner: "21956799"
	 *  company_id: NULL
	 *  size: filesize in bytes, 0 for folders
	 *  created_time: unix timestamp, e.g. "1389731126"
	 *  modified_time: unix timestamp, e.g. "1389731126"
	 *  date_last_synced: unix timestamp, e.g. "1389731126"
	 *  removed_time: unix timestamp, e.g. "1389731126" or empty string for non-deleted files/folders
	 *  mime_type: string
	 *  revisions: array of revision objects
	 * }
	 *
	 * @param string $action
	 * @param string $path
	 * @param array $meta contains action, path, and other attributes of the object to update
	 *
	 * @return stdClass using structure as noted above
	 */
	updateObject: function(action, path, meta) {
		// Add action and path to meta
		meta.action = action;
		meta.path = path;

		return util.post('update_objects', util.encodeRequest('update_objects', { meta: [ meta ] }), true);
	}

};

exports.Copy = api;
