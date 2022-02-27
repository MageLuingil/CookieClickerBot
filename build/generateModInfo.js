#!/usr/bin/env node
const package = require('../package.json');
const semver = require('semver');

const version = semver.parse(package.version);
if (version.build.length < 2) {
	console.error("Invalid game version number");
	return;
}

console.log(JSON.stringify({
	"Name": "Cookie Clicker Bot",
	"ID": "mageluingil cookie clicker bot",
	"Author": "MageLuingil",
	"Description": "Clicks the big cookie, and other things!",
	"ModVersion": Number(`${version.major}.${version.minor}`),
	"GameVersion": Number(version.build.slice(0,2).join('.')),
	"Date": (new Date).toLocaleDateString('en-GB'),
	"Dependencies": [],
	"Disabled": 1
}, null, "\t"));
