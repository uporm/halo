import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";

import { createPiSession, type AgentEventPayload, type PiAgentSession } from "../pi/session";

type PromptPayload = {
  sessionId: string;
  text: string;
};

// Pi 会话只保存在主进程，渲染进程通过 sessionId 间接引用，避免直接持有 Node 侧对象。
const activeSessions = new Map<string, PiAgentSession>();

function normalizeAgentError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Pi Agent 执行失败，请检查主进程日志。";

  if (message.includes("No API key found for the selected model")) {
    return [
      "当前选中的 Pi 模型没有可用凭证。",
      "请先在聊天页顶部填写 OpenAI 兼容协议的 Base URL、Model ID 和 API Key，",
      "然后保存到本地 electron-store。",
    ].join(" ");
  }

  return message;
}

function sendAgentEvent(
  event: IpcMainInvokeEvent,
  sessionId: string,
  payload: AgentEventPayload,
) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    return;
  }

  // 事件只回推到发起请求的窗口，并按 sessionId 分频道，避免多窗口或多任务串台。
  win.webContents.send(`agent:event:${sessionId}`, payload);
}

async function getOrCreateSession(
  event: IpcMainInvokeEvent,
  sessionId: string,
): Promise<PiAgentSession> {
  const existingSession = activeSessions.get(sessionId);
  if (existingSession) {
    return existingSession;
  }

  const session = await createPiSession({
    onEvent: (agentEvent) => {
      sendAgentEvent(event, sessionId, agentEvent);
    },
  });

  activeSessions.set(sessionId, session);
  return session;
}

export function registerAgentIpc() {
  ipcMain.removeHandler("agent:prompt");
  ipcMain.removeHandler("agent:cancel");

  ipcMain.handle("agent:prompt", async (event, payload: PromptPayload) => {
    const session = await getOrCreateSession(event, payload.sessionId);

    // prompt 会持续流式产出事件，这里立即返回，由渲染进程继续通过 IPC 订阅增量结果。
    void session.prompt(payload.text).catch((error: unknown) => {
      sendAgentEvent(event, payload.sessionId, {
        type: "error",
        message: normalizeAgentError(error),
      });
    });

    return { ok: true as const };
  });

  ipcMain.handle("agent:cancel", async (_event, sessionId: string) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      await session.abort();
    }
  });
}

export function disposeActiveSessions() {
  activeSessions.forEach((session) => {
    session.dispose();
  });
  activeSessions.clear();
}

export function resetActiveSessions() {
  disposeActiveSessions();
}
