var log4js = require('log4js');
var configReader = require('./configReader.js');

var logConfig = configReader('log4js', {});
log4js.configure(logConfig);

var clonedLoggers = {};

var defaultCategory = 'server';

var createClonedLogger = function(originalLogger) {
	var fakeLogger = function () { };
	fakeLogger.prototype = originalLogger;

	['Trace', 'Debug', 'Info', 'Warn', 'Error', 'Fatal', 'Mark'].forEach(
		function (levelString) {
			var oldFunc = fakeLogger.prototype[levelString.toLowerCase()];
			fakeLogger.prototype[levelString.toLowerCase()] = function () {
				var args = Array.prototype.slice.call(arguments);
				args.unshift(this.name);
				oldFunc.apply(this, args);
			};
		});
	
	return fakeLogger;
};

module.exports = {
	getLogger: function (typeName, categoryName) {
		var logger = log4js.getLogger(categoryName || defaultCategory);

		if (typeName) {
			var fakeLogger = clonedLoggers[logger] || (clonedLoggers[logger] = createClonedLogger(logger));
			var newLogger = new fakeLogger();
			newLogger.name = typeName + ' -';
			return newLogger;
		}

		return logger;
	}
}