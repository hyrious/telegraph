class _token {
	constructor(head, tail, expr, raw) {
		this.head = head;
		this.tail = tail;
		this.expr = expr;
		this.raw = raw;
	}
}

function next_mustache_tag(str) {
	let i;
	let j;
	if ((i = str.indexOf('{')) >= 0) {
		if (str[i + 1] === '{') {
			if ((j = str.indexOf('}}', i + 2)) >= 0) {
				return new _token(str.slice(0, i), str.slice(j + 2), undefined, str.slice(i + 1, j + 1));
			}
		}

		if ((j = str.indexOf('}', i + 1)) >= 0) {
			return new _token(str.slice(0, i), str.slice(j + 1), str.slice(i + 1, j), undefined);
		}
	}
}

function s(str) {
	return JSON.stringify(str);
}

function expr(str) {
	if (str.startsWith('#if')) {
		return `if (${str.slice(3).trim()}) {\n`;
	}
	if (str.startsWith('#else')) {
		return '} else {\n';
	}
	if (str.startsWith('#else if')) {
		return `} else if (${str.slice(8).trim()}) {\n`;
	}
	if (str.startsWith('/if')) {
		return '}\n';
	}
	if (str.startsWith('#each')) {
		let [list, x] = str.slice(5).split(' as ');
		return `for (const ${x.trim()} of ${list.trim()}) {\n`;
	}
	if (str.startsWith('/each')) {
		return '}\n';
	}
	if (str.startsWith('@')) {
		return `const ${str.slice(1)}\n`;
	}
	return `html += ${str.trim()}\n`;
}

export function compile(name, str, arg) {
	let code = "let html = '';\n";
	while (true) {
		let tag = next_mustache_tag(str);
		if (tag) {
			code += `html += ${s(tag.head)};\n`;
			if (tag.raw) {
				code += `html += ${s(tag.raw)};\n`;
			}
			if (tag.expr) {
				code += expr(tag.expr);
			}
		} else {
			code += `html += ${s(str)};\n`;
			break;
		}
		str = tag.tail;
	}
	code += 'return html;';
	let render = new Function(arg, code);
	Object.defineProperty(render, 'name', { value: name });
	return render;
}
