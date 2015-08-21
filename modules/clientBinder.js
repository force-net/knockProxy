var configReader = require('./configReader.js');
var net = require('net');
var serverConfig = configReader('server', { maxBindTime: 120, maxReconnectCount: 5, tcpHostName: 'unknown' });
var crypto = require('crypto');

var clients = configReader('clients', []);
var bindings = [];

var logger = require('./logHelper.js').getLogger('binder');

var getBinding = function (remoteIp) {
	var found = null;
	var now = new Date();
	// filtering only valid
	bindings = bindings.filter(function(b) {
		if (b.connectionCount >= serverConfig.maxReconnectCount)
			return false;
		if (now - b.date > serverConfig.maxBindTime * 1000)
			return false;
		return true;
	});

	bindings.forEach(function(b) {
		if (b.ip == remoteIp) {
			found = b;
			return false;
		}
		return true;
	});
	
	if (found != null) {
		found.connectionCount++;
		var target = found.target;
		var split = target.split(':');
		return  { host: split[0], port: split[1] };
	}

	return null;
};

var calcHash = function(p, s) {
	var r = p + s;
	var hash = crypto.createHash('sha256');
	hash.update(r);
	return hash.digest('hex');
}

var checkClientAndMakeBinding = function(data, remoteIp) {
	var isSuccess = false;
	clients.forEach(function(c) {
		if (c.login == data.login) {
			if ((data.password || '').toString().toLowerCase() == calcHash(c.password, data.salt).toLowerCase()) {
				makeBinding(c.login, remoteIp, c.target);
				isSuccess = true;
				return false;
			}
		}

		return true;
	});

	if (isSuccess) {
		logger.info('Created binding for ' + remoteIp + ', ' + data.login);
		return serverConfig.tcpHostName + ':' + serverConfig.tcpPort;
	} else {
		logger.info('Invalid login/password for ' + remoteIp + ', ' + data.login);
		return null;
	}
};

var makeBinding = function (login, remoteIp, target) {
	// removing old bindings
	bindings = bindings.filter(function(e) { return e.login != login });
	bindings.push({ ip: remoteIp, date: new Date(), connectionCount: 0, target: target });
};

var getSalt = function() {
	return crypto.pseudoRandomBytes(15).toString('base64');
}

module.exports = {
	getBinding: getBinding,
	checkClientAndMakeBinding: checkClientAndMakeBinding,
	getSalt: getSalt
}
