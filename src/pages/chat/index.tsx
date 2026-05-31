import { App, Alert, Button, Card, Input, Space, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";

import ChatPanel from "@/components/ChatPanel";
import { useAgentSession } from "@/hooks/useAgentSession";

export default function ChatPage() {
  const { message } = App.useApp();
  const lastErrorRef = useRef<string | null>(null);
  const hasElectronApi = typeof window !== "undefined" && Boolean(window.electronAPI);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelId, setModelId] = useState("");
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const { messages, input, isRunning, errorMessage, sendMessage, cancelMessage, setInput } =
    useAgentSession();

  useEffect(() => {
    if (!hasElectronApi) {
      return;
    }

    let active = true;

    void window.electronAPI.getOpenAICompatibleConfig().then((result) => {
      // 配置读取是异步的，页面切走后不再回填状态，避免卸载组件继续 setState。
      if (active) {
        setHasStoredApiKey(result.hasConfig);
        setBaseUrl(result.baseUrl);
        setModelId(result.modelId);
      }
    });

    return () => {
      active = false;
    };
  }, [hasElectronApi]);

  useEffect(() => {
    if (!errorMessage || lastErrorRef.current === errorMessage) {
      return;
    }

    // 流式阶段同一错误可能被重复写回 store，这里按最后一次文案去重，避免连续弹出相同提示。
    lastErrorRef.current = errorMessage;
    void message.error(errorMessage);
  }, [errorMessage, message]);

  const handleSaveApiKey = async () => {
    const key = apiKey.trim();
    const normalizedBaseUrl = baseUrl.trim();
    const normalizedModelId = modelId.trim();

    if (!key || !normalizedBaseUrl || !normalizedModelId) {
      void message.warning("请完整填写 Base URL、Model ID 和 API Key。");
      return;
    }

    setSavingApiKey(true);
    try {
      await window.electronAPI.setOpenAICompatibleConfig({
        apiKey: key,
        baseUrl: normalizedBaseUrl,
        modelId: normalizedModelId,
      });
      setApiKey("");
      setHasStoredApiKey(true);
      void message.success("OpenAI 兼容配置已保存到本地 electron-store。");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "保存 OpenAI 兼容配置失败。");
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleClearApiKey = async () => {
    setSavingApiKey(true);
    try {
      await window.electronAPI.clearOpenAICompatibleConfig();
      setApiKey("");
      setBaseUrl("");
      setModelId("");
      setHasStoredApiKey(false);
      void message.success("已清除本地保存的 OpenAI 兼容配置。");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "清除 OpenAI 兼容配置失败。");
    } finally {
      setSavingApiKey(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 8 }}>
          Halo AI Agent
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          阶段一已接通 Electron 主进程 IPC。这里先提供最小对话体验，支持发送、流式返回与取消任务。
        </Typography.Paragraph>
      </div>

      {!hasElectronApi ? (
        <Alert
          type="warning"
          title="当前未检测到 Electron preload 注入，请使用 yarn dev 通过 Electron 窗口打开应用。"
          showIcon
        />
      ) : null}

      {hasElectronApi ? (
        <Card
          size="small"
          title="OpenAI 兼容配置"
          extra={hasStoredApiKey ? <Tag color="success">已配置</Tag> : <Tag>未配置</Tag>}
        >
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              这里会把 OpenAI 兼容协议所需的 `Base URL`、`Model ID` 和 `API Key`
              保存到本机 `electron-store`。保存后会重置当前 Agent 会话，新的消息将使用最新配置。
            </Typography.Paragraph>
            <Input
              placeholder="Base URL，例如 https://api.openai.com/v1"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
            <Input
              placeholder="Model ID，例如 gpt-4o-mini 或你的兼容服务模型名"
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
            />
            <Input.Password
              placeholder="输入 API Key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <Space>
              <Button loading={savingApiKey} type="primary" onClick={handleSaveApiKey}>
                保存配置
              </Button>
              <Button danger disabled={!hasStoredApiKey} onClick={handleClearApiKey}>
                清除配置
              </Button>
            </Space>
          </Space>
        </Card>
      ) : null}

      <ChatPanel
        messages={messages}
        input={input}
        loading={isRunning}
        onInputChange={setInput}
        onSubmit={sendMessage}
        onCancel={cancelMessage}
      />
    </Space>
  );
}
