"""
Step 1 & Step 2 — Tokenizer and Vocabulary
===========================================
This module implements a beginner-friendly SimpleTokenizer for the DevFix Transformer Lab.

Concept:
- Computers and neural networks cannot directly process raw text characters.
- A Tokenizer breaks down text into discrete pieces called 'tokens' (words, punctuation, or subwords).
- Each token is assigned a unique integer called a 'Token ID'.
- Special tokens are essential for model training:
    <PAD> (ID 0): Padding token to equalize sequence lengths in a mini-batch.
    <UNK> (ID 1): Unknown token for words not present in the vocabulary.
    <BOS> (ID 2): Beginning Of Sequence token indicating start of generation.
    <EOS> (ID 3): End Of Sequence token signaling completion of text.
"""

import re
import json
from typing import List, Dict, Optional


class SimpleTokenizer:
    """
    A word-level tokenizer with punctuation preservation and special token support.
    """
    PAD_TOKEN = "<PAD>"
    UNK_TOKEN = "<UNK>"
    BOS_TOKEN = "<BOS>"
    EOS_TOKEN = "<EOS>"

    def __init__(self):
        # Initial special tokens with fixed, predictable IDs
        self.special_tokens = [
            self.PAD_TOKEN,
            self.UNK_TOKEN,
            self.BOS_TOKEN,
            self.EOS_TOKEN,
        ]
        
        self.token_to_id: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        
        # Populate initial special tokens
        for idx, token in enumerate(self.special_tokens):
            self.token_to_id[token] = idx
            self.id_to_token[idx] = token
            
        self.pad_id = self.token_to_id[self.PAD_TOKEN]
        self.unk_id = self.token_to_id[self.UNK_TOKEN]
        self.bos_id = self.token_to_id[self.BOS_TOKEN]
        self.eos_id = self.token_to_id[self.EOS_TOKEN]

    @property
    def vocab_size(self) -> int:
        """Returns the total number of unique tokens in the vocabulary."""
        return len(self.token_to_id)

    def tokenize_raw(self, text: str) -> List[str]:
        """
        Splits text into words and punctuation tokens, normalizing to lowercase.
        Example: "Hello, world!" -> ["hello", ",", "world", "!"]
        """
        cleaned = text.strip().lower()
        # Regex extracts alphanumeric words or individual punctuation marks
        tokens = re.findall(r"[a-z0-9_]+|[.,!?;:()\[\]{}]", cleaned)
        return tokens

    def build_vocab(self, texts: List[str], min_freq: int = 1):
        """
        Constructs vocabulary from a list of training sentences.
        Calculates token frequencies and assigns sequential integer IDs.
        """
        freqs: Dict[str, int] = {}
        for text in texts:
            for token in self.tokenize_raw(text):
                freqs[token] = freqs.get(token, 0) + 1

        # Sort by frequency descending, then alphabetically for determinism
        sorted_tokens = sorted(freqs.keys(), key=lambda t: (-freqs[t], t))
        for token in sorted_tokens:
            if freqs[token] >= min_freq and token not in self.token_to_id:
                new_id = len(self.token_to_id)
                self.token_to_id[token] = new_id
                self.id_to_token[new_id] = token

    def encode(self, text: str, add_special_tokens: bool = False) -> List[int]:
        """
        Converts human-readable text into a list of integer Token IDs.
        Example: "hello world" -> [5, 12]
        """
        tokens = self.tokenize_raw(text)
        token_ids: List[int] = []

        if add_special_tokens:
            token_ids.append(self.bos_id)

        for token in tokens:
            token_ids.append(self.token_to_id.get(token, self.unk_id))

        if add_special_tokens:
            token_ids.append(self.eos_id)

        return token_ids

    def decode(self, token_ids: List[int], skip_special_tokens: bool = True) -> str:
        """
        Converts a list of integer Token IDs back into human-readable text.
        """
        words: List[str] = []
        for tid in token_ids:
            token = self.id_to_token.get(tid, self.UNK_TOKEN)
            if skip_special_tokens and token in self.special_tokens:
                continue
            words.append(token)

        # Basic punctuation detokenization formatting
        text = " ".join(words)
        text = re.sub(r'\s+([.,!?;:)\]}])', r'\1', text)
        text = re.sub(r'([(\[{])\s+', r'\1', text)
        return text

    def save(self, filepath: str):
        """Saves vocabulary mapping to a JSON file."""
        data = {
            "token_to_id": self.token_to_id,
            "special_tokens": self.special_tokens,
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def load(self, filepath: str):
        """Loads vocabulary mapping from a JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.token_to_id = data["token_to_id"]
        self.id_to_token = {int(v): k for k, v in self.token_to_id.items()}
        self.special_tokens = data.get("special_tokens", self.special_tokens)
        self.pad_id = self.token_to_id[self.PAD_TOKEN]
        self.unk_id = self.token_to_id[self.UNK_TOKEN]
        self.bos_id = self.token_to_id[self.BOS_TOKEN]
        self.eos_id = self.token_to_id[self.EOS_TOKEN]


if __name__ == "__main__":
    sample_text = "The programmer fixed the error!"
    tokenizer = SimpleTokenizer()
    tokenizer.build_vocab([
        "The programmer fixed the error!",
        "Python code contains syntax error.",
        "Check variable before using it."
    ])
    
    print(f"Vocabulary Size: {tokenizer.vocab_size}")
    ids = tokenizer.encode(sample_text, add_special_tokens=True)
    print(f"Original Text: '{sample_text}'")
    print(f"Encoded Token IDs: {ids}")
    decoded = tokenizer.decode(ids, skip_special_tokens=True)
    print(f"Decoded Text: '{decoded}'")
