/* global fetch:false */
'use strict';

require('isomorphic-fetch');
const fs = require('fs-extra');
const path = require('path');
const sqlite = require('sqlite');
const url = 'https://raw.githubusercontent.com/zotero/zotero/master/resource/schema/system.sql';
const dstFile = path.join(__dirname, '..', 'index.js');

const addToMappings = (row, mappings) => {
	const { typeName, base, target } = row;
	if(!(typeName in mappings)) {
		mappings[typeName] = {};
	}
	mappings[typeName][base] = target;
};

(async () => {
	const db = await sqlite.open(':memory:');
	const mappings = {};

	let counter = 0;
	let systemSQL = '';
	try {
		systemSQL = await (await fetch(url)).text();
	} catch(e) {
		console.error(`Failed to download sql file from ${url}: ${e}`);
		return;
	}
	await db.exec(systemSQL);
	await db.each(`
		SELECT itemTypes.typeName, fields.fieldName as base, fieldsMapped.fieldName as target FROM baseFieldMappings
		LEFT JOIN itemTypes ON baseFieldMappings.itemTypeID = itemTypes.itemTypeID
		LEFT JOIN fields ON baseFieldMappings.baseFieldID = fields.fieldId
		LEFT JOIN fields as fieldsMapped ON baseFieldMappings.fieldID = fieldsMapped.fieldId`, (err, row) => {
			addToMappings(row, mappings);
			counter++;
	});

	db.close();
	const output = `module.exports = Object.freeze(${JSON.stringify(mappings)});`;
	await fs.writeFile(dstFile, output);
	console.info(`${counter} base mappings have been saved to ${dstFile}`);
})();
