# Authoring examples and acceptance

| Example | Native acceptance |
|---|---|
| Root theory/tasks/lectures/practice/handbook | Five-part website, explicit current catalogs/search, canonical exercises, local links |
| Tasks | Manual exercises, assessment, plan, public worksheet and full-only instructor ZIP |
| Original book and essay | Preserved includes, listings, Java projects, private controls, external references and profile isolation |
| Original lectures/practice/handout | Native heading-based Reveal sections, roles/navigation, actual SVG resources and native PDF |
| Cloud/PrairieLearn | Native profile renders and explicit current Core model validation |
| Exports | Current Core Body, public PDF/resources, teacher Moodle XML/attachments |

Core validates authored declarations before applying audience visibility. Exercises require explicit purpose, difficulty and an authored sec-ID topic. Targeted exercises begin with their own title. Root/part configuration selects the audience through ordinary Quarto profiles.

The acceptance suite reads current native outputs. It preserves native caches between renders, repeats student → full → student, and exercises failure/retry and preview. Source files, private assets and provider implementation files must not appear in the student output. Real VM deployment, LMS import and grading are separate downstream operations.

Reveal examples use section headings at `##` and slide headings at `###`. The main lecture and practice show a divider followed by content slides; the Original regression keeps content on the first section slide. Titles, `sec-*` IDs, links and content remain authored in Markdown. Nested headings in Original display examples move one source level deeper so their rendered heading level is preserved by the Reveal-only shift. Exercise roles, solution pairs and audience visibility are unchanged.
