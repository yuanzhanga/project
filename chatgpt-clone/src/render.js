/**
 * @typedef {'heading'|'paragraph'|'text'|'strong'|'em'|'code'|'codeBlock'|'link'|'list'|'listItem'|'blockquote'|'hr'|'space'} TokenType
 * @typedef {Object} Token
 * @property {TokenType} type
 * @property {string} raw
 * @property {number} [depth]
 * @property {string} [text]
 * @property {string} [lang]
 * @property {string} [href]
 * @property {Token[]} [tokens]
 */

class Lexer {
  constructor(src) {
    this.src = src.replace(/\r\n|\r/g, "\n");
    this.tokens = [];
  }

  tokenize() {
    while (this.src) {
      if (this.match(/^(\n+)/)) continue;

      if (this.matchCodeBlock()) continue;

      if (this.matchHeading()) continue;

      if (this.matchHr()) continue;

      if (this.matchBlockquote()) continue;

      if (this.matchList()) continue;

      this.matchParagraph();
    }

    return this.tokens;
  }

  match(reg) {
    const cap = reg.exec(this.src);
    if (!cap) return null;
    this.src = this.src.slice(cap[0].length);
    return cap[0];
  }

  matchCodeBlock() {
    const cap = /^```(\w*)\n([\s\S]*?)\n```/.exec(this.src);
    if (!cap) return false;

    this.tokens.push({
      type: "codeBlock",
      raw: cap[0],
      lang: cap[1] || "",
      text: cap[2],
    });
    this.src = this.src.slice(cap[0].length);
    return true;
  }

  matchHeading() {
    const cap = /^(#{1,6})\s+(.+?)(?:\n|$)/.exec(this.src);
    if (!cap) return false;

    this.tokens.push({
      type: "heading",
      raw: cap[0],
      depth: cap[1].length,
      tokens: this.inlineTokenize(cap[2]),
    });
    this.src = this.src.slice(cap[0].length);
    return true;
  }

  matchParagraph() {
    const cap = /^([^\n]+(?:\n[^\n]+)*)/.exec(this.src);
    if (!cap) return false;

    this.tokens.push({
      type: "paragraph",
      raw: cap[0],
      tokens: this.inlineTokenize(cap[1].trim()),
    });
    this.src = this.src.slice(cap[0].length);
    return true;
  }

  inlineTokenize(text) {
    const tokens = [];
    let remaining = text;

    while (remaining) {
      const codeMatch = /^`([^`]+)`/.exec(remaining);
      if (codeMatch) {
        tokens.push({ type: "code", raw: codeMatch[0], text: codeMatch[1] });
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      const strongMatch = /^\*\*(.+?)\*\*/.exec(remaining);
      if (strongMatch) {
        tokens.push({
          type: "strong",
          raw: strongMatch[0],
          tokens: this.inlineTokenize(strongMatch[1]),
        });
        remaining = remaining.slice(strongMatch[0].length);
        continue;
      }

      const emMatch = /^\*(.+?)\*/.exec(remaining);
      if (emMatch) {
        tokens.push({
          type: "em",
          raw: emMatch[0],
          tokens: this.inlineTokenize(emMatch[1]),
        });
        remaining = remaining.slice(emMatch[0].length);
        continue;
      }

      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)/.exec(remaining);
      if (linkMatch) {
        tokens.push({
          type: "link",
          raw: linkMatch[0],
          text: linkMatch[1],
          href: linkMatch[2],
        });
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      const textMatch = /^[^[*`]+/.exec(remaining);
      if (textMatch) {
        tokens.push({ type: "text", raw: textMatch[0], text: textMatch[0] });
        remaining = remaining.slice(textMatch[0].length);
      } else {
        tokens.push({ type: "text", raw: remaining[0], text: remaining[0] });
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  }

  matchHr() {
    const cap = /^(-{3,}|\*{3,}|_{3,})(?:\n|$)/.exec(this.src);
    if (!cap) return false;

    this.tokens.push({
      type: "hr",
      raw: cap[0],
    });
    this.src = this.src.slice(cap[0].length);
    return true;
  }

  matchBlockquote() {
    const cap = /^>\s+(.+?)(?:\n|$)/.exec(this.src);
    if (!cap) return false;

    this.tokens.push({
      type: "blockquote",
      raw: cap[0],
      tokens: this.inlineTokenize(cap[1]),
    });
    this.src = this.src.slice(cap[0].length);
    return true;
  }

  matchList() {
    let cap = /^[-*+]\s+(.+?)(?:\n|$)/.exec(this.src);
    if (!cap) return false;

    const items = [];
    while (cap) {
      items.push({
        type: "listItem",
        raw: cap[0],
        tokens: this.inlineTokenize(cap[1]),
      });
      this.src = this.src.slice(cap[0].length);
      const nextCap = /^[-*+]\s+(.+?)(?:\n|$)/.exec(this.src);
      if (!nextCap) break;
      cap = nextCap;
    }

    this.tokens.push({
      type: "list",
      raw: items.map((i) => i.raw).join(""),
      tokens: items,
    });
    return true;
  }
}

class Renderer {
  render(tokens) {
    return tokens.map((t) => this.renderToken(t)).join("");
  }

  renderToken(token) {
    switch (token.type) {
      case "heading":
        return `<h${token.depth}>${this.renderInline(token.tokens || [])}</h${token.depth}>`;

      case "paragraph":
        return `<p>${this.renderInline(token.tokens || [])}</p>`;

      case "codeBlock":
        const lang = token.lang ? ` class="language-${token.lang}"` : "";
        return `<pre><code${lang}>${this.escapeHtml(token.text || "")}</code></pre>`;

      case "strong":
        return `<strong>${this.renderInline(token.tokens || [])}</strong>`;

      case "em":
        return `<em>${this.renderInline(token.tokens || [])}</em>`;

      case "code":
        return `<code>${this.escapeHtml(token.text || "")}</code>`;

      case "link":
        return `<a href="${this.escapeHtml(token.href || "")}">${this.escapeHtml(token.text || "")}</a>`;

      case "blockquote":
        return `<blockquote>${this.renderInline(token.tokens || [])}</blockquote>`;

      case "hr":
        return `<hr>`;

      case "list":
        return `<ul>${token.tokens ? token.tokens.map((t) => this.renderToken(t)).join("") : ""}</ul>`;

      case "listItem":
        return `<li>${this.renderInline(token.tokens || [])}</li>`;

      case "text":
        return this.escapeHtml(token.text || "");

      case "space":
        return " ";

      default:
        return "";
    }
  }

  renderInline(tokens) {
    return tokens.map((t) => this.renderToken(t)).join("");
  }

  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (c) => map[c]);
  }
}

class MarkdownParser {
  constructor() {
    this.lexer = null;
    this.renderer = new Renderer();
  }

  parse(markdown) {
    this.lexer = new Lexer(markdown);
    const tokens = this.lexer.tokenize();
    return this.renderer.render(tokens);
  }
}

const parser = new MarkdownParser();

export function parseMarkdown(text) {
  return parser.parse(text);
}

export { Lexer, Renderer, MarkdownParser };
