import { parseMarkdown } from "../render.js";

export function useMarkdownParser() {
  const parse = (text) => {
    if (!text) return "";
    return parseMarkdown(text);
  };

  return {
    parse,
  };
}
