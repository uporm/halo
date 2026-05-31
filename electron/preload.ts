import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  prompt: (sessionId: string, text: string) =>
    ipcRenderer.invoke("agent:prompt", { sessionId, text }),
  cancel: (sessionId: string) => ipcRenderer.invoke("agent:cancel", sessionId),
  getOpenAICompatibleConfig: () => ipcRenderer.invoke("settings:get-openai-compatible-config"),
  setOpenAICompatibleConfig: (payload: {
    apiKey: string;
    baseUrl: string;
    modelId: string;
  }) => ipcRenderer.invoke("settings:set-openai-compatible-config", payload),
  clearOpenAICompatibleConfig: () =>
    ipcRenderer.invoke("settings:clear-openai-compatible-config"),
  onAgentEvent: (sessionId: string, callback: (event: { type: string }) => void) => {
    // 按 sessionId 订阅独立频道，渲染进程可以并发监听多个任务而不混淆事件来源。
    const channel = `agent:event:${sessionId}`;
    const handler = (_event: unknown, payload: { type: string }) => {
      callback(payload);
    };

    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
