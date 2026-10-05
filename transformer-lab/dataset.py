"""
Step 13 & Step 14 — Dataset & Next-Token Prediction Setup
=========================================================
This module handles loading training text and creating next-token prediction
sequences for the DevFix Transformer Lab.

Concept:
- In autoregressive language modeling (like GPT), we train the neural network to
  predict the very next token given all prior tokens.
- For each token sequence:
    Input Sequence:  x = [t_0, t_1, t_2, ..., t_{n-1}]
    Target Sequence: y = [t_1, t_2, t_3, ..., t_n]
- At every position `i`, the model tries to predict `y[i] = t_{i+1}` given `x[0:i+1]`.
"""

import os
from typing import List, Tuple
import torch
from torch.utils.data import Dataset, DataLoader
from tokenizer import SimpleTokenizer


class DebuggingDataset(Dataset):
    """
    PyTorch Dataset that loads programming/debugging sentences and
    produces (input_ids, target_ids) pairs for causal language modeling.
    """
    def __init__(self, texts: List[str], tokenizer: SimpleTokenizer, seq_len: int = 32):
        self.tokenizer = tokenizer
        self.seq_len = seq_len
        self.samples: List[Tuple[torch.Tensor, torch.Tensor]] = []
        
        self._prepare_data(texts)

    def _prepare_data(self, texts: List[str]):
        """
        Tokenizes sentences and creates fixed-length next-token prediction pairs.
        Applies <PAD> padding if shorter than seq_len + 1.
        """
        for text in texts:
            if not text.strip():
                continue
            # Encode with <BOS> and <EOS>
            tokens = self.tokenizer.encode(text, add_special_tokens=True)
            
            # If line is too short, pad it
            if len(tokens) < self.seq_len + 1:
                padding = [self.tokenizer.pad_id] * (self.seq_len + 1 - len(tokens))
                tokens = tokens + padding
            else:
                tokens = tokens[: self.seq_len + 1]

            # Shift by 1 for next-token prediction:
            # input_ids: tokens from index 0 to seq_len-1
            # target_ids: tokens from index 1 to seq_len
            input_ids = torch.tensor(tokens[:-1], dtype=torch.long)
            target_ids = torch.tensor(tokens[1:], dtype=torch.long)
            
            self.samples.append((input_ids, target_ids))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.samples[idx]


def load_corpus(filepath: str) -> List[str]:
    """Reads lines from the debugging text file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Corpus file not found at: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    return lines


def create_dataloaders(
    corpus_path: str,
    tokenizer: SimpleTokenizer,
    seq_len: int = 32,
    batch_size: int = 4,
    train_split: float = 0.85,
    seed: int = 42
) -> Tuple[DataLoader, DataLoader]:
    """
    Loads text, fits vocabulary if not built, and returns train & val DataLoaders.
    """
    lines = load_corpus(corpus_path)
    
    # If tokenizer vocabulary only has special tokens, build it from the corpus
    if tokenizer.vocab_size <= len(tokenizer.special_tokens):
        tokenizer.build_vocab(lines, min_freq=1)

    # Deterministic train/validation split
    generator = torch.Generator().manual_seed(seed)
    dataset = DebuggingDataset(lines, tokenizer, seq_len=seq_len)
    
    train_size = int(len(dataset) * train_split)
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size], generator=generator
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader
