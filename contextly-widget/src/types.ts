export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  status?: "pending" | "complete" | "error" | "stopped";
};

export interface ChatConfig {
  projectId: string;
  token: string;
  apiBaseUrl?: string;
  onReady?: () => void;
  onResize?: (height: number) => void;
  onError?: (error: Error) => void;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (value: string) => void;
  sendMessage: (e?: React.FormEvent) => void;
  stop: () => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
}
