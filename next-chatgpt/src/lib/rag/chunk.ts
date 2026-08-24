// 文档文本提取与分块（纯文本格式，无需额外依赖）

const SUPPORTED_EXTENSIONS = new Set([
  "txt", "md", "markdown", "mdx", "html", "htm", "csv", "json", "yaml", "yml",
  "xml", "log", "ts", "tsx", "js", "jsx", "css", "scss", "svelte", "vue",
  "py", "java", "go", "rs", "sh", "sql", "ini", "env",
]);

export function isSupportedDocument(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/** 从文件内容提取纯文本（HTML 会去掉标签） */
export function extractTextFromFile(filename: string, content: string): string {
  const ext = getExtension(filename);
  if (["html", "htm"].includes(ext)) {
    return stripHtml(content);
  }
  return content;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** 将长文本切分为带重叠的块 */
export function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  const paragraphs = clean.split(/\n{2,}/).filter((p) => p.trim());
  let current = "";

  for (const para of paragraphs) {
    const normalizedPara = para.trim();
    if (current) {
      const combined = current + "\n\n" + normalizedPara;
      if (combined.length <= chunkSize) {
        current = combined;
        continue;
      }
      chunks.push(current.trim());
      current = "";
    }

    if (normalizedPara.length > chunkSize) {
      const pieces = splitLongText(normalizedPara, chunkSize, overlap);
      chunks.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] || "";
    } else {
      current = normalizedPara;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

function splitLongText(text: string, chunkSize: number, overlap: number): string[] {
  const sentences = text.split(/(?<=[。！？!?；;])\s*/).filter(Boolean);
  const pieces: string[] = [];
  let cur = "";

  for (const sentence of sentences) {
    if ((cur + sentence).length > chunkSize && cur) {
      pieces.push(cur.trim());
      cur = cur.slice(-overlap) + sentence;
    } else {
      cur += sentence;
    }
    while (cur.length > chunkSize) {
      pieces.push(cur.slice(0, chunkSize).trim());
      cur = cur.slice(chunkSize - overlap);
    }
  }

  if (cur.trim()) pieces.push(cur.trim());
  return pieces;
}
