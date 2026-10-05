"""
Step 3 — Token Embeddings
=========================
This module implements the Token Embedding layer for the DevFix Transformer Lab.

Concept:
- A Token ID is merely an arbitrary categorical index (e.g., 'debug' = 17, 'error' = 24).
- The neural network cannot do geometry or vector arithmetic on discrete integers.
- The Token Embedding layer maps each integer ID to a continuous learned vector of size `d_model`:
    Token ID: 17 ("debug") -> Vector: [0.12, -0.43, 0.77, ..., 0.05]
- During training, tokens that appear in similar programming contexts develop vector
  representations that are closer together in cosine/Euclidean space.
- In the original Transformer ("Attention Is All You Need"), embeddings are scaled by
  sqrt(d_model) so their magnitudes balance with positional encodings.
"""

import math
import torch
import torch.nn as nn


class TokenEmbedding(nn.Module):
    """
    Learned lookup table mapping discrete token IDs into continuous vectors of dimension `d_model`.
    """
    def __init__(self, vocab_size: int, d_model: int = 128, scale_embeddings: bool = True):
        super().__init__()
        self.vocab_size = vocab_size
        self.d_model = d_model
        self.scale_embeddings = scale_embeddings
        
        # PyTorch Embedding layer: acts as an efficient lookup table of weight matrix (vocab_size, d_model)
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.scale = math.sqrt(d_model) if scale_embeddings else 1.0

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch_size, seq_len) with integer token IDs
        Returns:
            Tensor of shape (batch_size, seq_len, d_model) with continuous dense vectors
        """
        # Lookup vectors: (batch_size, seq_len) -> (batch_size, seq_len, d_model)
        embedded = self.embedding(x)
        if self.scale_embeddings:
            embedded = embedded * self.scale
        return embedded


if __name__ == "__main__":
    vocab_size = 500
    d_model = 128
    emb_layer = TokenEmbedding(vocab_size, d_model)
    
    # Test with batch of 2 sequences of length 4
    dummy_input = torch.tensor([[5, 17, 24, 0], [2, 10, 15, 3]])
    vectors = emb_layer(dummy_input)
    print("Input shape:", dummy_input.shape)
    print("Embedding output shape:", vectors.shape)
    print(f"Sample vector for token 17 ('debug') [first 5 dims]:\n{vectors[0, 1, :5].detach().numpy()}")
