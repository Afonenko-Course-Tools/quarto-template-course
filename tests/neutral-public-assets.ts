// Public Reveal descriptors measured on stock Quarto 1.10.18 and 1.11.5.
// A known filename alone never grants permission to publish arbitrary YAML.
const revealDescriptors: Record<string, string> = {
  "course-navigation":
    "76edcd070b0e97d9d6c73a0957184125244cbb98fbc12303a881eeb3fe9f6eba",
  "pdf-export":
    "ce9bb146827c559d109c1011b22d14695751de65dbc8f1033ccf38a13b029298",
  "quarto-line-highlight":
    "c360344cce59778682800185df97b414ac9ec91213fefda989b9551a10b49e95",
  "quarto-support":
    "b8c1267adaf0f137c83ebe6a12f7ef0ee49ee36676f038edef63288379844bf5",
  "reveal-menu":
    "572b76cc11ffd42c1abfe9e415fe7c95d76e517f2812a41e4baee3333fc9cf77",
};

export async function isNeutralPublicDescriptor(
  publicPath: string,
  bytes: Uint8Array,
): Promise<boolean> {
  const match =
    /^(lectures|practice)\/index_files\/libs\/revealjs\/plugin\/(course-navigation|pdf-export|quarto-line-highlight|quarto-support|reveal-menu)\/plugin\.yml$/
      .exec(publicPath);
  if (!match || match[0] !== publicPath) return false;
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  const actual = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return actual === revealDescriptors[match[2]];
}
