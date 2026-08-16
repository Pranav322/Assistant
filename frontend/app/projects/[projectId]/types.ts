export type ProjectSettings = {
  title?: string;
  primary_color?: string;
  welcome_message?: string;
  starter_questions?: string[];
  system_prompt?: string;
  logo_url?: string;
  embed_mode?: "popup" | "embedded";
};

export type Project = {
  id: string;
  name: string;
  allowed_origins: string[];
  settings: ProjectSettings;
  usage: Record<string, number>;
};

export type ApiKey = {
  id: string;
  name: string | null;
  prefix?: string;
  api_key?: string;
  revoked_at?: string | null;
};

export type Source = {
  id: string;
  project_id: string;
  type: string;
  content_hash: string;
  metadata: {
    filename?: string;
    source_url?: string;
    size_bytes?: number;
    page_count?: number;
    content_type?: string;
    error?: string;
  };
  status: string;
  progress?: {
    stage: string;
    percent: number;
    total_chunks?: number;
    processed_chunks?: number;
  };
  created_at: string;
  updated_at: string;
};

export type IngestionStreamEvent = {
  project_id: string;
  source_id: string;
  status: string;
  progress?: {
    stage?: string;
    percent?: number;
    total_chunks?: number;
    processed_chunks?: number;
  };
  type?: string;
  filename?: string;
  error?: string;
};

export type IngestionStatusState = {
  sourceId: string;
  status: string;
  message?: string;
};
