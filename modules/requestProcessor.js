// highlight fix
if (!require) require = function() {};

var logger = require('./logHelper.js').getLogger('request');

var fs = require('fs');
var mime = require('mime');
var http = require('http');
var url = require('url');
var configReader = require('./configReader.js');

var config = configReader('server', {
	baseSitePath: './site',
	fileHandlers: ['staticFile'],
	defaultIndexPageNames: ['index', 'default'],
	defaultIndexPageExtensions: ['.html', '.htm'],
	forbiddenPathPattern: '(\\.svn|\\.git)|(\\.(config|php|aspx|cshtml)$)$'
});

module.exports.create = function () {
	
	var dynamicEngines = [require('./apiHandler.js')];
	var physicalEngines = [require('./staticFileHandler.js')];
	var defaultIndexPages = config.defaultIndexPageNames;
	var defaultExtensions = config.defaultIndexPageExtensions;
	var forbiddenPathPattern = config.forbiddenPathPattern;
	var baseSitePath = config.baseSitePath;

	var groupedIndexPages = [];
	defaultIndexPages.forEach(function(a1) {
		defaultExtensions.forEach(function (a2) {
			groupedIndexPages.push(a1 + a2);
		});
	});
	
	var findExistingDirLikeFile = function(path) {
		var pathB = path == '/' ? path : path.substring(0, path.length - 1); // removing trailing slash

		var validPage = null;

		// /someurl/ -> someurl/index.html
		groupedIndexPages.some(function (p) {
			var p2 = path + p;
			if (fs.existsSync(p2)) {
				validPage = p2;
				return true;
			}
			return false;
		});

		if (validPage != null) return validPage;

		// /someurl/ -> someurl.html
		if (path != pathB) {
			defaultExtensions.some(function (p) {
				var p2 = pathB + p;
				if (fs.existsSync(p2)) {
					validPage = p2;
					return true;
				}
				return false;
			});
		}

		return validPage;
	};

	var validateUrl = function(reqUrl, callback) {
		var requestUrl = url.parse(reqUrl);
		if (requestUrl == null || requestUrl.path == null) {
			callback(null);
			return;
		}
		
		var urlPath = requestUrl.pathname;
	
		if (/\.\./.test(urlPath)) {
			callback(null);
			return;
		}
		
		if (new RegExp(forbiddenPathPattern).test(urlPath)) {
			callback(null);
			return;
		}

		var path = baseSitePath + urlPath;
		
		var isDirLikePath = path[path.length - 1] == '/';
		if (isDirLikePath) {
			var validPath = findExistingDirLikeFile(path);
			callback(validPath);
			return;
		}

		var isExists = fs.existsSync(path);

		if (isExists && fs.statSync(path).isFile()) {
			callback(path);
			return;
		}
		// trying to test path like /somepath -> /somepath/index.html
		var validPath2 = findExistingDirLikeFile(path + '/');
		if (validPath2) {
			callback(validPath2);
			return;
		}
		// not found
		callback(null);
	};

	var defaultErrorHandler = function(errorCode, response) {
		response.writeHead(errorCode, { 'Content-Type': mime.lookup('html') });
		response.write('<html>' + errorCode + '</html>');
		response.end();
	};

	var process = function (request, response, errorHandler) {
		try {
			logger.debug('New request ' + request.url);
			var isProcessedDynamic = dynamicEngines.some(function (engine) {
				return engine.process(request, response);
			});

			if (isProcessedDynamic) {
				logger.debug('Processed as dynamic ' + request.url);
				return;
			}

			validateUrl(request.url, function (physPath) {
				try {
					if (physPath != null) {
						logger.debug('Treated as file ' + request.url + ' ' + physPath);
						var isProcessed = physicalEngines.some(function (engine) {
							return engine.process(request, response, physPath);
						});

						if (isProcessed) {
							logger.debug('Processed as static ' + request.url);
							return;
						}

						logger.warn('No physical handlers for ' + request.url);
						errorHandler(500);
					} else {
						logger.warn('Not found related for ' + request.url);
						errorHandler(404);
					}
				} catch (ex1) {
					logger.error("Error in request processing: " + ex1);
					errorHandler(500);
				}
			});
		} catch (ex) {
			logger.error("Error in request: " + ex);
			errorHandler(500);
		}
	};

	return function (request, response) {
		process(request, response, function(errorCode) {
			// on error, trying to return error pages
			request.url = '/' + errorCode;
			process(request, response, function(/*errorCode2*/) {
				// on second error trying to return basic error page
				request.url = '/error';
				process(request, response, function (/*errorCode3*/) {
					// on third error returning base page
					defaultErrorHandler(errorCode, response);
				});
			});
		});
	};
};

