export interface TransformerStatusResponse {
  status: string;
  pytorch_version: string;
  device: string;
  cuda_available: boolean;
  checkpoint_exists: boolean;
  vocab_exists: boolean;
  vocab_size: number;
  history?: {
    history: {
      epochs: number[];
      train_loss: number[];
      val_loss: number[];
      learning_rates: number[];
    };
    elapsed_seconds: number;
    model_config: {
      d_model: number;
      num_heads: number;
      num_layers: number;
      d_ff: number;
      max_seq_len: number;
      total_parameters: number;
    };
    best_val_loss: number;
    device: string;
  };
  default_config: {
    d_model: number;
    num_heads: number;
    num_layers: number;
    d_ff: number;
    max_seq_len: number;
  };
}

export interface TokenizeResult {
  text: string;
  raw_tokens: string[];
  token_ids: number[];
  token_ids_with_special: number[];
  token_breakdown: Array<{
    token: string;
    id: number;
    is_special: boolean;
  }>;
  decoded_text: string;
  vocab_size: number;
  special_tokens: Record<string, number>;
}

export interface AttentionHeadData {
  head_index: number;
  matrix: number[][];
}

export interface AttentionLayerData {
  layer_index: number;
  heads: AttentionHeadData[];
}

export interface AttentionResult {
  text: string;
  tokens: string[];
  token_ids: number[];
  seq_len: number;
  num_layers: number;
  num_heads: number;
  layers: AttentionLayerData[];
}

export interface GenerationCandidate {
  token: string;
  id: number;
  probability: number;
}

export interface GenerationStep {
  step: number;
  chosen_token: string;
  chosen_id: number;
  top_candidates: GenerationCandidate[];
}

export interface GenerationResult {
  prompt: string;
  generated_text: string;
  total_new_tokens: number;
  steps: GenerationStep[];
  temperature: number;
}

export const transformerClient = {
  async getStatus(): Promise<TransformerStatusResponse> {
    const res = await fetch('/api/transformer/status');
    if (!res.ok) throw new Error('Failed to retrieve Transformer Lab status');
    return await res.json();
  },

  async tokenize(text: string): Promise<TokenizeResult> {
    const res = await fetch('/api/transformer/tokenize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Tokenization failed');
    return await res.json();
  },

  async getPositionalMatrix(seqLen: number = 16, dModel: number = 64): Promise<{ seq_len: number; d_model: number; matrix: number[][] }> {
    const res = await fetch(`/api/transformer/positional?seq_len=${seqLen}&d_model=${dModel}`);
    if (!res.ok) throw new Error('Failed to fetch positional encoding matrix');
    return await res.json();
  },

  async getAttentionMaps(text: string): Promise<AttentionResult> {
    const res = await fetch('/api/transformer/attention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to compute attention maps');
    }
    return await res.json();
  },

  async generate(prompt: string, maxTokens: number = 12, temperature: number = 0.7): Promise<GenerationResult> {
    const res = await fetch('/api/transformer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens, temperature }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Text generation failed');
    }
    return await res.json();
  },

  async streamTraining(
    params: { epochs: number; lr: number; d_model: number; heads: number; layers: number },
    onProgress: (progress: { epoch: number; total_epochs: number; train_loss: number; val_loss: number }) => void
  ): Promise<any> {
    const response = await fetch('/api/transformer/train-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to initiate training stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = null;

    const processChunk = (chunkText: string) => {
      const lines = chunkText.split('\n\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'progress' && data.progress) {
              onProgress(data.progress);
            } else if (data.type === 'completed') {
              finalResult = data.result;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) processChunk(buffer);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        processChunk(part);
      }
    }

    return finalResult;
  },
};
