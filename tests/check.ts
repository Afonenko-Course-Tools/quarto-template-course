import { dirname, fromFileUrl, join, resolve } from "stdlib/path";
const root=dirname(dirname(fromFileUrl(import.meta.url)));
const quarto=Deno.env.get("QUARTO")||"quarto";
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
async function files(directory:string):Promise<string[]>{const result:string[]=[];for await(const entry of Deno.readDir(directory)){const path=join(directory,entry.name);if(entry.isDirectory)result.push(...await files(path));else if(entry.isFile)result.push(path);}return result;}
if(!Deno.args.includes("--skip-render"))for(const profile of ["full","student"]){
 const result=await new Deno.Command(quarto,{args:["render","--profile",profile,"--fail-if-warnings"],cwd:root,stdout:"inherit",stderr:"inherit"}).output();assert(result.success,`Failed ${profile} build`);
}
function zipNames(bytes:Uint8Array):string[]{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),names:string[]=[];let offset=0;
 while(offset+30<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
  const length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),size=view.getUint32(offset+18,true);
  names.push(new TextDecoder().decode(bytes.subarray(offset+30,offset+30+length)));offset+=30+length+extra+size;
 }
 return names;
}
let links=0;
for(const profile of ["student","full"]){
 const output=join(root,`_site-${profile}`),paths=await files(output);
 const archives=paths.filter(path=>path.endsWith(".zip"));
 assert(archives.length===(profile==="full"?2:1),`${profile}: archive count`);
 for(const archive of archives){
  const names=zipNames(await Deno.readFile(archive));
  assert(names.includes("build.gradle")&&names.includes("settings.gradle")&&names.includes("Clamp.java"),"Starter build files absent");
  assert(names.every(name=>!/(^|\/)(reference|tests|build|\.gradle)(\/|$)/.test(name)),"Private or generated files leaked into archive");
 }
 const catalog=JSON.parse(await Deno.readTextFile(join(output,"reference-catalog.json")));
 assert(Boolean(catalog.targets["book:exr-clamp-instructor"])===(profile==="full"),"Private catalog target projection");
 for(const path of paths){
  assert(!/\.(qmd|java|gradle)$/.test(path)&&!path.includes("/_extensions/"),`Published source file ${path}`);
  if(!path.endsWith(".html")&&!path.endsWith("search.json"))continue;
  const text=await Deno.readTextFile(path);
  if(profile==="student")for(const marker of ["exr-clamp-instructor","Контроль для преподавателя","Комментарий преподавателю","grading-notes"])
   assert(!text.includes(marker),`Student leak ${marker} in ${path}`);
  if(!path.endsWith(".html"))continue;
  for(const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   const raw=match[1];if(/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|#)/.test(raw))continue;
   const url=decodeURIComponent(raw.split(/[?#]/)[0]);if(!url)continue;
   const target=url.startsWith("/")?join(output,url.slice(1)):resolve(dirname(path),url);
   try{await Deno.stat(target);}catch{throw new Error(`Broken local link ${raw} in ${path}`);}links++;
  }
 }
}
console.log(`PASS template: both profiles, book + slides, source isolation, archive contents, catalog/search projection, ${links} local links`);
