import { useEffect } from "react";
import { useSnapshot } from "valtio";

import {
  appendAssistantDelta,
  appendUserMessage,
  chatStore,
  completeAgentRun,
  setAgentError,
  setDraft,
  startAgentRun,
} from "@/store/chatStore";

type AgentEventPayload = Record<string, unknown> & {
  type: string;
};

function isTextDeltaEvent(
  event: AgentEventPayload,
): event is AgentEventPayload & {
  assistantMessageEvent: { type: "text_delta"; delta: string };
} {
  const assistantMessageEvent = event.assistantMessageEvent as
    | { type?: string; delta?: string }
    | undefined;

  return (
    event.type === "message_update" &&
    assistantMessageEvent?.type === "text_delta" &&
    typeof assistantMessageEvent.delta === "string"
  );
}

function getErrorMessage(event: AgentEventPayload) {
  if (typeof event.message === "string" && event.message) {
    return event.message;
  }

  return "Agent 执行失败，请检查 Pi SDK 配置与 API Key。";
}

export function useAgentSession() {
  const snapshot = useSnapshot(chatStore);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    // sessionId 变化时切换订阅对象，并依赖 effect 清理旧监听，避免历史任务继续写入当前页面状态。
    return window.electronAPI.onAgentEvent(snapshot.sessionId, (event) => {
      if (isTextDeltaEvent(event)) {
        appendAssistantDelta(event.assistantMessageEvent.delta);
        return;
      }

      if (event.type === "tool_execution_start" || event.type === "tool_execution_end") {
        console.log("[pi-agent:event]", event);
        return;
      }

      if (event.type === "agent_end") {
        completeAgentRun();
        return;
      }

      if (event.type === "error") {
        setAgentError(getErrorMessage(event));
      }
    });
  }, [snapshot.sessionId]);

  const sendMessage = async (message: string) => {
    const content = message.trim();
    if (!content || snapshot.isRunning) {
      return;
    }

    if (typeof window === "undefined" || !window.electronAPI) {
      setAgentError("当前页面没有运行在 Electron 环境中，无法调用主进程 Agent。");
      return;
    }

    appendUserMessage(content);
    setDraft("");
    startAgentRun();

    try {
      await window.electronAPI.prompt(snapshot.sessionId, content);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "发送消息失败，请稍后重试。";
      setAgentError(messageText);
    }
  };

  const cancelMessage = async () => {
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    try {
      await window.electronAPI.cancel(snapshot.sessionId);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "取消任务失败，请稍后重试。";
      setAgentError(messageText);
    }
  };

  return {
    sessionId: snapshot.sessionId,
    messages: snapshot.messages,
    input: snapshot.draft,
    isRunning: snapshot.isRunning,
    errorMessage: snapshot.lastError,
    sendMessage,
    cancelMessage,
    setInput: setDraft,
  };
}
