/** Правила инвентаризации авторского формата. Учебные значения задаёт Core. */
const vocabulary = JSON.parse(Deno.readTextFileSync(
  new URL("../book/_extensions/Afonenko-Course-Tools/course-core/contract-vocabulary.json", import.meta.url),
));
export const featureContract = {
  enumKeys: new Set([
    "target",
    ...vocabulary.pedagogyAttributes.filter((key: string) => !["time", "for"].includes(key)),
  ]),
  nativeAttributes: new Set(["width", "layout-ncol"]),
  customRoot: /^(?:course(?:-.*)?|prairielearn|cloud|assessment|reference-catalog|course-site|project-download)$/,
  dynamicCollections: {
    "reference-catalog": ["imports", "exports"],
    "course-site": ["projects"],
    "project-download": ["resources"],
  } as Record<string, string[]>,
  markerClasses: new Set(["assessment-items", "grading-notes", "unnumbered"]),
  listingFields: new Set(["categories", "difficulty", "semester"]),
  pdfFonts: ["mainfont", "sansfont", "monofont"],
  metadataKeys: new Set(["categories", "semester", "time"]),
  attributeKeys: new Set([...vocabulary.pedagogyAttributes, ...vocabulary.exerciseAttributes]),
};
