# DevFix Transformer Lab — Transformer From Scratch

**DevFix Transformer Lab** is the Stage 5 educational AI/ML subsystem of the **DevFix AI** developer platform.

Rather than merely making API calls to a closed-source pretrained LLM (Gemini, GPT, Claude), this module implements every layer of a modern decoder-only Transformer language model from mathematical first principles using **Python**, **PyTorch**, and **NumPy**.

---

## 1. What is a Transformer?

A **Transformer** is a neural network architecture originally introduced by Vaswani et al. in the landmark 2017 paper *"Attention Is All You Need"*.

Traditional recurrent networks (RNNs, LSTMs) processed text sequentially token-by-token from left to right, creating information bottlenecks and preventing parallel training on modern hardware. Transformers eliminated recurrence completely, replacing it with **Multi-Head Self-Attention**, enabling the model to compare and mix representations across all sequence positions simultaneously.

Modern Large Language Models (LLMs) such as GPT-4, Gemini, Claude, and Llama are all direct descendants of this foundational decoder-only Transformer architecture.

---

## 2. What We Implemented

The **DevFix Transformer Lab** implements the complete autoregressive pipeline across 12 standalone Python modules:

1. **`tokenizer.py` (SimpleTokenizer)**:
   - Word and punctuation tokenization.
   - Special tokens: `<PAD>` (0), `<UNK>` (1), `<BOS>` (2), `<EOS>` (3).
   - Bi-directional mappings (`token → ID`, `ID → token`).
2. **`dataset.py` (DebuggingDataset)**:
   - Causal next-token prediction shift ($x = \text{tokens}_{0 \dots L-1}, y = \text{tokens}_{1 \dots L}$).
   - PyTorch `DataLoader` with batching and sequence padding.
3. **`embeddings.py` (TokenEmbedding)**:
   - Discrete ID to continuous $d_{model}$-dimensional learned vector projection (`nn.Embedding`).
   - Embedding scaling by $\sqrt{d_{model}}$.
4. **`positional_encoding.py` (SinusoidalPositionalEncoding)**:
   - Injects token order information into permutation-invariant attention representations.
   - Mathematical sinusoidal functions ($\sin$ for even indices, $\cos$ for odd indices).
5. **`attention.py` (ScaledDotProductAttention & CausalMask)**:
   - Manual computation: $\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}} + M\right) V$.
   - Lower-triangular causal mask forcing future token attention weights to $0.0$.
6. **`multi_head_attention.py` (MultiHeadAttention)**:
   - Splits $d_{model}$ into $h$ heads ($d_k = d_{model} / h$).
   - Parallel head attention + concatenation + final output projection ($W_o$).
7. **`feed_forward.py` (FeedForwardNetwork)**:
   - Position-wise non-linear feature transformation (`Linear(d_model, 4*d_model) → GELU → Linear(4*d_model, d_model)`).
8. **`transformer_block.py` (TransformerBlock)**:
   - Modern Pre-LayerNorm block combining LayerNorm, Causal MHA, Residual Skip Connections, and FFN.
9. **`model.py` (TinyTransformerLM)**:
   - Complete decoder-only Transformer stack + LM output projection head to vocabulary logits.
10. **`train.py` (Training Loop)**:
    - `CrossEntropyLoss` (ignoring `<PAD>`) + `AdamW` optimizer + gradient clipping + checkpointing.
11. **`generate.py` (Autoregressive Generation)**:
    - Step-by-step next-token prediction with temperature scaling and top-candidate inspection.
12. **`evaluate.py` & `visualization/`**:
    - Perplexity evaluation, prompt completions, attention heatmap visualization, and loss curve plotting.

---

## 3. Complete Architecture Flow

