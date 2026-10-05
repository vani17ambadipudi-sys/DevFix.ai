"""
Steps 9, 10, & 11 — Residual Connections, Layer Normalization, & Transformer Block
==================================================================================
This module implements the complete Transformer Block for the DevFix Transformer Lab.

Step 9 — Residual Connections:
------------------------------
- Neural networks with many layers suffer from vanishing/exploding gradients during backprop.
- He et al. (ResNet) introduced skip connections:
    Output = x + SubLayer(x)
- This creates an additive gradient highway: d(Loss)/dx = d(Loss)/d(SubLayer) + d(Loss)/dx.
- Even if a sublayer's gradients shrink, the "+ 1" identity path allows gradients to flow
  unhindered directly back to the earliest token embeddings.

Step 10 — Layer Normalization:
------------------------------
- Unlike BatchNorm (which computes statistics across batches), LayerNorm computes mean (mu)
  and variance (sigma^2) across the feature dimension (d_model) independently for each token:
    LN(x) = ((x - mu) / sqrt(sigma^2 + epsilon)) * gamma + beta
- gamma (scale) and beta (shift) are learnable parameters.
- Stabilizes internal activations, preventing numbers from blowing up or collapsing.

Step 11 — Transformer Block Architecture (Pre-LN):
--------------------------------------------------
    x (Residual Stream)
     │
     ├───► LayerNorm_1 ──► Multi-Head Self-Attention ──► Dropout ──┐
     │                                                              │
     └───(+) <──────────────────────────────────────────────────────┘
      x_attn
     │
     ├───► LayerNorm_2 ──► Position-wise Feed-Forward ──► Dropout ──┐
     │                                                               │
     └───(+) <───────────────────────────────────────────────────────┘
      Output
"""

from typing import Optional, Tuple
import torch
import torch.nn as nn
from multi_head_attention import MultiHeadAttention
from feed_forward import FeedForwardNetwork


class TransformerBlock(nn.Module):
    """
    A single Pre-LN Transformer decoder block.
    Combines LayerNorm, Causal Multi-Head Attention, Residuals, and FFN.
    """
    def __init__(
        self,
        d_model: int = 128,
        num_heads: int = 4,
        d_ff: int = 512,
        dropout: float = 0.1
    ):
        super().__init__()
        self.d_model = d_model
        
        # Layer Normalization layers
        self.ln1 = nn.LayerNorm(d_model)
        self.ln2 = nn.LayerNorm(d_model)

        # Sub-layers
        self.attention = MultiHeadAttention(d_model=d_model, num_heads=num_heads, dropout=dropout)
        self.feed_forward = FeedForwardNetwork(d_model=d_model, d_ff=d_ff, dropout=dropout)

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: Input activations of shape (batch_size, seq_len, d_model)
            mask: Causal mask of shape (1, 1, seq_len, seq_len)
        Returns:
            x: Updated activations of shape (batch_size, seq_len, d_model)
            attn_weights: Attention maps of shape (batch_size, num_heads, seq_len, seq_len)
        """
        # 1. Pre-LN Self-Attention with Residual Connection
        norm_x1 = self.ln1(x)
        attn_out, attn_weights = self.attention(norm_x1, mask=mask)
        x = x + attn_out  # First residual connection

        # 2. Pre-LN Feed-Forward with Residual Connection
        norm_x2 = self.ln2(x)
        ffn_out = self.feed_forward(norm_x2)
        x = x + ffn_out   # Second residual connection

        return x, attn_weights


if __name__ == "__main__":
    d_model = 128
    block = TransformerBlock(d_model=d_model, num_heads=4, d_ff=512)
    dummy_x = torch.randn(2, 6, d_model)
    from attention import create_causal_mask
    mask = create_causal_mask(6)
    
    out, weights = block(dummy_x, mask=mask)
    print("Transformer Block input shape:", dummy_x.shape)
    print("Transformer Block output shape:", out.shape)
    print("Attention weights shape:", weights.shape)
