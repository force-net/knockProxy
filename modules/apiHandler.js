var logger = require('./logHelper.js').getLogger('apiHandler');
var configReader = require('./configReader.js');
var clientBinder = require('./clientBinder.js');
var querystring = require('querystring');
var extend = require('node.extend');

// trust X-Forwarded-For - true, if we under proxy, otherwise set false due possibility of spoofing ip
var serverConfig = configReader('server', { trustXff: false });

var _getUserHost = function(request) {
	if (!serverConfig.trustXff)
		return request.connection.remoteAddress;
	var str = request.headers["x-forwarded-for"];
	if (str == null || str.length <= 0)
		return request.headers['x-real-ip'] || request.connection.remoteAddress;
	var length = str.indexOf(',');
	if (length > 0)
		str = str.substr(0, length) || '';

	// 1.2.3.4:5678 -> 1.2.3.4
	str = str.replace(/\:\d+$/, '');
	// [dead::beef] -> dead::beef (on tcp connect we have address without brackets)
	str = str.replace(/^\[(.+)\]$/, '$1');
	return str;
};

var _processRequest = function (query, request, response) {
	var postData = {};
	try {
		if (request.headers['content-type'].indexOf('application/json') == 0 && query)
			postData = JSON.parse(query);
		else
			postData = querystring.parse(postData);
	}
	catch (err) {
		logger.error(err);
	}
	
	if (postData.action == 'login') {
		var result = clientBinder.checkClientAndMakeBinding(postData, _getUserHost(request), request.socket.localAddress);
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.write(JSON.stringify({ isSuccess: result != null, binding: result }));
		response.end();
	}
	
	if (postData.action == 'salt') {
		var salt = clientBinder.getSalt(_getUserHost(request));
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.write(JSON.stringify({ salt: salt }));
		response.end();
	}

	response.writeHead(500, { 'Content-Type': 'text/html' });
	response.write('<html>500</html>');
	response.end();
};

module.exports = {
	process: function (request, response) {
		if (request.method != 'POST')
			return false;
		if (request.url.indexOf('/api') !== 0)
			return false;

		var queryData = '';

		request.on('data', function (data) {
			queryData += data;
			if (queryData.length > 1e6) {
				queryData = "";
				response.writeHead(413, { 'Content-Type': 'text/plain' }).end();
				request.connection.destroy();
			}
		});

		request.on('end', function () {
			_processRequest(queryData, request, response);
		});

		return true;
	}
}