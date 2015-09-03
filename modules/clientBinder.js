var configReader = require('./configReader.js');
var net = require('net');
var serverConfig = configReader('server', { maxBindTime: 120, maxReconnectCount: 5, tcpHostName: 'unknown' });
var crypto = require('crypto');

var clients = configReader('clients', []);
var bindings = [];

var logger = require('./logHelper.js').getLogger('binder');

var clientSalts = {};

var clients = [];

var readConfigOptions = { muteErrors: true, rereadOnlyIfChanged: true, returnNullInCaseError: true, defaultIfNotReread: new Object() };
var refreshClients = function () {
	var newClients = configReader('clients', [], readConfigOptions);
	if (newClients != null) {
		if (newClients !== readConfigOptions.defaultIfNotReread) {
			newClients.forEach(function(e) {
				if (e.password && !e.passwordHash)
					e.passwordHash = calcHash(e.password, '');
				if (e.target) {
					var split = e.target.split(':');
					e.targetHost = split[0];
					e.targetPort = split[1];
				}
			});
			clients = newClients;
			logger.info('Known client list is updated');
		}
	} else {
		logger.error('Known client list is not updated (error in config?)');
	}
};

var getBinding = function (remoteIp) {
	var clientByIp = clients.first(function (e) { return !e.login && e.sourceIp && e.sourceIp == remoteIp; });
	if (clientByIp) {
		return { host: clientByIp.targetHost, port: clientByIp.targetPort, login: clientByIp.sourceIp };
	}

	var now = new Date();
	// filtering only valid
	bindings = bindings.filter(function(b) {
		if (b.connectionCount >= serverConfig.maxReconnectCount)
			return false;
		if (now - b.date > serverConfig.maxBindTime * 1000)
			return false;
		return true;
	});

	var found = bindings.first(function(b) { return b.ip == remoteIp; });

	if (found != null) {
		found.connectionCount++;
		return { host: found.client.targetHost, port: found.client.targetPort, login: found.client.login };
	}

	return null;
};

var calcHash = function(p, s) {
	var r = p + s;
	var hash = crypto.createHash('sha256');
	hash.update(r);
	return hash.digest('hex');
};

var checkClientAndMakeBinding = function(data, remoteIp, localIp) {
	var storedSalt = clientSalts[remoteIp];
	delete clientSalts[remoteIp];

	if (data.salt != storedSalt)
		return null;

	refreshClients();

	var client = clients.first(function(c) {
		if (c.login == data.login && (!c.sourceIp || c.sourceIp == remoteIp)) {
			if ((data.password || '').toString().toLowerCase() == calcHash(c.passwordHash, data.salt).toLowerCase()) {
				return true;
			}
		}
		return false;
	});
	
	if (client) {
		makeBinding(remoteIp, client);
		logger.info('Created binding for ' + remoteIp + ', ' + data.login);
		return {
			displayData: (serverConfig.tcpDisplayHost || localIp) + ':' + serverConfig.tcpPort,
			bindTime: serverConfig.maxBindTime
		};
	} else {
		logger.warn('Invalid login/password for ' + remoteIp + ', ' + (data.login || '(empty login)'));
		return null;
	}
};

var makeBinding = function (remoteIp, client) {
	// removing old bindings
	bindings = bindings.filter(function (e) { return e.login != client.login; });
	bindings.push({ ip: remoteIp, date: new Date(), connectionCount: 0, client: client });
};

var getSalt = function(remoteIp) {
	var salt = crypto.pseudoRandomBytes(15).toString('base64');
	clientSalts[remoteIp] = salt;
	return salt;
};

refreshClients();
module.exports = {
	getBinding: getBinding,
	checkClientAndMakeBinding: checkClientAndMakeBinding,
	getSalt: getSalt
};

if (!Array.prototype.first)
	Array.prototype.first = function(callback) {
		for (var i = 0; i < this.length; i++) {
			if (callback(this[i], i))
				return this[i];
		}
		return null;
	};
