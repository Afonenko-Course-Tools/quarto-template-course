package course

import "list"

#CloudAction: {
	phase: "check" | "solution" | "pre-step" | "post-step"
	vm: string & !=""
	language: string & !=""
	source: #Source
	unknownAttributes: []
}
#CloudStep: {
	key: string & =~"^[a-z][a-z0-9-]*$"
	title: string & !=""
	unknownAttributes: []
	actions: [...#CloudAction] & list.MinItems(1)
	CLOUD001_check: list.Contains([for a in actions {a.phase}], "check") & true
	CLOUD002_uniqueActions: [for a in actions {"\(a.vm)/\(a.phase)"}] & list.UniqueItems
	CLOUD003_checkPerVm: {
		for a in actions {
			(a.vm): list.Contains([for c in actions if c.phase == "check" {c.vm}], a.vm) & true
		}
	}
}
#CloudExercise: {
	steps: [...#CloudStep] & list.MinItems(1)
	orphanActions: 0
	misplacedMarkers: 0
	unknownClasses: []
	CLOUD004_uniqueSteps: [for s in steps {s.key}] & list.UniqueItems
}
#CloudAssessment: {
	prepare: [...{phase: "prepare", vm: string, language: string & !="", source: #Source, unknownAttributes: []}]
	VMs="virtual-machines": {
		[string]: {template: string & !=""}
	}
	CLOUD007_uniquePrepare: [for a in prepare {a.vm}] & list.UniqueItems
	CLOUD006_prepareVm: {
		for a in prepare {(a.vm): list.Contains([for name, _ in VMs {name}], a.vm) & true}
	}
}
#Exercise: {
	target: string
	if target == "cloud" {extensions: cloud: #CloudExercise}
}
#Assessment: {extensions: cloud?: #CloudAssessment}
#Course: {
	assessments: [...#Assessment]
	exercises: [...#Exercise]
	CLOUD005_declaredVm: {
		for a in assessments {
			for e in exercises if e.target == "cloud" if list.Contains(a.items, e.id) {
				for s in e.extensions.cloud.steps {
					for action in s.actions {
						"\(a.id)/\(e.id)/\(s.key)/\(action.vm)": list.Contains(
							[for name, _ in a.extensions.cloud["virtual-machines"] {name}],
							action.vm) & true
					}
				}
			}
		}
	}
}
