"""
Step 20 — Model Evaluation
==========================
This script evaluates the trained TinyTransformerLM on standard debugging test prompts
and measures validation loss.

Educational Takeaway:
- A tiny model (e.g., 2 layers, 128 embedding dim) trained on a small curated dataset
  learns local domain syntax and basic phrase associations.
- It will NOT possess broad world knowledge or general reasoning (which requires billions
  of parameters, web-scale corpora, and massive compute clusters).
- However, the underlying mathematical architecture (Attention, Positional Encoding,
  LayerNorm, FeedForward, Autoregressive sampling) is identical to real-world LLMs.
"""

import os
import torch
import torch.nn as nn

from tokenizer import SimpleTokenizer
from dataset import create_dataloaders
from model import TinyTransformerLM, get_default_device
from generate import load_model_and_tokenizer, generate_text


TEST_PROMPTS = [
    "The code has",
    "The program contains",
    "Python error occurs",
    "To debug the program",
    "The function returns",
    "Check the variable",
]


def evaluate_model(
    checkpoint_path: str = "checkpoints/tiny_transformer.pt",
    vocab_path: str = "checkpoints/tokenizer_vocab.json",
    corpus_path: str = "data/debugging_text.txt"
):
    print("=============================================================")
    print("DevFix Transformer Lab — Model Evaluation (Step 20)")
    print("=============================================================")

    model, tokenizer, device = load_model_and_tokenizer(checkpoint_path, vocab_path)
    print(f"Device: {device.type.upper()}")
    print(f"Model parameters: {model.get_num_parameters():,}")
    print(f"Vocabulary size: {tokenizer.vocab_size}")

    # Compute validation loss
    _, val_loader = create_dataloaders(
        corpus_path=corpus_path,
        tokenizer=tokenizer,
        seq_len=32,
        batch_size=4,
        train_split=0.85,
        seed=42
    )

    criterion = nn.CrossEntropyLoss(ignore_index=tokenizer.pad_id)
    total_val_loss = 0.0
    val_batches = 0

    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            logits, _ = model(inputs)
            loss = criterion(logits.view(-1, tokenizer.vocab_size), targets.view(-1))
            total_val_loss += loss.item()
            val_batches += 1

    avg_val_loss = total_val_loss / max(val_batches, 1)
    print(f"\nAverage Validation Loss: {avg_val_loss:.4f}")
    perplexity = torch.exp(torch.tensor(avg_val_loss)).item()
    print(f"Validation Perplexity: {perplexity:.2f}")

    print("\n--- Test Prompt Generation ---")
    for prompt in TEST_PROMPTS:
        res = generate_text(
            model=model,
            tokenizer=tokenizer,
            prompt=prompt,
            max_new_tokens=10,
            temperature=0.7,
            device=device
        )
        print(f"Prompt:     \"{prompt}\"")
        print(f"Completion: \"{res['generated_text']}\"\n")

    print("-------------------------------------------------------------")
    print("Evaluation Note:")
    print("This is a small educational Transformer, not a production-scale LLM.")
    print("It demonstrates how the complete Transformer pipeline functions.")
    print("=============================================================")


if __name__ == "__main__":
    evaluate_model()
