local steps = require("./steps")
local actions = require("./actions")
local contract = require("./contract")
return {{Pandoc = function(doc)
  if not doc.meta.course then return doc end
  assert(doc.meta["course-core-processed"] == true,
    "Фильтр course-core должен предшествовать course-cloud: видимость обрабатывается до извлечения данных")
  -- Core emits this handoff only after validated private source capture.
  -- Keep the ordering assertion above: an authored marker alone grants nothing.
  if doc.meta["course-core-capture"] == true then return doc end
  local root = assert(quarto.project.directory)
  local input = quarto.doc.input_file
  if pandoc.path.is_relative(input) then input = pandoc.path.join({root, input}) end
  local source = pandoc.path.make_relative(input, root)
  local value = {source = source, exercises = pandoc.List()}
  doc:walk({Div = function(d)
    if d.attributes.target == contract.name then
      value.exercises:insert({id = d.identifier, payload = steps.read(d)})
    end
  end})
  if doc.meta.cloud and doc.meta.cloud["virtual-machines"] then
    local machines = {}
    for name, vm in pairs(doc.meta.cloud["virtual-machines"]) do
      machines[name] = {template = pandoc.utils.stringify(vm.template)}
    end
    local prepare = pandoc.List()
    for _, block in ipairs(doc.blocks) do
      if block.t == "CodeBlock" and block.classes:includes(contract.vocabulary.classes.action) then
        prepare:insert(actions.read(block))
      end
    end
    value.assessment = {["virtual-machines"] = machines, prepare = prepare}
  end
  local directory = root .. "/_generated/course-spec/" .. contract.name
  pandoc.system.make_directory(directory, true)
  local file = assert(io.open(directory .. "/" .. pandoc.utils.sha1(source) .. ".json", "w"))
  file:write(pandoc.json.encode(value)); file:close()
  return doc
end}}
