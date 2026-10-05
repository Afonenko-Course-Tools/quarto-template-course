import { isAbsolute, join, relative } from "stdlib/path";
const [project, ...files] = Deno.args;
const root = await Deno.realPath(project);
for (const file of files) {
  if (!file.startsWith("/") || file.startsWith("//")) {
    throw new Error(`Путь относительно корня курса: ${file}`);
  }
  const real = await Deno.realPath(join(root, file.slice(1)));
  const path = relative(root, real);
  if (
    !path || path === ".." || path.startsWith("../") ||
    path.startsWith("..\\") || isAbsolute(path)
  ) throw new Error(`Путь выходит за пределы курса: ${file}`);
  if (!(await Deno.stat(real)).isFile) {
    throw new Error(`Отсутствует исходный файл: ${file}`);
  }
}
