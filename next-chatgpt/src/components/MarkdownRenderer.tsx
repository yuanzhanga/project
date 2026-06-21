"use client";
import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

const createRenderer = () => {
  const renderer = new marked.Renderer();

  renderer.code = function (code: string, infostring: string | undefined) {
    const lang = infostring || "";
    const sanitized = DOMPurify.sanitize(code);
    return `<pre class="bg-gray-900 rounded-lg p-4 overflow-x-auto"><code class="language-${lang || "text"} text-sm text-gray-100">${sanitized}</code></pre>`;
  };

  renderer.link = function (
    href: string | null,
    text: string,
    title: string | null,
  ) {
    const safeHref = DOMPurify.sanitize(href || "");
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline">${text}</a>`;
  };

  renderer.blockquote = function (quote: string) {
    return `<blockquote class="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-2">${quote}</blockquote>`;
  };

  renderer.heading = function (text: string, depth: number, raw: string) {
    const sizes = [
      "text-2xl",
      "text-xl",
      "text-lg",
      "text-base",
      "text-sm",
      "text-xs",
    ];
    const size = sizes[depth - 1] || "text-base";
    return `<h${depth} class="${size} font-bold text-white mb-2 mt-4">${text}</h${depth}>`;
  };

  renderer.list = function (body: string, ordered: boolean) {
    const tag = ordered ? "ol" : "ul";
    const listStyle = ordered ? "list-decimal" : "list-disc";
    return `<${tag} class="${listStyle} pl-6 space-y-1 text-gray-300">${body}</${tag}>`;
  };

  renderer.listitem = function (text: string) {
    return `<li class="text-gray-300">${text}</li>`;
  };

  renderer.paragraph = function (text: string) {
    return `<p class="text-gray-300 mb-2 leading-relaxed">${text}</p>`;
  };

  renderer.strong = function (text: string) {
    return `<strong class="font-bold text-white">${text}</strong>`;
  };

  renderer.em = function (text: string) {
    return `<em class="italic text-gray-300">${text}</em>`;
  };

  renderer.table = function (header: string, body: string) {
    return `<table class="min-w-full divide-y divide-gray-700"><thead class="bg-gray-800">${header}</thead><tbody class="divide-y divide-gray-700">${body}</tbody></table>`;
  };

  renderer.tablerow = function (text: string) {
    return `<tr>${text}</tr>`;
  };

  renderer.tablecell = function (
    text: string,
    flags: { header: boolean; align: string | null },
  ) {
    const tag = flags.header ? "th" : "td";
    const className = flags.header
      ? "px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
      : "px-3 py-2 text-sm text-gray-300";
    return `<${tag} class="${className}">${text}</${tag}>`;
  };

  renderer.hr = function () {
    return '<hr class="border-gray-700 my-4" />';
  };

  renderer.image = function (
    href: string | null,
    title: string | null,
    text: string,
  ) {
    return `<img src="${DOMPurify.sanitize(href || "")}" alt="${text}" title="${title || ""}" class="max-w-full h-auto rounded-lg my-2" loading="lazy" />`;
  };

  renderer.codespan = function (text: string) {
    return `<code class="bg-gray-800 text-pink-400 px-1 py-0.5 rounded text-sm">${DOMPurify.sanitize(text)}</code>`;
  };

  return renderer;
};

marked.setOptions({
  renderer: createRenderer(),
  gfm: true,
  breaks: true,
});

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming,
}) => {
  const sanitizedHtml = useMemo(() => {
    if (!content) return "";
    try {
      // 流式渲染时，尝试修复不完整的 markdown
      let processedContent = content;
      if (isStreaming) {
        // 修复不完整的代码块
        const codeBlockCount = (content.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
          processedContent = content + "\n```";
        }

        // 修复不完整的行内代码
        const inlineCodeCount = (content.match(/`/g) || []).length;
        if (inlineCodeCount % 2 !== 0) {
          processedContent = processedContent + "`";
        }

        // 修复不完整的加粗
        const boldCount = (content.match(/\*\*/g) || []).length;
        if (boldCount % 2 !== 0) {
          processedContent = processedContent + "**";
        }

        // 修复不完整的斜体
        const italicCount = (content.match(/\*/g) || []).length;
        if (italicCount % 2 !== 0) {
          processedContent = processedContent + "*";
        }
      }

      const html = marked.parse(processedContent) as string;
      const clean = DOMPurify.sanitize(html, {
        ADD_TAGS: [
          "pre",
          "code",
          "blockquote",
          "a",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ol",
          "ul",
          "li",
          "p",
          "strong",
          "em",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "hr",
          "img",
          "br",
        ],
        ADD_ATTR: ["target", "rel", "class", "src", "alt", "title", "loading"],
        FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
      });
      return clean;
    } catch {
      return DOMPurify.sanitize(content);
    }
  }, [content, isStreaming]);

  return (
    <div
      className={`markdown-content ${isStreaming ? "streaming" : ""}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default MarkdownRenderer;
