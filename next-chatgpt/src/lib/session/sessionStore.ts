import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { ChatSession, ChatMessage } from "@/lib/langchain/chain";

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

/**
 * 基于本地 JSON 文件的后端会话存储。
 * 相比浏览器 localStorage，可跨刷新/多设备保持，且服务端可直接读取。
 */
class SessionStore {
  private ensureFile(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, "[]", "utf-8");
    }
  }

  private read(): ChatSession[] {
    this.ensureFile();
    try {
      const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as ChatSession[]) : [];
    } catch {
      return [];
    }
  }

  private write(sessions: ChatSession[]): void {
    this.ensureFile();
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  }

  getAll(): ChatSession[] {
    return this.read();
  }

  get(id: string): ChatSession | undefined {
    return this.read().find((s) => s.id === id);
  }

  create(id?: string): ChatSession {
    const now = Date.now();
    const session: ChatSession = {
      id: id || uuidv4(),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const sessions = this.read();
    sessions.unshift(session);
    this.write(sessions);
    return session;
  }

  update(id: string, messages: ChatMessage[]): ChatSession | null {
    const sessions = this.read();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return null;
    sessions[index] = {
      ...sessions[index],
      messages,
      updatedAt: Date.now(),
    };
    this.write(sessions);
    return sessions[index];
  }

  remove(id: string): boolean {
    const sessions = this.read();
    const next = sessions.filter((s) => s.id !== id);
    if (next.length === sessions.length) return false;
    this.write(next);
    return true;
  }
}

export const sessionStore = new SessionStore();
