var fs = require('fs');
var extend = require('node.extend');

module.exports = function (configName, defaultObject, options) {
	try {
		var fileName = './config/' + configName + '.json';
		
		if (options && options.rereadOnlyIfChanged) {
			var mtime = fs.statSync(fileName).mtime;
			if (mtime == options.knownMTime)
				return null;
			options.knownMTime = mtime;
		}

		var content = fs.readFileSync(fileName, 'utf8');
		// possible bom
		content = content.replace(/^\uFEFF/, '');
		var configObject = JSON.parse(content);
		return extend(defaultObject || {}, configObject);
	}
	catch (ex) {
		logger && logger.error('Error in config ' + configName + ': ' + ex);
		
		if (options && options.muteErrors)
			return options.returnNullInCaseError ? null : defaultObject;
		throw ex;
	}
};

// logger use us, so, instantiante it after exports
var logger = require('./logHelper.js').getLogger('configReader');
