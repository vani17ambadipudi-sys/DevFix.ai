"""
DevFix Transformer Lab — API Bridge
===================================
JSON CLI Bridge enabling the web server to invoke Transformer Lab operations,
retrieve real PyTorch attention maps, execute autoregressive generation, and inspect model layers.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any

# Ensure current directory is in python module path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import torch
import numpy as np

from tokenizer import SimpleTokenizer
from positional_encoding import get_positional_matrix
from model import TinyTransformerLM, get_default_device
from generate import load_model_and_tokenizer, generate_text
from visualization.attention_visualizer import compute_attention_maps
from train import train_model


def cmd_status() -> Dict[str, Any]:
    device = get_default_device()
    checkpoint_exists = os.path.exists("checkpoints/tiny_transformer.pt")
    vocab_exists = os.path.exists("checkpoints/tokenizer_vocab.json")
    history_exists = os.path.exists("checkpoints/training_history.json")
    
    vocab_size = 0
    if vocab_exists:
        try:
            with open("checkpoints/tokenizer_vocab.json", "r") as f:
                vdata = json.load(f)
                vocab_size = len(vdata.get("token_to_id", {}))
        except Exception:
            pass

    history_data = None
    if history_exists:
        try:
            with open("checkpoints/training_history.json", "r") as f:
                history_data = json.load(f)
        except Exception:
            pass

    return {
        "status": "ready",
        "pytorch_version": torch.__version__,
        "device": device.type.upper(),
        "cuda_available": torch.cuda.is_available(),
        "checkpoint_exists": checkpoint_exists,
        "vocab_exists": vocab_exists,
        "vocab_size": vocab_size,
        "history": history_data,
        "default_config": {
            "d_model": 128,
            "num_heads": 4,
            "num_layers": 2,
            "d_ff": 512,
            "max_seq_len": 64,
        }
    }


def cmd_tokenize(text: str) -> Dict[str, Any]:
    tokenizer = SimpleTokenizer()
    vocab_path = "checkpoints/tokenizer_vocab.json"
    if os.path.exists(vocab_path):
        tokenizer.load(vocab_path)
    else:
        # Build quick default vocab if not trained yet
        tokenizer.build_vocab([
            "Python code contains a syntax error when a colon is missing.",
            "The function returns an incorrect value.",
            "The program has a runtime error.",
            "The programmer fixed the error and verified the solution."
        ])

    raw_tokens = tokenizer.tokenize_raw(text)
    encoded_ids = tokenizer.encode(text, add_special_tokens=False)
    encoded_with_special = tokenizer.encode(text, add_special_tokens=True)
    decoded_text = tokenizer.decode(encoded_ids, skip_special_tokens=True)

    token_breakdown = []
    for token, tid in zip(raw_tokens, encoded_ids):
        token_breakdown.append({
            "token": token,
            "id": tid,
            "is_special": False
        })

    return {
        "text": text,
        "raw_tokens": raw_tokens,
        "token_ids": encoded_ids,
        "token_ids_with_special": encoded_with_special,
        "token_breakdown": token_breakdown,
        "decoded_text": decoded_text,
        "vocab_size": tokenizer.vocab_size,
        "special_tokens": {
            "<PAD>": tokenizer.pad_id,
            "<UNK>": tokenizer.unk_id,
            "<BOS>": tokenizer.bos_id,
            "<EOS>": tokenizer.eos_id,
        }
    }


def cmd_positional(seq_len: int = 16, d_model: int = 64) -> Dict[str, Any]:
    matrix = get_positional_matrix(seq_len=seq_len, d_model=d_model)
    return {
        "seq_len": seq_len,
        "d_model": d_model,
        "matrix": np.round(matrix, 4).tolist()
    }


def cmd_attention(text: str) -> Dict[str, Any]:
    return compute_attention_maps(text)


def cmd_generate(prompt: str, max_tokens: int = 12, temperature: float = 0.8) -> Dict[str, Any]:
    model, tokenizer, device = load_model_and_tokenizer()
    return generate_text(
        model=model,
        tokenizer=tokenizer,
        prompt=prompt,
        max_new_tokens=max_tokens,
        temperature=temperature,
        device=device
    )


def cmd_train(epochs: int = 15, lr: float = 1e-3, d_model: int = 128, heads: int = 4, layers: int = 2) -> Dict[str, Any]:
    def on_epoch_progress(info):
        # Print progress line for stream listeners
        sys.stderr.write(f"PROGRESS:{json.dumps(info)}\n")
        sys.stderr.flush()

    res = train_model(
        epochs=epochs,
        lr=lr,
        d_model=d_model,
        num_heads=heads,
        num_layers=layers,
        progress_callback=on_epoch_progress
    )
    return res


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["status", "tokenize", "positional", "attention", "generate", "train"])
    parser.add_argument("--text", type=str, default="")
    parser.add_argument("--prompt", type=str, default="The code has")
    parser.add_argument("--max-tokens", type=int, default=12)
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--seq-len", type=int, default=16)
    parser.add_argument("--d-model", type=int, default=128)
    parser.add_argument("--heads", type=int, default=4)
    parser.add_argument("--layers", type=int, default=2)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--lr", type=float, default=1e-3)

    args = parser.parse_args()

    try:
        if args.command == "status":
            result = cmd_status()
        elif args.command == "tokenize":
            result = cmd_tokenize(args.text or "The programmer fixed the error")
        elif args.command == "positional":
            result = cmd_positional(args.seq_len, args.d_model)
        elif args.command == "attention":
            result = cmd_attention(args.text or "The programmer fixed the error")
        elif args.command == "generate":
            result = cmd_generate(args.prompt, args.max_tokens, args.temperature)
        elif args.command == "train":
            result = cmd_train(args.epochs, args.lr, args.d_model, args.heads, args.layers)
        else:
            result = {"error": f"Unknown command: {args.command}"}

        print(json.dumps(result))
    except Exception as err:
        sys.stderr.write(f"Bridge error: {str(err)}\n")
        print(json.dumps({"error": str(err), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
