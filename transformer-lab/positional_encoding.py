"""
Step 4 — Positional Encoding
============================
This module implements Sinusoidal Positional Encoding for the DevFix Transformer Lab.

Why Positional Information is Essential:
----------------------------------------
Self-attention by itself is completely permutation-invariant (order-agnostic).
Consider the two sentences:
    1. "I debug code"
    2. "code debug I"
Both contain identical token embeddings. If passed through self-attention without position,
the computed attention scores would treat both sentences identically, even though their syntax
and meaning are drastically different!

Sinusoidal Formulation (Vaswani et al., 2017):
----------------------------------------------
For token position `pos` (0, 1, 2, ..., max_len - 1) and embedding dimension index `i`:
    PE(pos, 2i)   = sin(pos / (10000 ^ (2i / d_model)))
    PE(pos, 2i+1) = cos(pos / (10000 ^ (2i / d_model)))

Intuition:
- Low-dimension channels (small i) oscillate at high frequencies, tracking immediate neighbor offsets.
- High-dimension channels (large i) oscillate at very low frequencies, tracking global sequence position.
- For any fixed offset k, PE(pos + k) can be represented as a linear transformation of PE(pos),
  allowing the model to easily learn relative positional relationships.
"""

import math
import numpy as np
import torch
import torch.nn as nn


class SinusoidalPositionalEncoding(nn.Module):
    """
    Computes deterministic sinusoidal positional encodings and adds them to token embeddings.
    """
    def __init__(self, d_model: int = 128, max_seq_len: int = 512, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.dropout = nn.Dropout(p=dropout)

        # Create constant positional encoding matrix of shape (max_seq_len, d_model)
        pe = torch.zeros(max_seq_len, d_model)
        position = torch.arange(0, max_seq_len, dtype=torch.float).unsqueeze(1)
        
        # div_term = exp(arange(0, d_model, 2) * -(ln(10000.0) / d_model))
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)

        # Add batch dimension: (1, max_seq_len, d_model)
        pe = pe.unsqueeze(0)

        # Register as a non-trainable persistent buffer
        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch_size, seq_len, d_model)
        Returns:
            Tensor of shape (batch_size, seq_len, d_model) with position information added
        """
        seq_len = x.size(1)
        # Add position vectors to token embeddings: x + PE[0:seq_len]
        x = x + self.pe[:, :seq_len, :]
        return self.dropout(x)


def get_positional_matrix(seq_len: int = 32, d_model: int = 128) -> np.ndarray:
    """
    Utility returning a 2D numpy array of shape (seq_len, d_model) for visualization.
    """
    pe = np.zeros((seq_len, d_model))
    for pos in range(seq_len):
        for i in range(0, d_model, 2):
            denom = 10000 ** (i / d_model)
            pe[pos, i] = math.sin(pos / denom)
            if i + 1 < d_model:
                pe[pos, i + 1] = math.cos(pos / denom)
    return pe


if __name__ == "__main__":
    d_model = 128
    pos_enc = SinusoidalPositionalEncoding(d_model=d_model, max_seq_len=64)
    dummy_x = torch.zeros(1, 10, d_model)
    encoded = pos_enc(dummy_x)
    print("Positional encoding output shape:", encoded.shape)
    matrix = get_positional_matrix(16, 64)
    print("Visualization matrix shape:", matrix.shape)
    print("Values for position 0, first 6 dims:", np.round(matrix[0, :6], 3))
    print("Values for position 1, first 6 dims:", np.round(matrix[1, :6], 3))
