import {
  dirname,
  fromFileUrl,
  globToRegExp,
  join,
  relative,
  resolve,
} from "stdlib/path";
import { parse } from "stdlib/yaml";

export interface SourceLocation {
  file: string;
  line: number;
}
export type FeatureInventory = Map<string, SourceLocation[]>;
type Mapping = Record<string, unknown>;
const mapping = (value: unknown): Mapping =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Mapping
    : {};
const list = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const enumKeys = new Set([
  "course-role",
  "target",
  "difficulty",
  "work-mode",
  "requirement",
]);
const customRoot =
  /^(?:course(?:-.*)?|prairielearn|assessment|reference-catalog)$/;
const slash = (path: string): string => path.replaceAll("\\", "/");

async function exists(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

/** Только исходные документы проекта; включаемые _partials читаются отдельно. */
async function documents(
  root: string,
  directory = root,
  omitted = new Set<string>(),
): Promise<string[]> {
  const result: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (/^[._]/.test(entry.name) || entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (omitted.has(path)) continue;
    if (entry.isDirectory) {
      if (!await exists(join(path, "_quarto.yml"))) {
        result.push(...await documents(root, path, omitted));
      }
    } else if (entry.isFile && /\.qmd$/i.test(entry.name)) result.push(path);
  }
  return result.sort();
}

/** Маски сохраняют строки и позиции: примеры синтаксиса не считаются применением. */
function activeMarkdown(text: string): string {
  let fence = "", width = 0;
  return text.replace(
    /<!--[\s\S]*?-->/g,
    (value) => value.replace(/[^\n]/g, " "),
  )
    .split("\n").map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (
          marker && marker[1][0] === fence && marker[1].length >= width &&
          line.slice(marker[0].length).trim() === ""
        ) fence = "";
        return " ".repeat(line.length);
      }
      if (marker) {
        fence = marker[1][0];
        width = marker[1].length;
        return " ".repeat(line.length);
      }
      if (/^(?: {4}|\t)/.test(line)) return " ".repeat(line.length);
      return line.replace(
        /(`+)([^`]|(?!\1)`)*?\1/g,
        (value) => " ".repeat(value.length),
      );
    }).join("\n");
}

/**
 * Инвентаризация реально подключённых конфигураций и документов всех профилей.
 * Это проверка покрытия примерами, а не замена валидатора CUE или сборки Quarto.
 * Значения идентификаторов, путей, заголовков и произвольных тегов не сравниваются.
 */
export async function inventory(directory: string): Promise<FeatureInventory> {
  const root = resolve(directory), features: FeatureInventory = new Map();
  const seenProjects = new Set<string>(),
    seenConfigs = new Set<string>(),
    seenDocs = new Set<string>();
  const outputDirectories = new Set<string>();
  const add = (feature: string, file: string, line: number) => {
    const source = { file: slash(relative(root, file)), line };
    const locations = features.get(feature) ?? [];
    if (
      !locations.some((item) => item.file === source.file && item.line === line)
    ) locations.push(source);
    features.set(feature, locations);
  };

  function inspectMetadata(
    value: unknown,
    file: string,
    text: string,
    offset = 0,
  ): void {
    const lines = text.split("\n");
    const location = (key: string) =>
      offset + 1 +
      Math.max(
        0,
        lines.findIndex((line) =>
          line.trimStart().replace(/^[- ]+/, "").startsWith(`${key}:`)
        ),
      );
    const record = (feature: string, key: string) =>
      add(feature, file, location(key));
    function properties(node: unknown, path: string[]): void {
      if (Array.isArray(node)) {
        for (const item of node) properties(item, path);
        return;
      }
      for (const [key, child] of Object.entries(mapping(node))) {
        // Имена подключаемых проектов/каталогов — данные, а не новая возможность.
        const normalized =
          path.length === 2 && path[0] === "reference-catalog" &&
            ["projects", "imports"].includes(path[1])
            ? "*"
            : path[0] === "listing" && path.at(-1) === "field-display-names"
            ? "*"
            : key;
        const next = [...path, normalized];
        record(`yaml:${next.join(".")}`, key);
        if (
          enumKeys.has(key) && typeof child === "string" &&
          path[0] !== "listing"
        ) {
          record(`value:${key}=${child}`, key);
        }
        properties(child, next);
      }
    }
    function walk(node: unknown, path: string[] = []): void {
      if (Array.isArray(node)) {
        for (const item of node) walk(item, path);
        return;
      }
      for (const [key, child] of Object.entries(mapping(node))) {
        if (key === "format") {
          const formats = typeof child === "string"
            ? { [child]: {} }
            : mapping(child);
          if (Object.hasOwn(formats, "pdf")) {
            record("format:pdf", key);
            const pdf = mapping(formats.pdf);
            if (typeof pdf["pdf-engine"] === "string") {
              record(`pdf-engine:${pdf["pdf-engine"]}`, "pdf-engine");
            }
            for (const font of ["mainfont", "sansfont", "monofont"]) {
              if (Object.hasOwn(pdf, font)) {
                record(`yaml:format.pdf.${font}`, font);
              }
            }
          }
        }
        if (customRoot.test(key) || key === "listing") {
          record(`yaml:${key}`, key);
          if (enumKeys.has(key) && typeof child === "string") {
            record(`value:${key}=${child}`, key);
          }
          properties(child, [key]);
          if (key === "listing") {
            for (const listing of list(child)) {
              const config = mapping(listing);
              if (typeof config.type === "string") {
                record(`listing:type=${config.type}`, key);
              }
              for (const field of list(config.fields)) {
                if (
                  typeof field === "string" &&
                  ["categories", "difficulty", "semester"].includes(field)
                ) {
                  record(`listing:field=${field}`, "fields");
                }
              }
            }
          }
          continue;
        }
        if (key === "filters" || key === "revealjs-plugins") {
          for (const item of list(child)) {
            const name = typeof item === "string" ? item : mapping(item).path;
            if (typeof name === "string") record(`${key}:${slash(name)}`, key);
          }
        }
        if (
          path.length === 0 &&
          ["categories", "semester", "time", ...enumKeys].includes(key)
        ) {
          record(`metadata:${key}`, key);
          if (enumKeys.has(key) && typeof child === "string") {
            record(`value:${key}=${child}`, key);
          }
        }
        walk(child, [...path, key]);
      }
    }
    walk(value);
  }

  async function config(path: string): Promise<Mapping> {
    const text = await Deno.readTextFile(path);
    let value: Mapping;
    try {
      value = mapping(parse(text));
    } catch (error) {
      throw new Error(`Некорректный YAML: ${relative(root, path)}: ${error}`);
    }
    if (!seenConfigs.has(path)) {
      seenConfigs.add(path);
      inspectMetadata(value, path, text);
      for (const imported of list(value["metadata-files"])) {
        if (typeof imported === "string") {
          await config(resolve(dirname(path), imported));
        }
      }
    }
    return value;
  }

  async function document(path: string, projectRoot: string): Promise<void> {
    if (seenDocs.has(path)) return;
    seenDocs.add(path);
    const text = (await Deno.readTextFile(path)).replace(/^\uFEFF/, "")
      .replaceAll("\r\n", "\n");
    const front = text.match(/^---\s*\n([\s\S]*?)\n(?:---|\.\.\.)\s*(?:\n|$)/);
    if (front) {
      try {
        inspectMetadata(parse(front[1]), path, front[1], 1);
      } catch (error) {
        throw new Error(
          `Некорректные метаданные: ${relative(root, path)}: ${error}`,
        );
      }
      for (const imported of list(mapping(parse(front[1]))["metadata-files"])) {
        if (typeof imported === "string") {
          await config(resolve(dirname(path), imported));
        }
      }
    }
    const body = activeMarkdown(
      front
        ? front[0].replace(/[^\n]/g, " ") + text.slice(front[0].length)
        : text,
    );
    for (const [index, line] of body.split("\n").entries()) {
      const record = (feature: string) => add(feature, path, index + 1);
      for (const attrs of line.matchAll(/\{([^{}]*)\}/g)) {
        for (const id of attrs[1].matchAll(/(?:^|\s)#(exr|sol|tip)-[\w-]+/g)) {
          record(`identifier:${id[1]}`);
        }
        for (
          const attr of attrs[1].matchAll(
            /\b([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g,
          )
        ) {
          const key = attr[1], value = attr[2] ?? attr[3] ?? attr[4];
          if (enumKeys.has(key)) record(`value:${key}=${value}`);
          if (
            /^course-/.test(key) ||
            ["project", "for", "time", ...enumKeys].includes(key)
          ) record(`attribute:${key}`);
        }
        for (const css of attrs[1].matchAll(/(?:^|\s)\.([\w-]+)/g)) {
          if (
            ["assessment-items", "grading-notes"].includes(css[1]) ||
            /^(?:when|unless)-/.test(css[1])
          ) {
            record(`class:${css[1].replace(/^(when|unless)-.+$/, "$1-*")}`);
          }
        }
      }
      for (
        const shortcode of line.matchAll(/\{\{<\s*([\w-]+)\b([\s\S]*?)>\}\}/g)
      ) {
        record(`shortcode:${shortcode[1]}`);
        if (shortcode[1] === "include") {
          const argument = shortcode[2].trim().match(
            /^(?:"([^"]+)"|'([^']+)'|(\S+))/,
          );
          if (!argument) {
            throw new Error(
              `Пустой include: ${relative(root, path)}:${index + 1}`,
            );
          }
          const target = argument[1] ?? argument[2] ?? argument[3];
          await document(
            target.startsWith("/")
              ? resolve(projectRoot, target.slice(1))
              : resolve(dirname(path), target),
            projectRoot,
          );
        }
      }
      for (
        const reference of line.matchAll(/(?:^|[^\w@])@([\w-]+)(?::([\w-]+))?/g)
      ) {
        record(reference[2] ? "reference:catalog" : "reference:local");
      }
    }
    // Метаданные каталогов действуют только на документы внутри этих каталогов.
    let folder = dirname(path);
    while (folder === projectRoot || folder.startsWith(projectRoot + "/")) {
      for (const name of ["_metadata.yml", "_metadata.yaml"]) {
        if (await exists(join(folder, name))) await config(join(folder, name));
      }
      if (folder === projectRoot) break;
      folder = dirname(folder);
    }
  }

  async function project(projectRoot: string): Promise<void> {
    if (seenProjects.has(projectRoot)) return;
    seenProjects.add(projectRoot);
    const base = await config(join(projectRoot, "_quarto.yml"));
    const configs = [base];
    for await (const entry of Deno.readDir(projectRoot)) {
      if (entry.isFile && /^_quarto-.+\.ya?ml$/.test(entry.name)) {
        configs.push(await config(join(projectRoot, entry.name)));
      }
    }
    for (const value of configs) {
      const output = mapping(value.project)["output-dir"];
      if (typeof output === "string") {
        outputDirectories.add(resolve(projectRoot, output));
      }
    }
    for (const value of configs) {
      for (
        const member of Object.values(
          mapping(mapping(value["reference-catalog"]).projects),
        )
      ) {
        const path = mapping(member).path;
        if (typeof path === "string") await project(resolve(projectRoot, path));
      }
    }
    const available = await documents(
        projectRoot,
        projectRoot,
        outputDirectories,
      ),
      selected = new Set<string>();
    function chapters(value: unknown): void {
      if (typeof value === "string" && /\.qmd$/.test(value)) {
        selected.add(resolve(projectRoot, value));
      } else if (Array.isArray(value)) value.forEach(chapters);
      else {for (const [key, child] of Object.entries(mapping(value))) {
          if (["part", "chapters", "appendices"].includes(key)) chapters(child);
        }}
    }
    for (const value of configs) {
      const book = mapping(value.book), project = mapping(value.project);
      if (book.chapters !== undefined || book.appendices !== undefined) {
        chapters(book);
      }
      if (project.render !== undefined) {
        const patterns = list(project.render).filter((item): item is string =>
          typeof item === "string"
        );
        const include = patterns.filter((item) => !item.startsWith("!"));
        const exclude = patterns.filter((item) => item.startsWith("!")).map(
          (item) => globToRegExp(item.slice(1)),
        );
        for (const path of available) {
          const name = slash(relative(projectRoot, path));
          if (
            include.some((pattern) => globToRegExp(pattern).test(name)) &&
            !exclude.some((pattern) => pattern.test(name))
          ) selected.add(path);
        }
      } else if (value === base && !book.chapters && !book.appendices) {
        available.forEach((path) => selected.add(path));
      }
    }
    for (const path of [...selected].sort()) await document(path, projectRoot);
  }

  await project(root);
  // Самостоятельные раздаточные материалы тоже принадлежат курсу, даже если
  // они не публикуются в составе сайта QRC. Исходники расширений исключены.
  async function standalone(directory: string): Promise<void> {
    for await (const entry of Deno.readDir(directory)) {
      if (
        !entry.isDirectory || /^[._]/.test(entry.name) ||
        ["node_modules", "vendor", "build", "dist", "target"].includes(
          entry.name,
        )
      ) continue;
      const path = join(directory, entry.name);
      if (outputDirectories.has(path)) continue;
      if (await exists(join(path, "_quarto.yml"))) await project(path);
      await standalone(path);
    }
  }
  await standalone(root);
  return new Map(
    [...features.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    ),
  );
}

if (import.meta.main) {
  try {
    const options = new Map<string, string>();
    for (let index = 0; index < Deno.args.length; index += 2) {
      const key = Deno.args[index], value = Deno.args[index + 1];
      if (
        !["--course", "--template"].includes(key) || !value ||
        value.startsWith("--") || options.has(key)
      ) {
        throw new Error(
          "Ожидаются параметры --course и необязательный --template с путями к каталогам.",
        );
      }
      options.set(key, value);
    }
    const courseRoot = options.get("--course");
    if (!courseRoot) {
      throw new Error(
        "Использование: quarto run tests/features.ts --course /путь/к/курсу [--template /путь/к/шаблону]",
      );
    }
    const template = options.get("--template") ??
      dirname(dirname(fromFileUrl(import.meta.url)));
    const [examples, course] = await Promise.all([
      inventory(template),
      inventory(courseRoot),
    ]);
    const missing = [...course].filter(([feature]) => !examples.has(feature));
    if (missing.length) {
      console.error(
        "В курсе найдены возможности без действующего примера в шаблоне:",
      );
      for (const [feature, locations] of missing) {
        const source = locations[0];
        console.error(`  ${feature} — ${source.file}:${source.line}`);
      }
      Deno.exitCode = 1;
    } else {console.log(
        `Покрытие шаблоном подтверждено: ${course.size} возможностей курса, ${examples.size} возможностей шаблона.`,
      );}
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
