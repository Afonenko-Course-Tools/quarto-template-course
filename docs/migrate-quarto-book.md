# Add an existing native book

Keep the book's authored QMD, includes, assets, chapters, theme and listing configuration. Install complete Core and Reference Catalog packages into the book's extension scope. Add their filters and explicit native hooks. If Download is installed, use Core pre → Download pre, then Core post → Download post → QRC post → site collect.

Give the book a stable `course.id` and QRC namespace. Configure ordinary student/full profiles with distinct output directories and matching `course.view`. In the root website, add its path, format and mount to `course-site.projects`; keep root `project.render: [index.qmd]` and explicit Course Site pre/post hooks.

Use explicit sec-ID headings for exercise topics and keep private project/reference directories out of Quarto resources. Render the book directly first, then render the root with each profile. Inspect links, search, actual resource URLs and downloaded archives. Reuse the same source directory and caches during repeated builds.
