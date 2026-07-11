const Pusher = require("pusher");
const { config } = require("dotenv");
const http = require("http");

config({ path: ".env.local" });

const pusher = new Pusher({
  appId: "2169048",
  key: "284ff1815798c6f1cc77",
  secret: "9e6f2c4134b6ab346857",
  cluster: "ap1",
  useTLS: true,
});

const CHANNEL_NAME = "chat-channel";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const PORT = process.env.PUSHER_SERVER_PORT || 8081;

function chunkText(text, size = 50) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function callDeepSeekStream(
  sessionId,
  messageId,
  prompt,
  onChunk,
  onDone,
  onError,
) {
  const chunks = chunkText("正在连接 AI 服务... \n\n");
  let sentIndex = 0;

  const sendChunk = () => {
    if (sentIndex < chunks.length) {
      onChunk(chunks[sentIndex]);
      sentIndex++;
      setTimeout(sendChunk, 100);
    } else {
      if (!DEEPSEEK_API_KEY) {
        onDone("请配置 DEEPSEEK_API_KEY");
        return;
      }
      // 实际调用 DeepSeek
      makeDeepSeekRequest(
        sessionId,
        messageId,
        prompt,
        onChunk,
        onDone,
        onError,
      );
    }
  };

  sendChunk();
}

function makeDeepSeekRequest(
  sessionId,
  messageId,
  prompt,
  onChunk,
  onDone,
  onError,
) {
  const https = require("https");

  const body = JSON.stringify({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  const options = {
    hostname: "api.deepseek.com",
    path: "/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Length": Buffer.byteLength(body),
    },
  };

  const req = https.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
      const lines = data.split("\n");
      data = lines.pop();

      for (const line of lines) {
        if (line.startsWith("data:") && !line.includes("[DONE]")) {
          try {
            const jsonStr = line.slice(5).trim();
            const json = JSON.parse(jsonStr);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // ignore parse error
          }
        }
      }
    });

    res.on("end", () => {
      onDone("完成");
    });
  });

  req.on("error", (e) => {
    onError(e.message);
  });

  req.write(body);
  req.end();
}

// 处理客户端消息
const pendingRequests = new Map();

const server = http.createServer((req, res) => {
  // CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/trigger" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const { messageId, sessionId, message } = JSON.parse(body);
        console.log(`收到消息: ${sessionId} - ${message}`);

        // 调用 AI 并通过 Pusher 推送结果
        callDeepSeekStream(
          sessionId,
          messageId,
          message,
          (chunk) => {
            pusher.trigger(CHANNEL_NAME, "chunk", {
              messageId,
              sessionId,
              type: "chunk",
              data: chunk,
            });
          },
          (result) => {
            pusher.trigger(CHANNEL_NAME, "done", {
              messageId,
              sessionId,
              type: "done",
              data: result,
            });
          },
          (error) => {
            pusher.trigger(CHANNEL_NAME, "error", {
              messageId,
              sessionId,
              type: "error",
              data: error,
            });
          },
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Pusher 触发服务已启动: http://localhost:${PORT}/trigger`);
  console.log("等待客户端消息...");
});
