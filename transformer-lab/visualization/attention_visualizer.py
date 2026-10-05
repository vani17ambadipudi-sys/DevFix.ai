"""
Attention Visualization Module
==============================
Visualizes multi-head self-attention weight matrices for the DevFix Transformer Lab.

Concept:
- For a sequence of tokens [T_1, T_2, ..., T_L], the attention matrix is of size (L x L).
- Row i represents token T_i (the query).
- Column j represents token T_j (the key).
- Cell (i, j) indicates how much attention token T_i pays to token T_j.
- In causal attention, cell (i, j) is strictly 0.0 whenever j > i (future tokens cannot be attended to).

Important Note:
- Attention weights reflect learned matrix projections and mathematical correlation scores.
- They do NOT represent human-like consciousness, intent, or mental reasoning.
"""

import os
import sys
from typing import Dict, Any, List

import torch
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Headless backend for server and CLI
import matplotlib.pyplot as plt

# Ensure parent directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tokenizer import SimpleTokenizer
from model import TinyTransformerLM, get_default_device
from generate import load_model_and_tokenizer


def compute_attention_maps(
    text: str,
    checkpoint_path: str = "checkpoints/tiny_transformer.pt",
    vocab_path: str = "checkpoints/tokenizer_vocab.json"
) -> Dict[str, Any]:
    """
    Computes attention weight matrices across all layers and heads for the given input text.
    Returns JSON-serializable dictionaries suitable for web UI heatmaps and CLI plotting.
    """
    model, tokenizer, device = load_model_and_tokenizer(checkpoint_path, vocab_path)
    
    tokens = tokenizer.tokenize_raw(text)
    token_ids = tokenizer.encode(text, add_special_tokens=False)

    if not token_ids:
        tokens = ["<bos>"]
        token_ids = [tokenizer.bos_id]

    input_tensor = torch.tensor([token_ids], dtype=torch.long, device=device)

    with torch.no_grad():
        _, all_attentions = model(input_tensor, return_attention=True)

    # all_attentions is a list of tensors [num_blocks], each of shape (batch=1, num_heads, seq_len, seq_len)
    layers_data: List[Dict[str, Any]] = []

    for layer_idx, layer_attn in enumerate(all_attentions):
        # Shape: (num_heads, seq_len, seq_len)
        heads_tensor = layer_attn[0].cpu().numpy()
        heads_data: List[Dict[str, Any]] = []

        for head_idx in range(heads_tensor.shape[0]):
            matrix = heads_tensor[head_idx]
            heads_data.append({
                "head_index": head_idx + 1,
                "matrix": np.round(matrix, 4).tolist()
            })

        layers_data.append({
            "layer_index": layer_idx + 1,
            "heads": heads_data
        })

    return {
        "text": text,
        "tokens": tokens,
        "token_ids": token_ids,
        "seq_len": len(tokens),
        "num_layers": len(layers_data),
        "num_heads": len(layers_data[0]["heads"]) if layers_data else 0,
        "layers": layers_data
    }


def save_attention_plot(
    data: Dict[str, Any],
    output_path: str = "checkpoints/attention_heatmap.png",
    layer_idx: int = 0
):
    """
    Plots a multi-panel heatmap for all heads in the specified layer.
    """
    tokens = data["tokens"]
    heads = data["layers"][layer_idx]["heads"]
    num_heads = len(heads)

    fig, axes = plt.subplots(1, num_heads, figsize=(4 * num_heads, 4), squeeze=False)
    fig.suptitle(f"Self-Attention Weights (Layer {layer_idx + 1}) — '{data['text']}'", fontsize=12, y=1.03)

    for h_idx, head_info in enumerate(heads):
        ax = axes[0, h_idx]
        matrix = np.array(head_info["matrix"])
        
        im = ax.imshow(matrix, cmap="viridis", vmin=0.0, vmax=1.0)
        ax.set_title(f"Head {head_info['head_index']}", fontsize=10)
        
        ax.set_xticks(range(len(tokens)))
        ax.set_yticks(range(len(tokens)))
        ax.set_xticklabels(tokens, rotation=45, ha="right", fontsize=8)
        ax.set_yticklabels(tokens, fontsize=8)
        
        ax.set_xlabel("Key Tokens", fontsize=9)
        if h_idx == 0:
            ax.set_ylabel("Query Tokens", fontsize=9)

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Attention heatmap saved to: {output_path}")


if __name__ == "__main__":
    sample = "The programmer fixed the error"
    try:
        attn_data = compute_attention_maps(sample)
        save_attention_plot(attn_data)
        print("Tokens:", attn_data["tokens"])
        print("Layer 1, Head 1 Attention Matrix:\n", np.array(attn_data["layers"][0]["heads"][0]["matrix"]))
    except Exception as e:
        print(f"Visualization error (ensure model is trained first): {e}")
