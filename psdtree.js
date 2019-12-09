#!/usr/bin/env node

let PSD = require('psd.js');
var treeify = require('treeify');
let fs = require('fs');
let path = require('path');

// console.log(process.argv[2]);

const filename = process.argv[2];

if (!fs.existsSync(filename)) {
	console.error('File not found');
	process.exit(1);
}

let data = fs.readFileSync(filename);
let psd = new PSD(data);
psd.parse();

// console.log(psd.tree());

let psdc = psd.tree();

function readpsd(psdc, res={}) {
	for(let ch of psdc.children()) {
		if (ch.childless()) {
			res[ch.name]=1;
		}
		else {
			res[ch.name]=(readpsd(ch));
		}
	}
	return res;
}

console.log(path.basename(filename));
console.log(
	treeify.asTree(readpsd(psdc), false)
);

