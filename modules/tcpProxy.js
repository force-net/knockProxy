var configReader = require('./configReader.js');
var net = require('net');
var clientBinder = require('./clientBinder.js');

var serverConfig = configReader('server', { tcpPort: 8222, connectionLimit: 1 });

var logger = require('./logHelper.js').getLogger('proxy');

var noop = function() {
};

var currentConnections = {};

var server = net.createServer(function (remoteClient) { //'connection' listener
	var remoteIp = remoteClient.remoteAddress;
	var binding = clientBinder.getBinding(remoteIp);
	var client = null;
	var logBindingSuffix = (binding == null ? '' : ' (' + binding.login + ')');
	logger.info('Client has connected: ' + remoteIp + logBindingSuffix);

	var logDisconnected = function () {
		logDisconnected = noop;
		logger.info('Client has disconnected: ' + remoteIp + logBindingSuffix);
	};

	remoteClient.on('error', noop);
	remoteClient.on('close', function () { client && client.end(); logDisconnected(); });

	if (binding == null) {
		logger.warn('No binding for client: ' + remoteIp);
		remoteClient.destroy();
	} else {
		var connectionLimit = binding.client.connectionLimit || serverConfig.connectionLimit;
		if (connectionLimit > 0) {
			if (currentConnections[remoteIp] && currentConnections[remoteIp] >= connectionLimit) {
				logger.warn('Client is connected already. Blocking ' + logBindingSuffix);
				remoteClient.destroy();
				return;
			}
			
			currentConnections[remoteIp] = (currentConnections[remoteIp] || 0) + 1;
		}
		
		client = net.createConnection(binding, function () { //'connect' listener
			logger.info('Pipe is created: ' + remoteIp + ' <-> ' + binding.host + ':' + binding.port + logBindingSuffix);
			client.pipe(remoteClient).pipe(client);
		});
		client.on('error', noop);
		client.on('close', function () {
			if (currentConnections[remoteIp]) {
				if (!--currentConnections[remoteIp])
					delete currentConnections[remoteIp];
			}
			
			remoteClient.end();
			logDisconnected();
		});
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
