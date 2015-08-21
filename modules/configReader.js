var fs = require('fs');
var extend = require('node.extend');

module.exports = function(configName, defaultObject) {
	var content = fs.readFileSync('./config/' + configName + '.json', 'utf8');
	// possible bom
	content = content.replace(/^\uFEFF/, '');
	var configObject = JSON.parse(content);
	return extend(defaultObject || {}, configObject);
};