```text
                           INPUT TEXT
                    ("The code has an error")
                                ↓
                            TOKENIZER
                                ↓
                            TOKEN IDs
                         [14, 28, 9, ...]
                                ↓
                      TOKEN EMBEDDING (128)
                                +
                     POSITIONAL ENCODING
                                ↓
                      TRANSFORMER BLOCK 1
          ┌─────────────────────┴─────────────────────┐
          ↓                                           ↓
   Multi-Head Self-Attention                 Feed-Forward Network
   (4 Heads, Causal Masked)                  (128 → 512 → GELU → 128)
          ↓                                           ↓
   Residual Connection (+)                    Residual Connection (+)
   + Layer Normalization                      + Layer Normalization
          └─────────────────────┬─────────────────────┘
                                ↓
                      TRANSFORMER BLOCK 2
                                ↓
                         FINAL LAYERNORM
                                ↓
                        LINEAR LM HEAD
                     (128 → Vocab Size 286)
                                ↓
                        VOCABULARY LOGITS
                                ↓
                      TEMPERATURE / SOFTMAX
                                ↓
                           NEXT TOKEN
                            ("in")
```

---

## 4. Mathematical Transparency

### 1. Scaled Dot-Product Attention

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}} + M\right) V$$

* **Query ($Q$)**: What information is this token seeking from context?
* **Key ($K$)**: What information does each candidate token provide?
* **Value ($V$)**: What representation is aggregated if a match occurs?
* **Scale ($\sqrt{d_k}$)**: Prevents dot products from exploding in high dimensions, protecting gradients from vanishing in the softmax tails.
* **Causal Mask ($M$)**: Upper-triangular matrix set to $-\infty$ so $\exp(-\infty) = 0$, ensuring tokens never attend to future tokens.

### 2. Multi-Head Attention

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O$$

$$\text{head}_i = \text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)$$

### 3. Sinusoidal Positional Encoding

$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i / d_{model}}}\right)$$

$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i / d_{model}}}\right)$$

### 4. Next-Token Training Objective (Cross-Entropy Loss)

$$\mathcal{L} = - \frac{1}{N} \sum_{i=1}^N \log P(w_i \mid w_1, \dots, w_{i-1})$$

Minimizing this cross-entropy loss trains the network weights via backpropagation (`loss.backward()` and `AdamW.step()`).

---

## 5. Quickstart & CLI Commands

All scripts run out-of-the-box on CPU with standard laptop specifications (no GPU required):

```bash
# 1. Train the model from scratch (takes ~5 seconds on CPU)
cd transformer-lab
python3 train.py --epochs 25 --d-model 128 --heads 4 --layers 2

# 2. Evaluate model on test prompts
python3 evaluate.py

# 3. Generate text with temperature sampling
python3 generate.py --prompt "The code has" --temperature 0.7 --max-tokens 15

# 4. Generate attention heatmap plot
python3 visualization/attention_visualizer.py

# 5. Generate training loss curve
python3 visualization/training_plot.py
```

---

## 6. Connection to DevFix AI

The **DevFix Transformer Lab** does **not** replace the Gemini-based production debugging agents. Instead, it serves as the foundational educational substrate of the platform:

```text
DevFix AI Platform
├── Stage 1: Single AI Agent (Explain & Fix)
├── Stage 2: Tool Agent (Isolated Code Execution)
├── Stage 3: Multi-Agent System (Manager, Analyzer, Fixer, Tester, Reviewer)
├── Stage 4: MCP Server (Model Context Protocol Tool Integration)
└── Stage 5: Transformer Lab (Under-the-Hood Transformer Architecture from Scratch)
```

By exploring Stage 5, developers learn **how** neural networks generate embeddings, compute attention weights, and predict subsequent tokens, demystifying the underlying mechanics of modern generative AI.

---

## 7. Educational Limitations

* **Tiny Model Capacity**: This educational model contains ~468,000 parameters and is trained on a small domain-specific programming corpus.
* **Limited Domain Coverage**: It cannot write general essays or answer complex world-knowledge queries (which requires billions of parameters and web-scale datasets).
* **Strictly for Learning**: Designed for transparent understanding of Transformer components, tensor shapes, and training dynamics.
