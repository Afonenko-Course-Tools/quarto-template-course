local native = require("./native")
local M = {}
function M.validate(doc)
  if doc.meta.cloud and doc.meta.cloud["virtual-machines"] then
    for _, vm in pairs(doc.meta.cloud["virtual-machines"]) do
      for key, _ in pairs(vm) do assert(key == "template", "cloud.virtual-machines: неизвестное поле " .. key) end
    end
  end
  local value = native.read(doc)
  for _, exercise in ipairs(value.exercises) do native.vet(exercise.payload, "#CloudExercise") end
  if value.assessment then native.vet(value.assessment, "#CloudAssessment") end
  if doc.meta.assessment then
    local machines = value.assessment and value.assessment["virtual-machines"] or {}
    local members = {}
    doc:walk({Div = function(div)
      if div.classes:includes("assessment-items") then
        div:walk({Cite = function(cite)
          for _, reference in ipairs(cite.citations) do members[reference.id] = true end
        end})
      end
    end})
    for _, exercise in ipairs(value.exercises) do
      if members[exercise.id] then
        for _, step in ipairs(exercise.payload.steps) do
          for _, action in ipairs(step.actions) do
            assert(machines[action.vm], "CLOUD005_declaredVm: " .. action.vm)
          end
        end
      end
    end
  end
  local outside = 0
  doc:walk({traverse = "topdown", Div = function(div)
    if div.attributes.target == "cloud" then return div, false end
  end, CodeBlock = function(block)
    if block.classes:includes("cloud-action") then outside = outside + 1 end
  end, Header = function(header)
    assert(not header.classes:includes("cloud-step"), "cloud-step вне задания")
  end})
  assert(outside == #(value.assessment and value.assessment.prepare or {}), "cloud-action: неподдерживаемое размещение prepare")
  -- Hidden source-file declarations remain domain inputs before projection.
  local files = pandoc.List()
  local function source(action)
    if action.source.file then files:insert(action.source.file) end
  end
  for _, exercise in ipairs(value.exercises) do
    for _, step in ipairs(exercise.payload.steps) do for _, action in ipairs(step.actions) do source(action) end end
  end
  for _, action in ipairs(value.assessment and value.assessment.prepare or {}) do source(action) end
  if #files > 0 then
    local directory = pandoc.path.directory(debug.getinfo(1, "S").source:sub(2))
    local args = {"run", directory .. "/validate-paths.ts", quarto.project.directory}
    for _, file in ipairs(files) do args[#args + 1] = file end
    pandoc.pipe(os.getenv("QUARTO") or "quarto", args, "")
  end
end
return M
