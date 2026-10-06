// A test-only XML 1.0 gate for the generated Moodle bank vocabulary. The bundled
// DOM parser repairs malformed input, so validate the original text before it.
// DTDs and custom entities are deliberately unsupported by this transport.
const name = "[A-Za-z_:][A-Za-z0-9_.:-]*";
function fail(message: string): never {
  throw Error(`XML well-formedness: ${message}`);
}
const legalCharacter = (code: number) =>
  code === 9 || code === 10 || code === 13 ||
  (code >= 0x20 && code <= 0xD7FF) || (code >= 0xE000 && code <= 0xFFFD) ||
  (code >= 0x10000 && code <= 0x10FFFF);

function entities(value: string) {
  for (let i = value.indexOf("&"); i !== -1; i = value.indexOf("&", i + 1)) {
    const end = value.indexOf(";", i + 1);
    if (end === -1) fail("unterminated entity");
    const entity = value.slice(i + 1, end);
    if (["amp", "lt", "gt", "apos", "quot"].includes(entity)) {
      i = end;
      continue;
    }
    if (!/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(entity)) {
      fail(`invalid entity &${entity};`);
    }
    const code = entity.startsWith("#x")
      ? Number.parseInt(entity.slice(2), 16)
      : Number(entity.slice(1));
    if (!legalCharacter(code)) fail("invalid numeric character entity");
    i = end;
  }
}

function attributes(source: string): Map<string, string> {
  const values = new Map<string, string>();
  while (source.length) {
    if (!/^[ \t\r\n]/.test(source)) fail("attributes require whitespace");
    source = source.replace(/^[ \t\r\n]+/, "");
    if (!source) break;
    const matched = source.match(
      new RegExp(`^(${name})[ \t\r\n]*=[ \t\r\n]*(["'])`),
    );
    if (!matched) fail("attribute must have a quoted value");
    const key = matched[1], quote = matched[2];
    if (values.has(key)) fail(`duplicate attribute ${key}`);
    const end = source.indexOf(quote, matched[0].length);
    if (end === -1) fail("unclosed attribute quote");
    const value = source.slice(matched[0].length, end);
    if (value.includes("<")) fail("literal < in attribute");
    entities(value);
    values.set(key, value);
    source = source.slice(end + 1);
  }
  return values;
}

function tagEnd(xml: string, start: number): number {
  let quote = "";
  for (let i = start + 1; i < xml.length; i++) {
    const char = xml[i];
    if (quote) { if (char === quote) quote = ""; }
    else if (char === '"' || char === "'") quote = char;
    else if (char === ">") return i;
    else if (char === "<") fail("unexpected < in tag");
  }
  return fail("unclosed tag or attribute quote");
}

export function assertWellFormed(xml: string) {
  for (const char of xml) {
    if (!legalCharacter(char.codePointAt(0)!)) fail("illegal XML character");
  }
  if (xml.startsWith("\uFEFF")) xml = xml.slice(1);
  const stack: string[] = [];
  let roots = 0, cursor = 0;
  while (cursor < xml.length) {
    if (xml[cursor] !== "<") {
      const next = xml.indexOf("<", cursor);
      const end = next === -1 ? xml.length : next;
      const content = xml.slice(cursor, end);
      if (!stack.length && /[^ \t\r\n]/.test(content)) {
        fail("text outside document root");
      }
      if (content.includes("]]>")) fail("CDATA terminator in ordinary text");
      entities(content);
      cursor = end;
      continue;
    }
    if (xml.startsWith("<!--", cursor)) {
      const end = xml.indexOf("-->", cursor + 4);
      if (end === -1) fail("unclosed comment");
      const content = xml.slice(cursor + 4, end);
      if (content.includes("--") || content.endsWith("-")) {
        fail("invalid comment");
      }
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", cursor)) {
      if (!stack.length) fail("CDATA outside document root");
      const end = xml.indexOf("]]>", cursor + 9);
      if (end === -1) fail("unclosed CDATA");
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith("<?", cursor)) {
      const end = xml.indexOf("?>", cursor + 2);
      if (end === -1) fail("unclosed processing instruction");
      const content = xml.slice(cursor + 2, end);
      const matched = content.match(new RegExp(`^(${name})([\\s\\S]*)$`));
      if (!matched || (matched[2] && !/^[ \t\r\n]/.test(matched[2]))) {
        fail("invalid processing instruction");
      }
      if (matched[1].toLowerCase() === "xml") {
        if (cursor !== 0 || matched[1] !== "xml") {
          fail("misplaced XML declaration");
        }
        const attrs = attributes(matched[2]);
        if (
          attrs.get("version") !== "1.0" || [...attrs.keys()][0] !== "version"
        ) fail("invalid XML 1.0 declaration");
        if (
          [...attrs.keys()].some((key) =>
            !["version", "encoding", "standalone"].includes(key)
          )
        ) fail("invalid XML declaration attribute");
        const encoding = attrs.get("encoding"),
          standalone = attrs.get("standalone");
        if (
          encoding !== undefined && !/^[A-Za-z][A-Za-z0-9._-]*$/.test(encoding)
        ) {
          fail("invalid encoding declaration");
        }
        if (standalone !== undefined && !["yes", "no"].includes(standalone)) {
          fail("invalid standalone declaration");
        }
      }
      cursor = end + 2;
      continue;
    }
    if (xml.startsWith("<!", cursor)) {
      fail("DTD and declarations are unsupported");
    }
    const end = tagEnd(xml, cursor);
    const tag = xml.slice(cursor, end + 1);
    if (tag.startsWith("</")) {
      const matched = tag.match(new RegExp(`^</(${name})[ \t\r\n]*>$`));
      if (!matched || stack.pop() !== matched[1]) {
        fail("mismatched closing tag");
      }
    } else {
      const matched = tag.match(new RegExp(`^<(${name})([\\s\\S]*?)(/?)>$`));
      if (!matched) fail("invalid opening tag");
      attributes(matched[2]);
      if (!stack.length && ++roots !== 1) fail("multiple document roots");
      if (!matched[3]) stack.push(matched[1]);
    }
    cursor = end + 1;
  }
  if (roots !== 1 || stack.length !== 0) {
    fail("missing or unclosed document root");
  }
}
