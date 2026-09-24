local M = {}
function M.read(block)
  local a, source, unknown = block.attributes, {}, pandoc.List()
  local allowed = {phase = true, vm = true, file = true}
  if a.file then source.file = a.file end
  if block.text:match("%S") then source.inline = block.text end
  for key, _ in pairs(a) do if not allowed[key] then unknown:insert(key) end end
  return {phase = a.phase or "", vm = a.vm or "", source = source,
    language = block.classes[1] or "", unknownAttributes = unknown}
end
return M
