"""
Steps 15, 16, & 17 — Training Loop, Loss Calculation, & Backpropagation
========================================================================
This script trains the TinyTransformerLM from scratch on the debugging corpus.

Training Flow:
--------------
1. Forward Pass:
     input_ids -> TinyTransformerLM -> logits [batch, seq_len, vocab_size]
2. Loss Calculation (Step 16):
     The model outputs unnormalized logit scores across the entire vocabulary.
     CrossEntropyLoss computes softmax and calculates negative log-likelihood:
       Loss = - (1 / N) * sum( log( P( target_token_i | previous_tokens ) ) )
     Padding tokens (<PAD>) are ignored using `ignore_index=tokenizer.pad_id`.
3. Backpropagation (Step 17):
     loss.backward() computes partial derivatives (gradients) dLoss/dW for every
     trainable parameter via PyTorch autograd.
4. Optimization:
     optimizer.step() updates weights via AdamW (Adaptive Moment Estimation with Decoupled Weight Decay).
"""

import os
import time
import json
import argparse
from typing import Dict, Any, List

import torch
import torch.nn as nn
from torch.optim import AdamW

from tokenizer import SimpleTokenizer
from dataset import create_dataloaders
from model import TinyTransformerLM, get_default_device


def train_model(
    corpus_path: str = "data/debugging_text.txt",
    checkpoints_dir: str = "checkpoints",
    epochs: int = 25,
    batch_size: int = 4,
    lr: float = 1e-3,
    d_model: int = 128,
    num_heads: int = 4,
    num_layers: int = 2,
    seq_len: int = 32,
    seed: int = 42,
    progress_callback = None
) -> Dict[str, Any]:
    # Reproducibility
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    device = get_default_device()
    print(f"Device: {device.type.upper()}")

    os.makedirs(checkpoints_dir, exist_ok=True)

    # 1. Initialize and build tokenizer
    tokenizer = SimpleTokenizer()
    train_loader, val_loader = create_dataloaders(
        corpus_path=corpus_path,
        tokenizer=tokenizer,
        seq_len=seq_len,
        batch_size=batch_size,
        train_split=0.85,
        seed=seed
    )

    vocab_size = tokenizer.vocab_size
    print(f"Vocabulary size: {vocab_size}")

    # Save vocabulary
    vocab_path = os.path.join(checkpoints_dir, "tokenizer_vocab.json")
    tokenizer.save(vocab_path)

    # 2. Instantiate Model
    model = TinyTransformerLM(
        vocab_size=vocab_size,
        d_model=d_model,
        num_heads=num_heads,
        num_layers=num_layers,
        d_ff=d_model * 4,
        max_seq_len=seq_len + 4,
        dropout=0.1
    ).to(device)

    total_params = model.get_num_parameters()
    print(f"Model Parameters: {total_params:,}")

    # 3. Loss & Optimizer (Steps 16 & 17)
    criterion = nn.CrossEntropyLoss(ignore_index=tokenizer.pad_id)
    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=0.01)

    history: Dict[str, List] = {
        "epochs": [],
        "train_loss": [],
        "val_loss": [],
        "learning_rates": []
    }

    start_time = time.time()
    best_val_loss = float("inf")

    print("\n--- Starting Training ---")
    for epoch in range(1, epochs + 1):
        # Training Phase
        model.train()
        total_train_loss = 0.0
        train_batches = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()

            logits, _ = model(inputs)
            # Reshape for CrossEntropyLoss:
            # logits: (batch_size * seq_len, vocab_size)
            # targets: (batch_size * seq_len)
            loss = criterion(logits.view(-1, vocab_size), targets.view(-1))
            
            # Backpropagation
            loss.backward()
            
            # Gradient clipping prevents exploding gradients
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()

            total_train_loss += loss.item()
            train_batches += 1

        avg_train_loss = total_train_loss / max(train_batches, 1)

        # Validation Phase
        model.eval()
        total_val_loss = 0.0
        val_batches = 0

        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                logits, _ = model(inputs)
                loss = criterion(logits.view(-1, vocab_size), targets.view(-1))
                total_val_loss += loss.item()
                val_batches += 1

        avg_val_loss = total_val_loss / max(val_batches, 1)

        history["epochs"].append(epoch)
        history["train_loss"].append(round(avg_train_loss, 4))
        history["val_loss"].append(round(avg_val_loss, 4))
        history["learning_rates"].append(lr)

        print(f"Epoch {epoch:2d}/{epochs:2d} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")

        if progress_callback:
            progress_callback({
                "epoch": epoch,
                "total_epochs": epochs,
                "train_loss": round(avg_train_loss, 4),
                "val_loss": round(avg_val_loss, 4),
            })

        # Save best checkpoint
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            checkpoint_path = os.path.join(checkpoints_dir, "tiny_transformer.pt")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": avg_val_loss,
                "config": model.get_config(),
                "vocab_size": vocab_size,
            }, checkpoint_path)

    elapsed_time = round(time.time() - start_time, 2)
    print(f"\nTraining completed in {elapsed_time}s. Best Val Loss: {best_val_loss:.4f}")

    # Save training history
    history_path = os.path.join(checkpoints_dir, "training_history.json")
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump({
            "history": history,
            "elapsed_seconds": elapsed_time,
            "model_config": model.get_config(),
            "best_val_loss": round(best_val_loss, 4),
            "seed": seed,
            "device": device.type.upper(),
        }, f, indent=2)

    return {
        "history": history,
        "elapsed_seconds": elapsed_time,
        "best_val_loss": round(best_val_loss, 4),
        "total_parameters": total_params,
        "vocab_size": vocab_size,
        "device": device.type.upper(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train TinyTransformerLM from scratch")
    parser.add_argument("--epochs", type=int, default=25, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Mini-batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--d-model", type=int, default=128, help="Embedding dimension")
    parser.add_argument("--heads", type=int, default=4, help="Number of attention heads")
    parser.add_argument("--layers", type=int, default=2, help="Number of Transformer blocks")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    train_model(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        d_model=args.d_model,
        num_heads=args.heads,
        num_layers=args.layers,
        seed=args.seed
    )
