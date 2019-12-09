#!/usr/bin/env node

let PSD = require('psd.js');
let fs = require('fs');
let path = require('path');

// console.log(process.argv[2]);

const filename = process.argv[2];
const dest = path.join(path.normalize(path.dirname(filename)), path.basename(filename, path.extname(filename)));

if (!fs.existsSync(filename)) {
	console.error('File not found');
	process.exit(1);
}
if (!fs.existsSync(dest)) {
	fs.mkdirSync(dest);
}

let data = fs.readFileSync(filename);
let psd = new PSD(data);
psd.parse();
let psdc = psd.tree();

async function exportpsd(psdc, res={}, pt='') {
	for(let ch of psdc.children()) {
		if (ch.childless()) {
			res[ch.name]=1;
			const p = path.join(dest, pt);
			if (!fs.existsSync(p)) {
				fs.mkdirSync(p);
			}
			// console.log(path.join(p, `${ch.name}.png`));
			await ch.layer.image.saveAsPng(path.join(p, `${ch.name}.png`));
			console.log(path.join(p, `${ch.name}.png`));
			// process.exit();
		}
		else {
			res[ch.name]=(await exportpsd(ch, {}, path.join(pt, ch.name)));
		}
	}
	return res;
}


exportpsd(psdc);

