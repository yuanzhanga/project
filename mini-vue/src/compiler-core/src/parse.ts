import { ElementTypes, NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

function createParserContext(content) {
  console.log("创建 paserContext");
  return {
    source: content,
  };
}

//解析出所有孩子
function parseChildren(context, ancestors/**用于收集标签的栈[]*/) {
  console.log("开始解析 children");
  const nodes: any = [];

  while (!isEnd(context, ancestors/**用于收集标签的栈[]*/)) {
    let node;
    const s = context.source;

    if (startsWith(s, "{{")) {
      // 看看如果是 {{ 开头的话，那么就是一个插值， 那么去解析他
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      if (s[1] === "/") {
        // 这里属于 edge case 可以不用关心
        // 处理结束标签
        if (/[a-z]/i.test(s[2])) {
          // 匹配 </div>
          // 需要改变 context.source 的值 -> 也就是需要移动光标
          parseTag(context, TagType.End);
          // 结束标签就认为这都已经处理完了，所以就可以跳出本次循环了
          continue;
        }
      } else if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }

  return nodes;
}

//是否标签结束
function isEnd(context: any, ancestors) {
  // 检测标签的节点
  // 如果是结束标签的话，需要看看之前有没有开始标签，如果有的话，那么也应该结束
  // 这里的一个 edge case 是 <div><span></div>
  // 像这种情况下，其实就应该报错
  const s = context.source;
  //遇到结束标签时从栈中找到对应的开始标签
  if (context.source.startsWith("</")) {
    // 从后面往前面查 性能好一点
    // 因为标签如果存在的话 应该是ancestors栈的最后一个元素
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }

  // 看看 context.source 还有没有值
  return !context.source;
}

//*解析元素
function parseElement(context, ancestors) {
  // 解析tag <div></div>
  const element = parseTag(context, TagType.Start);

  ancestors.push(element);
  const children = parseChildren(context, ancestors);//递归
  ancestors.pop();

  // 解析 end tag 是为了检测语法是不是正确的
  // 检测是不是和 start tag 一致
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`缺失结束标签：${element.tag}`);
  }

  element.children = children;

  return element;
}

function startsWithEndTagOpen(source: string, tag: string) {
  // 1. 头部 是不是以  </ 开头的
  // 2. 转换大小写 看看是不是和 tag 一样
  return (
    startsWith(source, "</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

//解析元素中解析标签
function parseTag(context: any, type: TagType): any {
  // 发现如果不是 > 的话，那么就把字符都收集起来 ->div
  // 正则
  const match: any = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
  const tag = match[1];

  // 移动光标，向前推进
  // <div
  advanceBy(context, match[0].length);

  // 暂时不处理 selfClose 单标签的情况 ，所以可以直接 advanceBy 1个坐标 <  的下一个就是 >
  advanceBy(context, 1);

  if (type === TagType.End) return;

  let tagType = ElementTypes.ELEMENT;

  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType,
  };
}

//*解析插值
function parseInterpolation(context: any) {
  // 1. 先获取到结束的index
  // 2. 通过 closeIndex - startIndex 获取到内容的长度 contextLength
  // 3. 通过 slice 截取内容

  // }} 是插值的关闭
  // 优化点是从 {{ 后面搜索即可
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  // TODO closeIndex -1 需要报错的

  // 让代码前进2个长度，可以把 {{ 干掉
  advanceBy(context, 2);

  const rawContentLength = closeIndex - openDelimiter.length;
  const rawContent = context.source.slice(0, rawContentLength);

  const preTrimContent = parseTextData(context, rawContent.length);
  const content = preTrimContent.trim();

  // 最后在让代码前进2个长度，可以把 }} 干掉
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

//解析文本
function parseText(context): any {
  console.log("解析 text", context);

  // endIndex 应该看看有没有对应的 <
  // 比如 hello</div>
  // 像这种情况下 endIndex 就应该是在 o 这里
  const endTokens = ["<", "{{"];
  let endIndex = context.source.length;
  //确认endIndex值
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    // endIndex > index 是需要要 endIndex 尽可能的小
    // 比如说：
    // hi, {{123}} <div></div>
    // 那么这里就应该停到 {{ 这里，而不是停到 <div 这里
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, length: number): any {
  console.log("解析 textData");
  // 1. 直接返回 context.source
  // 从 length 切的话，是为了可以获取到 text 的值（需要用一个范围来确定）
  const rawText = context.source.slice(0, length);
  // 2. 移动光标
  advanceBy(context, length);

  return rawText;
}

//content字符串要处理的光标向前推进
function advanceBy(context, numberOfCharacters) {
  context.source = context.source.slice(numberOfCharacters);
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
  };
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
}
