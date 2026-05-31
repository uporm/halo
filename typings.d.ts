import 'umi/typings';

declare global {
  interface Window {
    electronAPI: {
      prompt: (sessionId: string, text: string) => Promise<{ ok: true }>;
      cancel: (sessionId: string) => Promise<void>;
      getOpenAICompatibleConfig: () => Promise<{
        hasConfig: boolean;
        baseUrl: string;
        modelId: string;
      }>;
      setOpenAICompatibleConfig: (payload: {
        apiKey: string;
        baseUrl: string;
        modelId: string;
      }) => Promise<{ ok: true }>;
      clearOpenAICompatibleConfig: () => Promise<{ ok: true }>;
      onAgentEvent: (
        sessionId: string,
        callback: (event: Record<string, unknown> & { type: string }) => void,
      ) => () => void;
    };
  }
}

export {};
