import { config } from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { chatChainService, ChatMessage } from "../langchain/chain";
import { workerPool } from "../queue/workerPool";

config({ path: ".env.local" });

const PORT = parseInt(process.env.WEBSOCKET_PORT || "8080");
const HOST = process.env.WEBSOCKET_HOST || "localhost";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface WebSocketMessage {
  messageId: string;
  sessionId: string;
  message: string;
}

interface WebSocketResponse {
  messageId: string;
  sessionId: string;
  type: "chunk" | "done" | "error";
  data: string;
}

const wss = new WebSocketServer({
  port: PORT,
  verifyClient: (info, callback) => {
    const origin = info.origin;
    if (origin === API_BASE_URL || origin === `${API_BASE_URL}:3001`) {
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
      console.log("Received message:", message);

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: message.message,
        timestamp: Date.now(),
      };
      console.log("Adding user message to memory:", message.sessionId);
      await chatChainService.addMessageToMemory(message.sessionId, userMessage);
      console.log("User message added to memory");

      try {
        console.log("Starting workerPool.process:", message.sessionId);
        const response = await workerPool.process(
          message.sessionId,
          message.message,
          (chunk: string) => {
            console.log("Received chunk, sending:", chunk.slice(0, 50));
            const response: WebSocketResponse = {
              messageId: message.messageId,
              sessionId: message.sessionId,
              type: "chunk",
              data: chunk,
            };
            ws.send(JSON.stringify(response));
          },
        );
        console.log(
          "workerPool.process completed, response length:",
          response.length,
        );

        const aiMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };
        await chatChainService.addMessageToMemory(message.sessionId, aiMessage);

        const doneResponse: WebSocketResponse = {
          messageId: message.messageId,
          sessionId: message.sessionId,
          type: "done",
          data: response,
        };
        console.log("Sending done response");
        ws.send(JSON.stringify(doneResponse));
        console.log("Done response sent");
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
