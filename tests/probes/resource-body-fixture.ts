// Authored input for the installed current-owner consumer; Core alone interprets it.
export const bodySources = ["corpus.qmd", "work-one.qmd", "work-two.qmd"];
export function corpus(
  computed: boolean,
  marker = "COMPUTED_CURRENT_OWNER_BODY",
) {
  const condition = computed
    ? `\`\`\`{r body-condition}
#| echo: false
#| results: asis
#| cache: false
started <- proc.time()[["elapsed"]]
write("executed", file="../_probe/engine-runs.txt", append=TRUE)
cat("${marker} 42.\\n\\n")
cat("| Input | Result |\\n|---|---|\\n| 6 | 42 |\\n\\n")
if (any(grepl("late-link", readLines("../_probe/selection.json")))) cat("[Late closed](materials/instructor/README.txt)\\n\\n")
cat((proc.time()[["elapsed"]]-started)*1000, file="../_probe/engine-ms.txt")
\`\`\`

\`\`\`{r body-plot}
#| echo: false
#| cache: false
plot(1:3, c(1,4,9), type="b")
\`\`\``
    : `STATIC_CURRENT_OWNER_BODY 42.

| Input | Result |
|---|---|
| 6 | 42 |

![Authored public plot](assets/shared.png)`;
  return `---
title: Canonical question chapter
${computed ? "engine: knitr\n" : ""}---

## Canonical questions {#sec-body-bank}

:::: {#exr-body course-role="discussion" difficulty="introductory" target="manual"}
## Explain the result

Explain $x^2+1$ and the [ordinary course reference](https://example.org/current-owner-body).
[Public starter](materials/student/README.txt).
![Shared public image](assets/shared.png).

${condition}

::: {.grading-notes}
GRADING_SECRET_CURRENT_OWNER_BODY
:::
::::

::: {#sol-body .when-full}
TEACHER_SECRET_CURRENT_OWNER_BODY
:::

:::: {#exr-choice course-role="independent-study" difficulty="introductory" target="manual"}
## Choose the secure option
Choose one protocol.

::: {.answer type="single-choice"}
- HTTP
- [TLS]{.correct}
- FTP
:::
::::

::: {.when-full}
[Closed-only](materials/instructor/README.txt)
![Shared closed](assets/shared.png)
:::
`;
}
export function work(name: string, id: string, kind: string) {
  return `---
title: Current ${name} chapter
assessment:
  kind: ${kind}
---

## Current ${name} {#${id}}

::: {.assessment-items}
1. @exr-body
2. @exr-choice
:::
`;
}
