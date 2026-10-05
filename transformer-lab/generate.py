"""
Steps 18 & 19 — Autoregressive Text Generation & Temperature Sampling
=====================================================================
This script implements step-by-step autoregressive decoding for the TinyTransformerLM.

Autoregressive Generation Flow (Step 18):
-----------------------------------------
1. Given an initial prompt string: "The code has"
2. Tokenize prompt into Token IDs: [14, 28, 9]
3. Loop for `max_new_tokens`:
     a. Pass current sequence into model: logits = model(current_ids)
     b. Take logits of the LAST token: last_logits = logits[:, -1, :]
     c. Apply Temperature Scaling: scaled_logits = last_logits / temperature
     d. Softmax converts scaled logits into a categorical probability distribution.
     e. Sample next token index: next_token ~ Categorical(probs) (or argmax).
     f. If next_token == <EOS>, stop generation.
     g. Append next_token to current sequence.
4. Decode accumulated token IDs back into text.

Temperature Sampling (Step 19):
-------------------------------
Given raw logit z_i for vocabulary token i:
    P(i) = exp(z_i / T) / sum_j(exp(z_j / T))

Effects:
- Low Temperature (T < 1.0, e.g., 0.3):
    Accentuates differences. The highest logit dominates; output is highly predictable and conservative.
- High Temperature (T > 1.0, e.g., 1.2):
    Flattens differences. Lower-probability tokens get higher chance of selection; output is more diverse.
- Note: Temperature does not create machine intelligence; it simply shifts probability entropy.
"""

import os
import argparse
from typing import List, Dict, Any, Optional

import torch
import torch.nn.functional as F

from tokenizer import SimpleTokenizer
from model import TinyTransformerLM, get_default_device


def load_model_and_tokenizer(
    checkpoint_path: str = "checkpoints/tiny_transformer.pt",
    vocab_path: str = "checkpoints/tokenizer_vocab.json"
):
    """Loads trained checkpoint and tokenizer."""
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}. Train the model first using train.py.")
    if not os.path.exists(vocab_path):
        raise FileNotFoundError(f"Vocabulary not found at: {vocab_path}.")

    tokenizer = SimpleTokenizer()
    tokenizer.load(vocab_path)

    device = get_default_device()
    checkpoint = torch.load(checkpoint_path, map_location=device)
    config = checkpoint["config"]

    model = TinyTransformerLM(
        vocab_size=config["vocab_size"],
        d_model=config["d_model"],
        num_heads=config["num_heads"],
        num_layers=config["num_layers"],
        d_ff=config["d_ff"],
        max_seq_len=config["max_seq_len"],
        dropout=0.0
    ).to(device)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model, tokenizer, device


def generate_text(
    model: TinyTransformerLM,
    tokenizer: SimpleTokenizer,
    prompt: str,
    max_new_tokens: int = 15,
    temperature: float = 0.8,
    top_k: int = 5,
    device: Optional[torch.device] = None
) -> Dict[str, Any]:
    """
    Generates text autoregressively and logs candidate token probabilities at each step.
    """
    if device is None:
        device = next(model.parameters()).device

    tokens = tokenizer.encode(prompt, add_special_tokens=False)
    if not tokens:
        tokens = [tokenizer.bos_id]

    input_ids = torch.tensor([tokens], dtype=torch.long, device=device)
    generated_ids = list(tokens)

    step_details: List[Dict[str, Any]] = []

    with torch.no_grad():
        for step in range(max_new_tokens):
            # Crop to maximum sequence length if input grows beyond window
            curr_inputs = input_ids[:, -model.max_seq_len:]

            logits, _ = model(curr_inputs)
            # Focus on the last token prediction: [1, vocab_size]
            next_token_logits = logits[:, -1, :]

            # Temperature Scaling
            temp = max(float(temperature), 1e-4)
            scaled_logits = next_token_logits / temp
            probs = F.softmax(scaled_logits, dim=-1)

            # Top candidate tokens for educational inspection
            top_probs, top_indices = torch.topk(probs, k=min(top_k, model.vocab_size))
            top_candidates = []
            for p, idx in zip(top_probs[0].tolist(), top_indices[0].tolist()):
                top_candidates.append({
                    "token": tokenizer.id_to_token.get(idx, tokenizer.UNK_TOKEN),
                    "id": idx,
                    "probability": round(p, 4)
                })

            # Sample or greedy selection
            if temp < 0.1:
                next_id = int(torch.argmax(next_token_logits, dim=-1).item())
            else:
                next_id = int(torch.multinomial(probs, num_samples=1).item())

            chosen_token = tokenizer.id_to_token.get(next_id, tokenizer.UNK_TOKEN)

            step_details.append({
                "step": step + 1,
                "chosen_token": chosen_token,
                "chosen_id": next_id,
                "top_candidates": top_candidates,
            })

            generated_ids.append(next_id)

            # Stop if End-Of-Sequence token is produced
            if next_id == tokenizer.eos_id:
                break

            # Update input_ids for next iteration
            input_ids = torch.cat([input_ids, torch.tensor([[next_id]], device=device)], dim=1)

    generated_text = tokenizer.decode(generated_ids, skip_special_tokens=True)

    return {
        "prompt": prompt,
        "generated_text": generated_text,
        "total_new_tokens": len(step_details),
        "steps": step_details,
        "temperature": temperature,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autoregressive text generation with TinyTransformerLM")
    parser.add_argument("--prompt", type=str, default="The code has", help="Seed prompt")
    parser.add_argument("--max-tokens", type=int, default=12, help="Maximum new tokens to generate")
    parser.add_argument("--temperature", type=float, default=0.7, help="Sampling temperature")
    args = parser.parse_args()

    try:
        model, tokenizer, device = load_model_and_tokenizer()
        result = generate_text(
            model=model,
            tokenizer=tokenizer,
            prompt=args.prompt,
            max_new_tokens=args.max_tokens,
            temperature=args.temperature,
            device=device
        )
        print("\n--- Generation Result ---")
        print(f"Prompt: '{result['prompt']}'")
        print(f"Output: '{result['generated_text']}'")
        print(f"Temperature: {result['temperature']}")
        print("\nStep-by-step prediction:")
        for s in result["steps"]:
            candidates = ", ".join([f"{c['token']} ({c['probability']:.1%})" for c in s['top_candidates'][:3]])
            print(f"Step {s['step']}: selected '{s['chosen_token']}' [Candidates: {candidates}]")
    except Exception as e:
        print(f"Generation error: {e}")
