"""
Step 8 — Position-Wise Feed-Forward Network
===========================================
This module implements the Position-Wise Feed-Forward Network (FFN)
for the DevFix Transformer Lab.

Concept:
- Attention layers mix information across different tokens in the sequence.
- However, attention is purely a weighted linear combination of Value vectors.
- The Feed-Forward Network (FFN) applies non-linear transformations independently
  to each token vector at every position:
    FFN(x) = GELU(x @ W_1 + b_1) @ W_2 + b_2

Why expand to 4 * d_model?
- By projecting the vector to a higher-dimensional intermediate space (typically 4 * d_model, e.g. 128 -> 512),
  the network gains the capacity to encode non-linear combinations and stored knowledge patterns
  (often described as associative memory).
- It then projects back down to d_model to match the residual stream dimension.

Activation:
- We use GELU (Gaussian Error Linear Unit), which is smoother and standard in modern
  architectures (GPT, BERT) compared to traditional ReLU.
"""

import torch
import torch.nn as nn


class FeedForwardNetwork(nn.Module):
    """
    Position-wise Feed-Forward Network:
    Linear(d_model -> d_ff) -> GELU -> Dropout -> Linear(d_ff -> d_model) -> Dropout
    """
    def __init__(self, d_model: int = 128, d_ff: int = 512, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.activation = nn.GELU()
        self.dropout = nn.Dropout(dropout)
        self.linear2 = nn.Linear(d_ff, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch_size, seq_len, d_model)
        Returns:
            Tensor of shape (batch_size, seq_len, d_model)
        """
        # Expand dimension: (batch, seq, d_model) -> (batch, seq, d_ff)
        h = self.linear1(x)
        h = self.activation(h)
        h = self.dropout(h)
        
        # Project back: (batch, seq, d_ff) -> (batch, seq, d_model)
        out = self.linear2(h)
        out = self.dropout(out)
        return out


if __name__ == "__main__":
    d_model = 128
    d_ff = 512
    ffn = FeedForwardNetwork(d_model=d_model, d_ff=d_ff)
    dummy_x = torch.randn(2, 6, d_model)
    out = ffn(dummy_x)
    print("FFN Input shape:", dummy_x.shape)
    print("FFN Output shape:", out.shape)
    print("Verified: input and output dimensions match for residual addition.")
