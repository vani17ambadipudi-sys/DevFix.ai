"""
Step 7 — Multi-Head Attention
=============================
This module implements Multi-Head Attention (MHA) for the DevFix Transformer Lab.

Concept:
- A single attention mechanism can only average across different types of token relationships.
- Multi-Head Attention allows the model to jointly attend to information from different
  representation subspaces at different positions.
  For example:
    - Head 1: Tracks immediate syntactic dependencies (verb -> direct object).
    - Head 2: Tracks long-range variable definitions (declaration -> usage).
    - Head 3: Tracks error words to their contexts ("IndexError" -> "list index").
    - Head 4: Attends to punctuation and clause delimiters.

Mathematical Formulation:
-------------------------
Given d_model and num_heads (where head_dim = d_model / num_heads):
    MultiHead(Q, K, V) = Concat(head_1, head_2, ..., head_h) @ W_o
    where head_i = Attention(Q @ W_i^Q, K @ W_i^K, V @ W_i^V)

Implementation Flow:
1. Linear projections: Q = X @ W_q, K = X @ W_k, V = X @ W_v
2. Reshape & transpose: (batch, seq, d_model) -> (batch, num_heads, seq, head_dim)
3. ScaledDotProductAttention(Q, K, V, mask=mask)
4. Concatenate heads: (batch, num_heads, seq, head_dim) -> (batch, seq, d_model)
5. Output projection: Concat @ W_o
"""

from typing import Optional, Tuple
import torch
import torch.nn as nn
from attention import ScaledDotProductAttention


class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention module splitting d_model into `num_heads` parallel attention subspaces.
    """
    def __init__(self, d_model: int = 128, num_heads: int = 4, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, f"d_model ({d_model}) must be divisible by num_heads ({num_heads})"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.head_dim = d_model // num_heads

        # Linear projections for Query, Key, Value
        self.w_q = nn.Linear(d_model, d_model, bias=False)
        self.w_k = nn.Linear(d_model, d_model, bias=False)
        self.w_v = nn.Linear(d_model, d_model, bias=False)

        # Final output projection
        self.w_o = nn.Linear(d_model, d_model, bias=False)

        # Attention core
        self.attention = ScaledDotProductAttention(dropout=dropout)
        self.dropout = nn.Dropout(p=dropout)

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: Input embeddings of shape (batch_size, seq_len, d_model)
            mask: Optional causal mask of shape (1, 1, seq_len, seq_len)
        Returns:
            out: Projected context tensor of shape (batch_size, seq_len, d_model)
            attn_weights: Attention maps across all heads of shape (batch_size, num_heads, seq_len, seq_len)
        """
        batch_size, seq_len, _ = x.shape

        # 1. Project input into Q, K, V
        q = self.w_q(x)  # (batch_size, seq_len, d_model)
        k = self.w_k(x)  # (batch_size, seq_len, d_model)
        v = self.w_v(x)  # (batch_size, seq_len, d_model)

        # 2. Reshape and transpose to separate heads:
        # (batch_size, seq_len, num_heads, head_dim) -> (batch_size, num_heads, seq_len, head_dim)
        q = q.view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = k.view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)

        # 3. Compute scaled dot-product attention for each head in parallel
        context, attn_weights = self.attention(q, k, v, mask=mask)

        # 4. Concatenate heads back into (batch_size, seq_len, d_model)
        # Transpose back: (batch_size, seq_len, num_heads, head_dim)
        context = context.transpose(1, 2).contiguous()
        # Flatten head dimensions
        context = context.view(batch_size, seq_len, self.d_model)

        # 5. Apply final linear projection W_o
        out = self.w_o(context)
        out = self.dropout(out)

        return out, attn_weights


if __name__ == "__main__":
    d_model = 128
    num_heads = 4
    seq_len = 5
    mha = MultiHeadAttention(d_model=d_model, num_heads=num_heads, dropout=0.0)
    
    dummy_x = torch.randn(2, seq_len, d_model)
    from attention import create_causal_mask
    mask = create_causal_mask(seq_len)
    
    out, weights = mha(dummy_x, mask=mask)
    print("MHA Output shape:", out.shape)
    print("MHA Attention weights shape (batch, heads, seq, seq):", weights.shape)
    print(f"Verified: each head has {d_model // num_heads} feature dimensions.")
