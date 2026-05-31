import path from "node:path";
import dotenv from "dotenv";

export type AgentEventPayload = Record<string, unknown> & { type: string };

export interface PiAgentSession {
  prompt: (input: string) => Promise<unknown>;
  abort: () => Promise<void>;
  dispose: () => void;
  subscribe: (listener: (event: AgentEventPayload) => void) => () => void;
}

interface PiSessionOptions {
  onEvent: (event: AgentEventPayload) => void;
}

export async function createPiSession({
  onEvent,
}: PiSessionOptions): Promise<PiAgentSession> {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  const [{ default: Store }, piAgent] = await Promise.all([
    import("electron-store"),
    import("@earendil-works/pi-coding-agent"),
  ]);
  const {
    AuthStorage,
    createAgentSession,
    DefaultResourceLoader,
    getAgentDir,
    ModelRegistry,
    SessionManager,
    SettingsManager,
  } = piAgent;

  const store = new Store<{
    apiKey?: string;
    openaiBaseUrl?: string;
    openaiModelId?: string;
  }>();
  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const settingsManager = SettingsManager.create(cwd, agentDir);
  const authStorage = AuthStorage.create(path.join(agentDir, "auth.json"));
  const modelRegistry = ModelRegistry.create(authStorage, path.join(agentDir, "models.json"));

  const openaiBaseUrl = store.get("openaiBaseUrl");
  const openaiModelId = store.get("openaiModelId");
  const apiKey = store.get("apiKey") ?? process.env.ANTHROPIC_API_KEY;

  let selectedModel;

  if (openaiBaseUrl && openaiModelId && store.get("apiKey")) {
    modelRegistry.registerProvider("halo-openai-compatible", {
      name: "Halo OpenAI Compatible",
      baseUrl: openaiBaseUrl,
      api: "openai-completions",
      apiKey: store.get("apiKey"),
      authHeader: true,
      models: [
        {
          id: openaiModelId,
          name: openaiModelId,
          reasoning: false,
          input: ["text"],
          contextWindow: 128000,
          maxTokens: 16384,
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
          },
        },
      ],
    });

    selectedModel = modelRegistry.find("halo-openai-compatible", openaiModelId);
  } else if (apiKey) {
    // 运行时注入凭证，避免要求用户把默认 provider 的密钥写入 Pi 自身配置文件。
    authStorage.setRuntimeApiKey("anthropic", apiKey);
  }

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
  });
  // 会话创建前先刷新资源，确保最新技能与设置已经加载进本次主进程会话。
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd,
    authStorage,
    model: selectedModel,
    modelRegistry,
    resourceLoader,
    // 当前阶段不跨重启恢复会话，避免旧上下文和新配置混用。
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager,
    tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
  });

  session.subscribe(onEvent);
  return session as PiAgentSession;
}
