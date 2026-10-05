"""
Step 12 — Transformer Language Model (TinyTransformerLM)
=========================================================
This module implements the complete autoregressive Transformer Language Model
for the DevFix Transformer Lab.

End-to-End Pipeline:
--------------------
   Input Token IDs: [b, seq_len]
         │
         ├──► Token Embedding (vocab_size -> d_model)
         └──► Sinusoidal Positional Encoding (d_model)
         │
        (+) Combined Embeddings
         │
         ▼
  ┌─────────────────────────────────┐
  │ Transformer Block 1             │
  │   - Pre-LN Multi-Head Attention │
  │   - Residual Connection         │
  │   - Pre-LN Feed-Forward Network │
  │   - Residual Connection         │
  └─────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────┐
  │ Transformer Block 2 (N layers)  │
  └─────────────────────────────────┘
         │
         ▼
  Final LayerNorm (d_model)
         │
         ▼
  Linear Head (d_model -> vocab_size)
         │
         ▼
  Vocabulary Logits: [b, seq_len, vocab_size]
"""

from typing import Optional, Tuple, List, Dict, Any
import torch
import torch.nn as nn

from embeddings import TokenEmbedding
from positional_encoding import SinusoidalPositionalEncoding
from transformer_block import TransformerBlock
from attention import create_causal_mask


class TinyTransformerLM(nn.Module):
    """
    A lightweight decoder-only Transformer Language Model built from scratch in PyTorch.
    Optimized for educational transparency and local CPU execution.
    """
    def __init__(
        self,
        vocab_size: int,
        d_model: int = 128,
        num_heads: int = 4,
        num_layers: int = 2,
        d_ff: int = 512,
        max_seq_len: int = 64,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.vocab_size = vocab_size
        self.d_model = d_model
        self.num_heads = num_heads
        self.num_layers = num_layers
        self.d_ff = d_ff
        self.max_seq_len = max_seq_len

        # 1. Embeddings & Positional Encoding
        self.token_embedding = TokenEmbedding(vocab_size, d_model=d_model)
        self.pos_encoding = SinusoidalPositionalEncoding(d_model=d_model, max_seq_len=max_seq_len, dropout=dropout)

        # 2. Stack of N Transformer Blocks
        self.blocks = nn.ModuleList([
            TransformerBlock(d_model=d_model, num_heads=num_heads, d_ff=d_ff, dropout=dropout)
            for _ in range(num_layers)
        ])

        # 3. Final Normalization
        self.final_ln = nn.LayerNorm(d_model)

        # 4. Language Modeling Output Projection Head
        # Projects d_model representation at each position to a logit score for every token in vocab
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)

        # Initialize weights with standard normal distribution
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
        elif isinstance(module, nn.LayerNorm):
            nn.init.zeros_(module.bias)
            nn.init.ones_(module.weight)

    def forward(
        self,
        input_ids: torch.Tensor,
        return_attention: bool = False
    ) -> Tuple[torch.Tensor, Optional[List[torch.Tensor]]]:
        """
        Args:
            input_ids: Tensor of shape (batch_size, seq_len) with integer token IDs
            return_attention: If True, returns attention weight matrices from all blocks
        Returns:
            logits: Tensor of shape (batch_size, seq_len, vocab_size)
            all_attentions: Optional list of attention weight tensors from each block
        """
        batch_size, seq_len = input_ids.shape
        device = input_ids.device

        # Create triangular causal mask so tokens cannot see future tokens
        mask = create_causal_mask(seq_len, device=device)

        # 1. Embed tokens and add sinusoidal positional encoding
        x = self.token_embedding(input_ids)
        x = self.pos_encoding(x)

        # 2. Pass through Transformer Blocks
        all_attentions = [] if return_attention else None
        for block in self.blocks:
            x, attn_weights = block(x, mask=mask)
            if return_attention:
                all_attentions.append(attn_weights)

        # 3. Final layer normalization
        x = self.final_ln(x)

        # 4. Project to vocabulary logits
        logits = self.lm_head(x)  # (batch_size, seq_len, vocab_size)

        return logits, all_attentions

    def get_num_parameters(self) -> int:
        """Returns the total number of trainable parameters in the model."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)

    def get_config(self) -> Dict[str, Any]:
        """Returns model hyperparameters dictionary."""
        return {
            "vocab_size": self.vocab_size,
            "d_model": self.d_model,
            "num_heads": self.num_heads,
            "num_layers": self.num_layers,
            "d_ff": self.d_ff,
            "max_seq_len": self.max_seq_len,
            "total_parameters": self.get_num_parameters(),
        }


def get_default_device() -> torch.device:
    """Automatically selects CUDA if available, otherwise falls back to CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


if __name__ == "__main__":
    device = get_default_device()
    print(f"Device: {device.type.upper()}")
    
    vocab_size = 500
    model = TinyTransformerLM(vocab_size=vocab_size, d_model=128, num_heads=4, num_layers=2).to(device)
    print("Model Parameters:", model.get_num_parameters())
    
    dummy_input = torch.tensor([[10, 24, 5, 12]], device=device)
    logits, attns = model(dummy_input, return_attention=True)
    print("Logits shape (batch, seq, vocab):", logits.shape)
    print("Number of attention layers returned:", len(attns))
    print("Attention Layer 0 shape (batch, heads, seq, seq):", attns[0].shape)
