import { config } from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { ChatMessage } from "../langchain/chain";
import { workerPool, GenerateResult } from "../queue/workerPool";

config({ path: ".env.local" });

const PORT = parseInt(process.env.WEBSOCKET_PORT || "8080");
const HOST = process.env.WEBSOCKET_HOST || "localhost";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface WebSocketMessage {
  messageId: string;
  sessionId: string;
  messages: ChatMessage[];
}

interface WebSocketResponse {
  messageId: string;
  sessionId: string;
  type: "chunk" | "tool_calls" | "done" | "error";
  data: unknown;
}

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || `${API_BASE_URL},${API_BASE_URL}:3001`
).split(",");

const wss = new WebSocketServer({
  port: PORT,
  verifyClient: (info, callback) => {
    const origin = info.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(true);
    } else {
      console.warn("WebSocket connection rejected from origin:", origin);
      callback(false, 403, "Forbidden");
    }
  },
});

console.log(`WebSocket server started on ${HOST}:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("New WebSocket connection");

  ws.on("message", async (data: string) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log("Received message for session:", message.sessionId);

      try {
        const result: GenerateResult = await workerPool.process(
          message.sessionId,
          message.messages,
          (chunk: string) => {
            const response: WebSocketResponse = {
              messageId: message.messageId,
              sessionId: message.sessionId,
              type: "chunk",
              data: chunk,
            };
            ws.send(JSON.stringify(response));
          }
        );

        // 发送 tool_calls（如果存在）
        if (result.toolCalls.length > 0) {
          const toolCallsResponse: WebSocketResponse = {
            messageId: message.messageId,
            sessionId: message.sessionId,
            type: "tool_calls",
            data: result.toolCalls,
          };
          ws.send(JSON.stringify(toolCallsResponse));
        }

        // 发送完成
        const doneResponse: WebSocketResponse = {
          messageId: message.messageId,
          sessionId: message.sessionId,
          type: "done",
          data: {
            content: result.content,
            finishReason: result.finishReason,
          },
        };
        ws.send(JSON.stringify(doneResponse));
      } catch (error) {
        console.error("workerPool.process error:", error);
        const errorResponse: WebSocketResponse = {
          messageId: message.messageId,
          sessionId: message.sessionId,
          type: "error",
          data: error instanceof Error ? error.message : "Unknown error",
        };
        ws.send(JSON.stringify(errorResponse));
      }
    } catch (error) {
      console.error("Failed to process WebSocket message:", error);
      const errorResponse: WebSocketResponse = {
        messageId: "",
        sessionId: "",
        type: "error",
        data: error instanceof Error ? error.message : "Unknown error",
      };
      try {
        ws.send(JSON.stringify(errorResponse));
      } catch (sendError) {
        console.error("Failed to send error response:", sendError);
      }
    }
  });

  ws.on("close", (code, reason) => {
    console.log("WebSocket connection closed:", code, reason.toString());
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

export { wss };
