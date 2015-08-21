var fs = require('fs');
var util = require('util');
var mime = require('mime');
var configReader = require('./configReader.js');

var config = configReader('server');
var cachePeriod = config.cacheStaticFiles || 0;

// TODO: gzip and deflate

module.exports = {
	process: function (request, response, physicalPath) {
		fs.stat(physicalPath, function (err, stat) {
			var headers = { 'Content-Type': mime.lookup(physicalPath) };
			var mtime = stat.mtime;
			mtime.setMilliseconds(0);
			headers['Last-Modified'] = stat.mtime.toGMTString();

			if (cachePeriod) {
				headers['Cache-Control'] = cachePeriod < 0 ? 'no-cache' : 'max-age=' + cachePeriod;
			}

			var writeResponse = function () {
				response.writeHead(200, headers);
				fs.createReadStream(physicalPath).pipe(response);
			};


			var requestModified = request.headers['if-modified-since'];
			if (requestModified) {
				var requestModifiedDate = null;
				try { requestModifiedDate = new Date(requestModified); } catch (ex) { }

				if (requestModifiedDate >= stat.mtime) {
					// not modified
					writeResponse = function() {
						response.writeHead(304, headers);
						response.end();
					};
				}
			}

			writeResponse();
		});
		
		return true;
	}
}