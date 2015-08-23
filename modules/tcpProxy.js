var configReader = require('./configReader.js');
var net = require('net');
var clientBinder = require('./clientBinder.js');

var serverConfig = configReader('server', { tcpPort: 8222 });

var logger = require('./logHelper.js').getLogger('proxy');

var server = net.createServer(function (remoteClient) { //'connection' listener
	var remoteIp = remoteClient.remoteAddress;
	logger.info('Client connected: ' + remoteIp);
	var binding = clientBinder.getBinding(remoteIp);
	var client = null;

	remoteClient.on('error', function () { });
	remoteClient.on('end', function () { client && client.destroy(); logger.info('Client disconnected: ' + remoteIp); });

	if (binding == null) {
		logger.warn('No binding for client: ' + remoteIp);
		remoteClient.destroy();
	} else {
		client = net.createConnection(binding, function() { //'connect' listener
			logger.info('Created pipe for client: ' + remoteIp);
			client.pipe(remoteClient).pipe(client);
		});
		client.on('error', function() { });
		client.on('close', function () { remoteClient.destroy(); logger.info('Client disconnected: ' + remoteIp); });
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
