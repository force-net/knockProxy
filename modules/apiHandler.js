var logger = require('./logHelper.js').getLogger('sendEmail');
var configReader = require('./configReader.js');
var clientBinder = require('./clientBinder.js');
var querystring = require('querystring');
var extend = require('node.extend');

var processRequest = function (query, request, response) {
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
		var result = clientBinder.checkClientAndMakeBinding(postData, request.connection.remoteAddress, request.socket.localAddress);
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.write(JSON.stringify({ isSuccess: result != null, binding: result }));
		response.end();
	}
	
	if (postData.action == 'salt') {
		var salt = clientBinder.getSalt(request.connection.remoteAddress);
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
			processRequest(queryData, request, response);
		});

		return true;
	}
}