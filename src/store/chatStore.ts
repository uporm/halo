import { proxy } from "valtio";

export type ChatRole = "user" | "ai" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
}

interface ChatState {
  sessionId: string;
  draft: string;
  isRunning: boolean;
  currentReplyId: string | null;
  lastError: string | null;
  messages: ChatMessage[];
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const chatStore = proxy<ChatState>({
  sessionId: createId(),
  draft: "",
  isRunning: false,
  currentReplyId: null,
  lastError: null,
  messages: [
    {
      id: "welcome",
      role: "system",
      content: "欢迎使用 Halo AI Agent。输入你的目标后，Agent 会在 Electron 主进程中开始执行。",
    },
  ],
});

export function setDraft(value: string) {
  chatStore.draft = value;
}

export function appendUserMessage(content: string) {
  chatStore.messages.push({
    id: createId(),
    role: "user",
    content,
  });
}

export function startAgentRun() {
  chatStore.isRunning = true;
  chatStore.lastError = null;
  // 一次运行只维护一个正在流式写入的回复槽位，后续 delta 都归并到这条消息上。
  chatStore.currentReplyId = createId();
}

export function appendAssistantDelta(delta: string) {
  if (!chatStore.currentReplyId) {
    chatStore.currentReplyId = createId();
  }

  const currentReplyId = chatStore.currentReplyId;
  let message = chatStore.messages.find((item) => item.id === currentReplyId);

  if (!message) {
    // 首个 delta 到达时再创建 AI 消息，避免启动后无输出也先出现一条空白回复。
    message = {
      id: currentReplyId,
      role: "ai",
      content: "",
      pending: true,
    };
    chatStore.messages.push(message);
  }

  message.content += delta;
  message.pending = false;
}

export function completeAgentRun() {
  if (chatStore.currentReplyId) {
    const message = chatStore.messages.find((item) => item.id === chatStore.currentReplyId);
    if (message) {
      message.pending = false;
    }
  }

  chatStore.isRunning = false;
  chatStore.currentReplyId = null;
}

export function setAgentError(message: string) {
  chatStore.lastError = message;
  chatStore.isRunning = false;

  if (chatStore.currentReplyId) {
    const reply = chatStore.messages.find((item) => item.id === chatStore.currentReplyId);
    if (reply) {
      reply.pending = false;
    }
  }
}
