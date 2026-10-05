"""
Step 5 & Step 6 — Scaled Dot-Product Attention & Causal Masking
==============================================================
This module implements manual Scaled Dot-Product Attention with Causal Masking
for the DevFix Transformer Lab.

Concept: Query, Key, and Value:
-------------------------------
The core attention mechanism is inspired by database retrieval systems:
1. Query (Q): "What information am I (the current token) looking for?"
2. Key (K):   "What information do I (each candidate token) contain?"
3. Value (V): "What actual feature representation should be passed forward if matched?"

Mathematical Formulation:
-------------------------
Given Q, K, V of dimension d_k:
    Attention(Q, K, V) = softmax( (Q @ K.T) / sqrt(d_k) + Mask ) @ V

Why divide by sqrt(d_k)?
When d_k is large, the dot products Q @ K.T grow large in magnitude, pushing the
softmax function into regions where gradients are extremely small (vanishing gradients).
Scaling by 1 / sqrt(d_k) keeps the variance near 1.0.

Causal Masking (Step 6):
------------------------
In autoregressive text generation, future tokens must NOT be visible to past tokens.
For a sequence of length L, we construct an upper-triangular mask:
    [[1, 0, 0],
     [1, 1, 0],
     [1, 1, 1]]
Any 0 in the mask is replaced with -1e9 (or -inf) prior to softmax.
Because e^(-inf) = 0, the attention weight assigned to any future token becomes exactly 0.0.
"""

import math
from typing import Optional, Tuple
import torch
import torch.nn as nn


class ScaledDotProductAttention(nn.Module):
    """
    Computes Scaled Dot-Product Attention with optional causal masking.
    Returns both the context vectors and the raw attention weight matrix.
    """
    def __init__(self, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

    def forward(
        self,
        q: torch.Tensor,
        k: torch.Tensor,
        v: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            q: Queries of shape (batch_size, num_heads, seq_len_q, d_k)
            k: Keys of shape (batch_size, num_heads, seq_len_k, d_k)
            v: Values of shape (batch_size, num_heads, seq_len_k, d_v)
            mask: Optional boolean or float mask of shape (1, 1, seq_len_q, seq_len_k)
        Returns:
            output: Attention output of shape (batch_size, num_heads, seq_len_q, d_v)
            attention_weights: Normalized attention weights of shape (batch_size, num_heads, seq_len_q, seq_len_k)
        """
        d_k = q.size(-1)
        
        # 1. Compute dot-product scores: (Q @ K.T) / sqrt(d_k)
        # Shape: (batch_size, num_heads, seq_len_q, seq_len_k)
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_k)

        # 2. Apply Causal Mask if provided
        if mask is not None:
            # Mask contains 0 where attention is forbidden (future tokens)
            scores = scores.masked_fill(mask == 0, -1e9)

        # 3. Softmax across key sequence dimension (-1) to produce attention probabilities
        attention_weights = torch.softmax(scores, dim=-1)
        
        # Apply dropout to attention weights during training
        weights = self.dropout(attention_weights)

        # 4. Multiply attention weights by Value vectors: (Weights @ V)
        output = torch.matmul(weights, v)

        return output, attention_weights


def create_causal_mask(seq_len: int, device: Optional[torch.device] = None) -> torch.Tensor:
    """
    Creates a lower-triangular causal mask of shape (1, 1, seq_len, seq_len).
    1 indicates allowed connection; 0 indicates forbidden future token.
    """
    mask = torch.tril(torch.ones((seq_len, seq_len), device=device)).unsqueeze(0).unsqueeze(0)
    return mask.bool()


if __name__ == "__main__":
    seq_len = 4
    d_k = 32
    attention = ScaledDotProductAttention(dropout=0.0)
    
    # Dummy Q, K, V for batch_size=1, heads=1
    dummy_q = torch.randn(1, 1, seq_len, d_k)
    dummy_k = torch.randn(1, 1, seq_len, d_k)
    dummy_v = torch.randn(1, 1, seq_len, d_k)
    
    mask = create_causal_mask(seq_len)
    out, weights = attention(dummy_q, dummy_k, dummy_v, mask=mask)
    
    print("Causal mask:\n", mask.squeeze().int().numpy())
    print("\nAttention weights shape:", weights.shape)
    print("Attention weights (row i sums to 1.0, future tokens are 0.0):\n",
          torch.round(weights.squeeze(), decimals=3).numpy())
