function nextMustacheTag(template: string) {
  let i = template.indexOf("{");
  // { expr } -> eval(expr)
  // {{ expr }} -> '{ expr }'
  if (i !== -1) {
    if (template[i + 1] === "{") {
      let j = template.indexOf("}}", i + 2);
      if (j !== -1) {
        return {
          head: template.slice(0, i),
          tail: template.slice(j + 2),
          raw: template.slice(i + 1, j + 1),
        };
      }
    }
    let j = template.indexOf("}", i + 1);
    if (j !== -1) {
      return {
        head: template.slice(0, i),
        tail: template.slice(j + 1),
        expr: template.slice(i + 1, j),
      };
    }
  }
}

function parse(template: string) {
  const parts = [];
  let indent_size = 4;
  function update_indent_size(raw: string) {
    const m = raw.match(/^ */);
    const l = m && m[0].length;
    l && (indent_size = Math.min(indent_size, l));
  }
  while (true) {
    const tag = nextMustacheTag(template);
    if (tag === undefined) {
      parts.push({ raw: template });
      update_indent_size(template);
      break;
    }
    parts.push({ raw: tag.head });
    update_indent_size(tag.head);
    if (tag.raw) {
      parts.push({ raw: tag.raw });
      update_indent_size(tag.raw);
    }
    if (tag.expr) {
      parts.push({ expr: tag.expr });
    }
    template = tag.tail;
  }
  // remove extra newline and indent from expr closures {#expr}...{/expr}
  let indent = 0;
  let last2: { raw?: string; expr?: string }[] = [{}, {}];
  for (const part of parts) {
    if (part.raw && indent) {
      part.raw = part.raw.trimStart().replace(new RegExp(`^ {${indent * indent_size}}`, "gm"), "");
    }
    if (part.expr && part.expr[0] === "#") {
      indent++;
      // remove extra space between {/last}...{#current}
      if (last2[0].expr && last2[0].expr[0] === "/" && last2[1].raw) {
        last2[1].raw = last2[1].raw.trimEnd();
      }
    }
    if (part.expr && part.expr[0] === "/") {
      indent--;
    }
    last2.push(part);
    last2.shift();
  }
  return parts;
}

export function compile(template: string, argument: string) {
  const parts = parse(template);
  let code = `let html = '';`;
  parts.forEach((p) => {
    if (p.raw) {
      code += `html += ${JSON.stringify(p.raw)};`;
    }
    if (p.expr) {
      // expr = ' site.title '
      // expr = '#each posts.slice(0, 20) as post'
      // expr = '#if post.title'
      // expr = '/each' '/if'
      // expr = '@const x = 1'
      if (p.expr.startsWith("#each")) {
        const expr = p.expr.slice(5).trim();
        const [list, x] = expr.split(" as ");
        code += `for (const ${x} of ${list}) {`;
      } else if (p.expr.startsWith("#if")) {
        const expr = p.expr.slice(3).trim();
        code += `if (${expr}) {`;
      } else if (p.expr.startsWith("#else if")) {
        const expr = p.expr.slice(8).trim();
        code += `} else if (${expr}) {`;
      } else if (p.expr.startsWith("/")) {
        code += "}";
      } else if (p.expr.startsWith("@")) {
        const expr = p.expr.slice(1).trim();
        code += `${expr};`;
      } else {
        code += `html += ${p.expr.trim()};`;
      }
    }
  });
  code += `return html;`;
  return new Function(argument, code);
}
