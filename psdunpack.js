#!/usr/bin/env node

let PSD = require('psd.js');
let fs = require('fs');
let path = require('path');

// console.log(process.argv[2]);

const filename = process.argv[2];
const psdname = path.basename(filename, path.extname(filename));
const dest = path.join(path.normalize(path.dirname(filename)), psdname);
const template = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>{psdname}</title>
</head>
<body onload="load()">
	<div class="layers">
		{layers}
	</div>
	<div class="layers_list">
		{list}
	</div>

	<style>
		html, body {
			background-color: #8db1da;
			padding: 0px;
			margin: 0px;
			user-select: none;
			overflow: hidden;
			box-sizing: border-box;
			font-family: sans-serif;
		}
		.layers {
			overflow: hidden;
			position: absolute;
			width: 4841px;
			height: 2732px;
		}
		.layers img {
			position: absolute;
			pointer-events: none;
			border: 1px solid transparent;
		}

		.layers_list {
			width: 200px;
			height: 100%;
			position: fixed;
			z-index: 9999;
			top: 0px;
			right: 0px;
			background-color: lightgray;
			overflow: scroll;
			font-size: 10px;
		}

		.layers_list .level1 {
			margin-left: 15px;
		}

		.layers_list .level2 {
			margin-left: 30px;
		}

		img.selected {
			border: 3px solid red;
			margin-top: -2px;
			margin-left: -2px;
			z-index: 2000 !important;
		}
		img.hide {
			visibility: hidden;
		}

		img.hover {
			z-index: 3000 !important;
			filter: brightness(1.4);
		}

		a.selected {
			background-color: gray;
		}
	</style>
	<script>
		let down = false;
		const psdname='{psdname}';
		let selected = '';
		// let camerax = 0;
		// let cameray = 0;
		let psdwidth = 4841;
		let psdheight = 2732;

		document.addEventListener('mousedown', e=>{
			for(const cl of e.target.className.split(' ')) if (['level1', 'level2', 'layers_list', 'visibility'].includes(cl)) return;
			down = true;
		})

		document.addEventListener('mousemove', e=>{
			if (!down) return;
			for(const cl of e.target.className.split(' ')) if (['level1', 'level2', 'layers_list', 'visibility'].includes(cl)) return;
			const z = parseFloat(document.querySelector('.layers').style.zoom) || 1;
			const layer = document.querySelector('.layers');
			const camerax = (parseFloat(layer.style.left) || 0)+e.movementX / z;
			const cameray = (parseFloat(layer.style.top) || 0)+e.movementY / z;
			layer.style.left=\`\${camerax}px\`;
			layer.style.top=\`\${cameray}px\`;
		})

		document.addEventListener('mouseup', e=>{
			if (!down) return;
			for(const cl of e.target.className.split(' ')) if (['level1', 'level2', 'layers_list', 'visibility'].includes(cl)) return;
			down = false;
			save();
		})

		document.addEventListener('mousewheel', e=>{
			for(const cl of e.target.className.split(' ')) if (['level1', 'level2', 'layers_list', 'visibility'].includes(cl)) return;
			const z = parseFloat(document.querySelector('.layers').style.zoom) || 1;
			document.querySelector('.layers').style.zoom = z - e.deltaY/1000;
			save();
		})

		document.querySelectorAll('.level1, .level2').forEach(a=>{
			a.addEventListener('mouseenter', e=>{
				const classname = e.target.dataset['class'];
				if (classname) {
					document.querySelectorAll('.hover').forEach(i=>i.classList.remove('hover'));
					document.querySelectorAll(\`.\${classname}\`).forEach(i=>i.classList.add('hover'));
				}
			})
			a.addEventListener('mouseleave', e=>{
				document.querySelectorAll('.hover').forEach(i=>i.classList.remove('hover'));
			})
		})

		document.querySelectorAll('input').forEach(i=>{
			i.addEventListener('change', e=>{
				const classname = e.target.dataset['class'];
				if (!e.target.checked) {
					document.querySelectorAll(\`.\${classname}\`).forEach(i=>i.classList.add('hide'));
					document.querySelectorAll(\`.visibility.\${classname}\`).forEach(i=>i.checked = false);
				}
				else {
					document.querySelectorAll(\`.\${classname}\`).forEach(i=>i.classList.remove('hide'));
					document.querySelectorAll(\`.visibility.\${classname}\`).forEach(i=>i.checked = true);
				}
			})
		})

		function save() {
			const layer = document.querySelector('.layers');
			const data = {
				scrollX: parseFloat(layer.style.left) || 0,
				scrollY: parseFloat(layer.style.top) || 0,
				zoom: parseFloat(document.querySelector('.layers').style.zoom) || 1,
				selected
			}

			localStorage.setItem(psdname, JSON.stringify(data));
		}

		function load() {
			const data = JSON.parse(localStorage.getItem(psdname));
			if (data) {
				const layer = document.querySelector('.layers');
				layer.style.left=\`\${data.scrollX}px\`;
				layer.style.top=\`\${data.scrollY}px\`;
				document.querySelector('.layers').style.zoom = data.zoom;
				if (data.selected) show(data.selected);
			}
		}

		function show(name) {
			document.querySelectorAll('.selected').forEach(i=>i.classList.remove('selected'));
			document.querySelectorAll(\`.\${name}\`).forEach(i=>i.classList.add('selected'));
			selected = name;
		}

	</script>
</body>
</html>`;

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

	let out = template; //fs.readFileSync(path.join(path.dirname(process.argv[1]), 'psd.html.template')).toString();
	out = out.replace(/{layers}/g, layers);
	out = out.replace(/{list}/g, list);
	out = out.replace(/{psdname}/g, psdname);
	out = out.replace(/{psdwidth}/g, psd.image.width());
	out = out.replace(/{psdheight}/g, psd.image.height());
	fs.writeFileSync(path.join(dest, 'index.html'), out);
})();

