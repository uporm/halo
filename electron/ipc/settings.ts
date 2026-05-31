import { ipcMain } from "electron";

import { resetActiveSessions } from "./agent";

export function registerSettingsIpc() {
  ipcMain.removeHandler("settings:get-openai-compatible-config");
  ipcMain.removeHandler("settings:set-openai-compatible-config");
  ipcMain.removeHandler("settings:clear-openai-compatible-config");

  ipcMain.handle("settings:get-openai-compatible-config", async () => {
    const { default: Store } = await import("electron-store");
    const store = new Store<{
      apiKey?: string;
      openaiBaseUrl?: string;
      openaiModelId?: string;
    }>();

    return {
      hasConfig: Boolean(
        store.get("apiKey") && store.get("openaiBaseUrl") && store.get("openaiModelId"),
      ),
      baseUrl: store.get("openaiBaseUrl") ?? "",
      modelId: store.get("openaiModelId") ?? "",
    };
  });

  ipcMain.handle(
    "settings:set-openai-compatible-config",
    async (
      _event,
      payload: {
        apiKey: string;
        baseUrl: string;
        modelId: string;
      },
    ) => {
      const { default: Store } = await import("electron-store");
      const store = new Store<{
        apiKey?: string;
        openaiBaseUrl?: string;
        openaiModelId?: string;
      }>();

      store.set("apiKey", payload.apiKey.trim());
      store.set("openaiBaseUrl", payload.baseUrl.trim());
      store.set("openaiModelId", payload.modelId.trim());
      // Pi 会话在创建时就绑定模型与凭证，配置变更后必须丢弃旧会话才能避免继续复用旧设置。
      resetActiveSessions();

      return { ok: true as const };
    },
  );

  ipcMain.handle("settings:clear-openai-compatible-config", async () => {
    const { default: Store } = await import("electron-store");
    const store = new Store<{
      apiKey?: string;
      openaiBaseUrl?: string;
      openaiModelId?: string;
    }>();

    store.delete("apiKey");
    store.delete("openaiBaseUrl");
    store.delete("openaiModelId");
    // 清空配置后旧会话也必须失效，否则仍可能沿用已加载到内存中的凭证。
    resetActiveSessions();

    return { ok: true as const };
  });
}
