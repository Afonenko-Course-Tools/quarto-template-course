local contract = require("./contract")
local steps = require("./steps")
local actions = require("./actions")
local M = {}
local directory = pandoc.path.directory(debug.getinfo(1, "S").source:sub(2))
function M.source()
  local root = assert(quarto.project.directory)
  local input = quarto.doc.input_file
  if pandoc.path.is_relative(input) then input = pandoc.path.join({root, input}) end
  return pandoc.path.make_relative(input, root)
end
function M.read(doc)
  local source = M.source()
  local value = {source = source, exercises = pandoc.List()}
  doc:walk({Div = function(d)
    if d.attributes.target == contract.name then
      value.exercises:insert({id = d.identifier, payload = steps.read(d)})
    end
  end})
  if doc.meta.assessment and doc.meta.cloud and doc.meta.cloud["virtual-machines"] then
    local machines = {}
    for name, vm in pairs(doc.meta.cloud["virtual-machines"]) do
      machines[name] = {template = pandoc.utils.stringify(vm.template)}
    end
    local prepare = pandoc.List()
    local blocks = pandoc.List()
    local function flatten(content)
      for _, block in ipairs(content) do
        if block.t == "Div" and (block.classes:includes("when-full") or block.classes:includes("when-student")
          or block.attributes["when-profile"] or block.attributes["unless-profile"]) then flatten(block.content)
        else blocks:insert(block) end
      end
    end
    flatten(doc.blocks)
    for _, block in ipairs(blocks) do
      if block.t == "CodeBlock" and block.classes:includes(contract.vocabulary.classes.action) then
        prepare:insert(actions.read(block))
      end
    end
    value.assessment = {["virtual-machines"] = machines, prepare = prepare}
  end
  return value
end
function M.vet(value, definition)
  pandoc.system.with_temporary_directory("course-adapter-", function(temp)
    local json = pandoc.path.join({temp, "candidate.json"})
    local file = assert(io.open(json, "w")); file:write(pandoc.json.encode(value)); file:close()
    local source = pandoc.path.join({temp, "source.cue"})
    file = assert(io.open(source, "w")); file:write('package course\n#Source: {inline: string & !=""} | {file: string & =~"^/[^.]"}\n'); file:close()
    pandoc.pipe(os.getenv("CUE") or "cue", {"vet", directory .. "/" .. contract.rules, source, json, "-d", definition, "-c", "--all-errors"}, "")
  end)
end
function M.write(doc, value)
  local root = assert(quarto.project.directory)
  local profiles = pandoc.List()
  for _, profile in ipairs(quarto.project.profile or {}) do profiles:insert(profile) end
  local output = quarto.doc.output_file
  if not pandoc.path.is_relative(output) then output = pandoc.path.make_relative(output, quarto.project.output_directory or root) end
  value.scope = "document"
  value.adapter = contract.name
  value.course = {id = pandoc.utils.stringify(doc.meta.course.id), view = doc.meta.course.view and pandoc.utils.stringify(doc.meta.course.view) or nil}
  value.document = {source = value.source, format = FORMAT, output = output, profiles = profiles}
  local view = value.course.view or "default"
  assert(view == "student" or view == "full" or view == "default", "Invalid adapter view")
  local hash = pandoc.utils.sha1(value.source .. "\0" .. FORMAT .. "\0" .. table.concat(profiles, "\0"))
  local function save(folder)
    pandoc.system.make_directory(folder, true)
    local file = assert(io.open(folder .. "/" .. hash .. ".json", "w"))
    file:write(pandoc.json.encode(value)); file:close()
  end
  save(root .. "/_generated/course-spec/adapters/" .. contract.name .. "/" .. view)
  local pointer = io.open(root .. "/_generated/course-spec/active-native-run.json", "r")
  if pointer then
    local run = pandoc.json.decode(pointer:read("*a")); pointer:close()
    assert(run.schema == "course-native-run-pointer-v1" and run.projectRoot == root, "Invalid native run pointer")
    assert(pandoc.path.directory(run.directory) == root .. "/_generated/course-spec/native-runs", "Invalid native run directory")
    assert(pandoc.json.encode(run.profiles) == pandoc.json.encode(profiles), "Native adapter profiles disagree")
    local folder = run.directory .. "/adapters/" .. contract.name
    save(folder)
    local file = assert(io.open(folder .. "/contract.json", "w"))
    file:write(pandoc.json.encode({name = contract.name, rules = contract.rules, directory = directory})); file:close()
  end
end
return M
