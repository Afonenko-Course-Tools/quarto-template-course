# Native Body exports

This small manual exercise and single-choice work demonstrates current native Core capture, an image and a downloadable worksheet. Render it with the `student` or `full` profile. The full native result supplies private answer data for a teacher export; the public package always excludes it.

From the template root, the acceptance command creates the packages and invokes the installed Print and Moodle entrypoints:

```sh
quarto run tests/native/run.ts neutral --workspace /tmp/course-native
quarto run tests/native/exports.ts /tmp/course-native/neutral
```

Generated JSON, PDF, resources and XML remain under the example's `_generated` directory, outside the published site. Print consumes `public-package.json`. Moodle consumes the full `teacher-package.json` with explicit `defaultGrade` and `shuffle` binding. A student single-choice package is deliberately insufficient for a graded Moodle export because it contains no correct-answer key.
