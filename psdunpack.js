#!/usr/bin/env node

let PSD = require('psd.js');
let fs = require('fs');
let path = require('path');

// console.log(process.argv[2]);

const filename = process.argv[2];
const psdname = path.basename(filename, path.extname(filename));
const dest = path.join(path.normalize(path.dirname(filename)), psdname);

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
let zindex = 0;

async function exportpsd(psdc, res={}, pt='') {
	for(let ch of psdc.children()) {
		if (ch.childless()) {
			const p = path.join(dest, pt);
			res[ch.name]={
				name: path.join(pt, `${ch.name}.png`),
				left: ch.left,
				top: ch.top,
				z: zindex++,
				visible: ch.visible()
			}
			if (!fs.existsSync(p)) {
				fs.mkdirSync(p);
			}
			await ch.layer.image.saveAsPng(path.join(p, `${ch.name}.png`));
			console.log(path.join(p, `${ch.name}.png`));
		}
		else {
			res[ch.name]=(await exportpsd(ch, {}, path.join(pt, ch.name)));
		}
	}
	return res;
}

function cssname(name) {
	return name.replace(/~/g, '--');
}

(async ()=>{
	let data = await exportpsd(psdc);
	let layers = "";
	let list = "";
	for (const groupname in data) {
		if (data.hasOwnProperty(groupname)) {
			const group = data[groupname];
			let tmp = [];
			list += `\t<input class="visibility" type="checkbox" data-class="${cssname(groupname)}" checked><a class="level1 ${cssname(groupname)}" data-class="${cssname(groupname)}" href="javascript:show('${groupname}')">${groupname}</a><br>\n`;
			for (const layername in group) {
				if (group.hasOwnProperty(layername)) {
					const layerdata = group[layername];
					const checked = layerdata.visible ? 'checked' : '';
					tmp.push(`<img class="${cssname(groupname)} ${cssname(layername)}" src="${layerdata.name}" title="${layername}" style="left:${layerdata.left}px; top:${layerdata.top}px; z-index:${1000-layerdata.z}" \>`);
					list += `\t\t<input class="visibility ${cssname(groupname)}" type="checkbox" data-class="${cssname(layername)}" ${checked}><a class="level2 ${cssname(groupname)} ${cssname(layername)}" data-class="${cssname(layername)}" href="javascript:show('${cssname(layername)}')">${layername}</a><br>\n`;
				}
			}
			layers += `\t${tmp.join('')}\n`;
		}
	}

	let out = fs.readFileSync(path.join(path.dirname(process.argv[1]), 'psd.html.template')).toString();
	out = out.replace(/{layers}/g, layers);
	out = out.replace(/{list}/g, list);
	out = out.replace(/{psdname}/g, psdname);
	out = out.replace(/{psdwidth}/g, psd.image.width());
	out = out.replace(/{psdheight}/g, psd.image.height());
	fs.writeFileSync(path.join(dest, 'index.html'), out);
})();

