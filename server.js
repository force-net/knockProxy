var fs = require('fs');
var configReader = require('./modules/configReader.js');

var logHelper = require('./modules/logHelper.js');
var logger = logHelper.getLogger('server');

var serverConfig = configReader('server', { httpPort: 8221 });
var http = require('http');
var requestProcessor = require('./modules/requestProcessor.js');

require('./modules/tcpProxy.js').start();

var server = http.createServer(requestProcessor.create());

var port = serverConfig.httpPort;
var host = serverConfig.httpHost;
var listeningMessage = 'http://' + (host || '*') + ':' + port + '/';

var doChmod = false;

if (port == 'iis') {
	port = process.env.PORT;
	host = null;
	listeningMessage = port;
} else if (!/\d+/.test(port)) {
	// linux socket
	if (fs.existsSync(port)) {
		fs.unlinkSync(port);
	}
	host = null;
	listeningMessage = port;
	doChmod = true;
}

server.listen(port, host, function () {
	if (doChmod) {
		// we can be started from root, and nginx from www-data. so, nginx cannot perform proxying due lack of permissions
		fs.chmodSync(port, 666);
	}
	logger.info('Server running at ' + listeningMessage);
});

server.on('error', function (err) {
	if (err.code == "EADDRINUSE") {
		logger.fatal("Server already working at this port");
	} else {
		logger.fatal(err.code);
	}
});
