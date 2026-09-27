local actions = require("./actions")
local contract = require("./contract")
local vocabulary = contract.vocabulary
local classes = vocabulary.classes
local allowed = contract.set(vocabulary.attributes.step)
local rejected = contract.set(vocabulary.rejected_classes)
local technical = {[classes.step] = true, [classes.action] = true}
local M = {}
local function markers(div)
  local count, unknown = 0, pandoc.List()
  local function node(block)
    for _, class in ipairs(block.classes) do
      if technical[class] then count = count + 1
      elseif class:sub(1, #vocabulary.reserved_class_prefix) == vocabulary.reserved_class_prefix or rejected[class] then
        unknown:insert(class)
      end
    end
  end
  div:walk({Header = node, Div = node, CodeBlock = node})
  return count, unknown
end
function M.read(div)
  local total, unknown = markers(div)
  local result = {steps = pandoc.List(), orphanActions = 0,
    unknownClasses = unknown, misplacedMarkers = 0}
  local current, consumed = nil, 0
  for _, block in ipairs(div.content) do
    if block.t == "Header" and block.classes:includes(classes.step) then
      local attributes = pandoc.List()
      for key, _ in pairs(block.attributes) do
        if not allowed[key] then attributes:insert(key) end
      end
      current = {key = block.attributes.key or "",
        title = pandoc.utils.stringify(block.content), actions = pandoc.List(),
        unknownAttributes = attributes}
      result.steps:insert(current)
      consumed = consumed + 1
    elseif block.t == "CodeBlock" and block.classes:includes(classes.action) then
      consumed = consumed + 1
      if current then current.actions:insert(actions.read(block))
      else result.orphanActions = result.orphanActions + 1 end
    end
  end
  result.misplacedMarkers = total - consumed
  return result
end
return M
