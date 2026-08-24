/**
 * 将 Markdown 文本清洗成适合朗读的纯文本。
 * 去掉标题/加粗/斜体/引用/列表/链接/代码围栏等语法标记，保留可读内容。
 */
export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return "";

  let text = markdown;

  // 移除代码块围栏（``` / ~~~），保留代码正文
  text = text.replace(/```[\s\S]*?```/g, (m) =>
    m.replace(/^```[\w+-]*\s*\n?|\n?```\s*$/g, "")
  );
  text = text.replace(/~~~[\s\S]*?~~~/g, (m) =>
    m.replace(/^~~~[\w+-]*\s*\n?|\n?~~~\s*$/g, "")
  );

  // 图片 ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

  // 链接 [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/<https?:\/\/[^>]+>/g, "");

  // 内联代码 `code` → code
  text = text.replace(/`([^`]+)`/g, "$1");

  // 标题 # 前缀
  text = text.replace(/^#{1,6}\s+/gm, "");

  // 引用 >
  text = text.replace(/^\s*>\s?/gm, "");

  // 任务列表 / 无序列表 / 有序列表标记
  text = text.replace(/^\s*(?:[-*+]|\[[ xX]\]|\d+[.)])\s+/gm, "");

  // 加粗 / 斜体 / 删除线（保留内容）
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // 表格分隔线与管道符
  text = text.replace(/^\s*\|?[\s:|-]+\|[\s:| -]+\|[^\n]*$/gm, "");
  text = text.replace(/\|/g, " ");

  // 移除剩余 HTML 标签
  text = text.replace(/<[^>]+>/g, "");

  // 整理空白：压缩连续空格/空行
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
