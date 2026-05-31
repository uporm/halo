import { Bubble, type BubbleItemType } from "@ant-design/x";
import { Button, Input, Space } from "antd";
import { useEffect, useState } from "react";

import type { ChatMessage } from "@/store/chatStore";

interface ChatPanelProps {
  messages: readonly ChatMessage[];
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export default function ChatPanel({
  messages,
  input,
  loading,
  onInputChange,
  onSubmit,
  onCancel,
}: ChatPanelProps) {
  const [isComposing, setIsComposing] = useState(false);
  // 输入框保留本地态，避免父级流式刷新消息列表时干扰当前输入和中文输入法组合态。
  const [localInput, setLocalInput] = useState(input);
  const items: BubbleItemType[] = messages.map((message) => ({
    key: message.id,
    role: message.role,
    content: message.content,
    loading: Boolean(message.pending && !message.content),
  }));

  useEffect(() => {
    // 这里只同步“外部已清空”的场景，避免把用户尚未提交的本地输入反复覆盖掉。
    if (!input) {
      setLocalInput("");
    }
  }, [input]);

  const submitMessage = () => {
    const value = localInput.trim();
    if (!value) {
      return;
    }

    onInputChange(value);
    onSubmit(value);
    setLocalInput("");
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "1fr auto",
        gap: 16,
        minHeight: 0,
        height: "100%",
      }}
    >
      <div
        style={{
          minHeight: 0,
          border: "1px solid #f0f0f0",
          borderRadius: 16,
          padding: 20,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <Bubble.List
          autoScroll
          items={items}
          role={{
            ai: {
              placement: "start",
              variant: "outlined",
              typing: { effect: "typing", interval: 24, step: 3 },
            },
            user: {
              placement: "end",
              variant: "filled",
            },
            system: {
              placement: "start",
              variant: "borderless",
            },
          }}
          style={{ height: "100%" }}
        />
      </div>

      <div
        style={{
          border: "1px solid #f0f0f0",
          borderRadius: 16,
          padding: 12,
          background: "#ffffff",
        }}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="描述你的目标，例如：帮我分析当前项目并给出阶段一实现方案"
            value={localInput}
            onChange={(event) => setLocalInput(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(event) => {
              setIsComposing(false);
              setLocalInput(event.currentTarget.value);
            }}
            onPressEnter={(event) => {
              if (event.shiftKey || isComposing) {
                return;
              }

              event.preventDefault();
              submitMessage();
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#8c8c8c", fontSize: 12 }}>
              Enter 发送，Shift + Enter 换行
            </span>
            <Space>
              {loading ? (
                <Button onClick={onCancel}>取消</Button>
              ) : null}
              <Button loading={loading} type="primary" onClick={submitMessage}>
                发送
              </Button>
            </Space>
          </div>
        </Space>
      </div>
    </div>
  );
}
