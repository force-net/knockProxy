var configReader = require('./configReader.js');
var net = require('net');
var clientBinder = require('./clientBinder.js');

var serverConfig = configReader('server', { tcpPort: 8222 });

var logger = require('./logHelper.js').getLogger('proxy');

var noop = function() {
};

var server = net.createServer(function (remoteClient) { //'connection' listener
	var remoteIp = remoteClient.remoteAddress;
	var binding = clientBinder.getBinding(remoteIp);
	var client = null;
	var logBindingSuffix = (binding == null ? '' : ' (' + binding.login + ')');
	logger.info('Client connected: ' + remoteIp + logBindingSuffix);

	var logDisconnected = function () {
		logDisconnected = noop;
		logger.info('Client disconnected: ' + remoteIp + logBindingSuffix);
	};

	remoteClient.on('error', noop);
	remoteClient.on('close', function () { client && client.destroy(); logDisconnected(); });

	if (binding == null) {
		logger.warn('No binding for client: ' + remoteIp);
		remoteClient.destroy();
	} else {
		client = net.createConnection(binding, function() { //'connect' listener
			logger.info('Created pipe: ' + remoteIp + ' <-> ' + binding.host + ':' + binding.port + logBindingSuffix);
			client.pipe(remoteClient).pipe(client);
		});
		client.on('error', noop);
		client.on('close', function () { remoteClient.destroy(); logDisconnected(); });
	}
});




var startServer = function() {
	server.listen(serverConfig.tcpPort, serverConfig.tcpHost, function () {});
};

var stopServer = function() {
	server.close();
};

module.exports = {
	start: startServer,
	stop: stopServer
};
