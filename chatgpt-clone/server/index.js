require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const uploads = {};

async function chatWithDeepSeek(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("请配置 DeepSeek 的 API Key");
  }

  const endpoint = "https://api.deepseek.com/chat/completions";
  const chatMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 调用失败: ${response.status} - ${errorText}`);
  }

  return response.body;
}

async function chatWithOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("请配置 OpenAI 的 API Key");
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const chatMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 调用失败: ${response.status} - ${errorText}`);
  }

  return response.body;
}

async function chatWithTongyi(messages) {
  const apiKey = process.env.TONGYI_API_KEY;
  const baseUrl = process.env.TONGYI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = process.env.TONGYI_MODEL || "qwen-turbo";

  if (!apiKey || apiKey === "your_tongyi_api_key") {
    throw new Error("请配置 通义千问 的 API Key");
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const chatMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 调用失败: ${response.status} - ${errorText}`);
  }

  return response.body;
}

async function streamResponse(stream, res) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

        const dataStr = trimmedLine.slice(5).trim();
        if (dataStr === "[DONE]") {
          res.write(encoder.encode("data: [DONE]\n\n"));
          continue;
        }

        try {
          const data = JSON.parse(dataStr);

          if (
            data.choices &&
            data.choices[0].delta &&
            data.choices[0].delta.content
          ) {
            const content = data.choices[0].delta.content;
            const chars = content.split("");
            for (const char of chars) {
              const chunk = `data: ${JSON.stringify(char)}\n\n`;
              res.write(encoder.encode(chunk));
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } finally {
    res.write(encoder.encode("data: [DONE]\n\n"));
    res.end();
  }
}

const MOCK_RESPONSES = {
  default: `你好！我是 AI 助手。很高兴认识你！

我可以帮助你完成很多事情，比如：

1. **回答问题** - 可以回答各种知识性问题
2. **编写代码** - 帮助你写 Python、JavaScript、Java 等代码
3. **写作辅助** - 帮你写文章、邮件、报告等
4. **学习辅导** - 解释复杂的概念，帮助学习

有什么我可以帮助你的吗？`,

  code: `好的，这是一个 **JavaScript 版本的冒泡排序**：

\`\`\`javascript
function bubbleSort(arr) {
  const len = arr.length;
  for (let i = 0; i < len - 1; i++) {
    for (let j = 0; j < len - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

// 示例用法
const arr = [64, 34, 25, 12, 22, 11, 90];
console.log(bubbleSort(arr));
\`\`\``,

  intro: `我是一个基于 Vue 3 构建的 AI 编程协作工作台！

**主要功能：**
- 支持多会话管理
- 支持多种 AI 模型提供商
- 实时流式响应
- 文件上传功能
- 会话历史持久化

**支持的模型：**
- DeepSeek
- OpenAI
- 通义千问
- Mock（测试模式）`,

  hello: `你好！👋 很高兴为你服务！

有什么我可以帮助你的吗？`,
};

function getMockResponse(userMessage) {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes("排序") || lowerMsg.includes("算法")) {
    return MOCK_RESPONSES.code;
  }
  if (lowerMsg.includes("自己") || lowerMsg.includes("介绍")) {
    return MOCK_RESPONSES.intro;
  }
  if (lowerMsg.includes("你好") || lowerMsg.includes("hi") || lowerMsg.includes("hello")) {
    return MOCK_RESPONSES.hello;
  }

  return `收到你的消息： "${userMessage}"

这是一个测试回复。配置好真实的 API 后就可以体验真正的 AI 对话了。`;
}

async function streamMockText(res, text, delay = 15) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const encoder = new TextEncoder();

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const data = JSON.stringify(char);
    const chunk = `data: ${data}\n\n`;
    res.write(encoder.encode(chunk));
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  res.write(encoder.encode("data: [DONE]\n\n"));
  res.end();
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, provider } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages 是必需参数" });
    }

    const lastMessage = messages.filter((m) => m.role === "user").pop();
    const userContent = lastMessage?.content || "";

    console.log("收到消息:", userContent);

    const selectedProvider = provider || process.env.MODEL_PROVIDER || "mock";
    console.log("使用的模型:", selectedProvider);

    if (selectedProvider === "deepseek") {
      console.log("正在调用 DeepSeek API...");
      const stream = await chatWithDeepSeek(messages);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      await streamResponse(stream, res);
      return;
    }

    if (selectedProvider === "openai") {
      console.log("正在调用 OpenAI API...");
      const stream = await chatWithOpenAI(messages);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      await streamResponse(stream, res);
      return;
    }

    if (selectedProvider === "tongyi") {
      console.log("正在调用 通义千问 API...");
      const stream = await chatWithTongyi(messages);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      await streamResponse(stream, res);
      return;
    }

    console.log("使用 Mock 模式...");
    const mockResponse = getMockResponse(userContent);
    await streamMockText(res, mockResponse);
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({
      error: error.message || "服务器内部错误",
    });
  }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const { chunk, totalChunks, fileName } = req.body;
    const fileData = req.file;

    if (!fileData || !chunk || !totalChunks || !fileName) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const fileKey = fileName;
    if (!uploads[fileKey]) {
      uploads[fileKey] = {
        chunks: [],
        totalChunks: parseInt(totalChunks),
        receivedChunks: 0,
      };
    }

    const fs = require("fs");
    const chunkData = fs.readFileSync(fileData.path);
    uploads[fileKey].chunks[parseInt(chunk) - 1] = chunkData;
    uploads[fileKey].receivedChunks++;

    fs.unlinkSync(fileData.path);

    if (uploads[fileKey].receivedChunks === uploads[fileKey].totalChunks) {
      const outputPath = path.join(__dirname, "uploads", fileName);
      const writeStream = fs.createWriteStream(outputPath);

      for (let i = 0; i < uploads[fileKey].totalChunks; i++) {
        writeStream.write(uploads[fileKey].chunks[i]);
      }

      writeStream.end();

      delete uploads[fileKey];

      res.json({
        success: true,
        message: "文件上传完成",
        fileName: fileName,
      });
    } else {
      res.json({
        success: true,
        message: "分片上传成功",
        chunk: chunk,
        totalChunks: totalChunks,
      });
    }
  } catch (error) {
    console.error("文件上传错误:", error);
    res.status(500).json({
      error: error.message || "文件上传失败",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    provider: process.env.MODEL_PROVIDER || "mock",
    message: `当前模式: ${process.env.MODEL_PROVIDER || "mock"}`,
  });
});

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 服务器运行在 http://localhost:" + PORT);
  console.log("📝 API 端点: http://localhost:" + PORT + "/api/chat");
  console.log("📤 上传端点: http://localhost:" + PORT + "/api/upload");
  console.log("⚡ 当前模式: " + (process.env.MODEL_PROVIDER || "mock"));
  console.log("=".repeat(50));
});