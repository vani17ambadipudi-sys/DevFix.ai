import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  BookOpen,
  Play,
  RotateCw,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Activity,
  Zap,
  ArrowRight,
  TrendingDown,
  Terminal,
  Grid,
} from 'lucide-react';
import {
  transformerClient,
  TransformerStatusResponse,
  TokenizeResult,
  AttentionResult,
  GenerationResult,
} from '../services/transformerClient';

type TabType = 'overview' | 'tokenizer' | 'positional' | 'attention' | 'generate' | 'training' | 'math';

export const TransformerLabPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [status, setStatus] = useState<TransformerStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Model Config Simulator State
  const [simDModel, setSimDModel] = useState<number>(128);
  const [simHeads, setSimHeads] = useState<number>(4);
  const [simLayers, setSimLayers] = useState<number>(2);
  const [simSeqLen, setSimSeqLen] = useState<number>(32);

  // Tokenizer State
  const [tokenInput, setTokenInput] = useState<string>('The programmer fixed the error');
  const [tokenizeData, setTokenizeData] = useState<TokenizeResult | null>(null);
  const [loadingTokenize, setLoadingTokenize] = useState(false);

  // Positional Encoding State
  const [posMatrix, setPosMatrix] = useState<number[][]>([]);
  const [loadingPos, setLoadingPos] = useState(false);

  // Attention Visualization State
  const [attnInput, setAttnInput] = useState<string>('The programmer fixed the error');
  const [attnResult, setAttnResult] = useState<AttentionResult | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<number>(1);
  const [selectedHead, setSelectedHead] = useState<number>(1);
  const [loadingAttn, setLoadingAttn] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ qToken: string; kToken: string; qIdx: number; kIdx: number; val: number } | null>(null);

  // Text Generation State
  const [genPrompt, setGenPrompt] = useState<string>('The code has');
  const [genTemp, setGenTemp] = useState<number>(0.7);
  const [genTokens, setGenTokens] = useState<number>(12);
  const [genResult, setGenResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Training Dashboard State
  const [trainingEpochs, setTrainingEpochs] = useState<number>(15);
  const [isTraining, setIsTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState<{ epoch: number; total_epochs: number; train_loss: number; val_loss: number } | null>(null);
  const [trainHistory, setTrainHistory] = useState<{ epochs: number[]; train_loss: number[]; val_loss: number[] } | null>(null);

  // Load Status on Mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await transformerClient.getStatus();
      setStatus(res);
      if (res.history?.history) {
        setTrainHistory(res.history.history);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Run initial tokenization & attention when tabs change
  useEffect(() => {
    if (activeTab === 'tokenizer' && !tokenizeData) {
      handleTokenize();
    } else if (activeTab === 'positional' && posMatrix.length === 0) {
      loadPositional();
    } else if (activeTab === 'attention' && !attnResult) {
      handleComputeAttention();
    }
  }, [activeTab]);

  const handleTokenize = async () => {
    try {
      setLoadingTokenize(true);
      const res = await transformerClient.tokenize(tokenInput);
      setTokenizeData(res);
    } catch (err) {
      console.error('Tokenize error:', err);
    } finally {
      setLoadingTokenize(false);
    }
  };

  const loadPositional = async () => {
    try {
      setLoadingPos(true);
      const res = await transformerClient.getPositionalMatrix(16, 32);
      setPosMatrix(res.matrix);
    } catch (err) {
      console.error('Positional error:', err);
    } finally {
      setLoadingPos(false);
    }
  };

  const handleComputeAttention = async () => {
    try {
      setLoadingAttn(true);
      const res = await transformerClient.getAttentionMaps(attnInput);
      setAttnResult(res);
      setSelectedLayer(1);
      setSelectedHead(1);
    } catch (err) {
      console.error('Attention error:', err);
    } finally {
      setLoadingAttn(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await transformerClient.generate(genPrompt, genTokens, genTemp);
      setGenResult(res);
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartTraining = async () => {
    try {
      setIsTraining(true);
      setTrainProgress(null);
      const localHistory: { epochs: number[]; train_loss: number[]; val_loss: number[] } = {
        epochs: [],
        train_loss: [],
        val_loss: [],
      };

      await transformerClient.streamTraining(
        {
          epochs: trainingEpochs,
          lr: 0.001,
          d_model: simDModel,
          heads: simHeads,
          layers: simLayers,
        },
        (progress) => {
          setTrainProgress(progress);
          localHistory.epochs.push(progress.epoch);
          localHistory.train_loss.push(progress.train_loss);
          localHistory.val_loss.push(progress.val_loss);
          setTrainHistory({ ...localHistory });
        }
      );

      // Refresh status after training completes
      await loadStatus();
    } catch (err) {
      console.error('Training error:', err);
    } finally {
      setIsTraining(false);
    }
  };

  // Dynamic Parameter Calculator
  const calcParameters = (vocabSize: number, dModel: number, layers: number) => {
    const tokenEmb = vocabSize * dModel;
    const posEmb = 0; // Sinusoidal is constant
    const mhaPerLayer = 4 * dModel * dModel; // Wq, Wk, Wv, Wo
    const ffnPerLayer = 2 * dModel * (4 * dModel); // 128->512, 512->128
    const lnPerLayer = 4 * dModel; // 2 LayerNorms per block (gamma, beta)
    const blockTotal = mhaPerLayer + ffnPerLayer + lnPerLayer;
    const finalLn = 2 * dModel;
    const lmHead = dModel * vocabSize;
    return tokenEmb + posEmb + layers * blockTotal + finalLn + lmHead;
  };

  const vocabCount = status?.vocab_size || 286;
  const currentParams = calcParameters(vocabCount, simDModel, simLayers);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#11192e] via-[#161f38] to-[#121626] border border-cyan-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Stage 5: Transformer Architecture From Scratch
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              DevFix Transformer Lab
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore the internal mechanics of a decoder-only Transformer language model built
              with Python, PyTorch, and NumPy. Understand tokenization, positional encodings,
              multi-head attention, and next-token prediction without relying on third-party LLM APIs.
            </p>
          </div>

          {/* Real-time Status Card */}
          <div className="bg-[#0b0f17]/90 border border-slate-800 rounded-2xl p-4 w-full lg:w-72 space-y-2.5 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Device:
              </span>
              <span className="text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800">
                {status?.device || 'CPU'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Framework:</span>
              <span className="text-slate-200">PyTorch {status?.pytorch_version || '2.x'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Parameters:</span>
              <span className="text-purple-300 font-semibold">{currentParams.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vocabulary:</span>
              <span className="text-emerald-300 font-semibold">{vocabCount} tokens</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Model Checkpoint:</span>
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {status?.checkpoint_exists ? 'Trained & Ready' : 'Available'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          {[
            { id: 'overview', label: '1. Architecture & Model', icon: Layers },
            { id: 'tokenizer', label: '2. Tokenizer & Vocab', icon: BookOpen },
            { id: 'positional', label: '3. Positional Encoding', icon: Grid },
            { id: 'attention', label: '4. Self-Attention Matrix', icon: Activity },
            { id: 'generate', label: '5. Text Generation', icon: Play },
            { id: 'training', label: '6. Training Dashboard', icon: TrendingDown },
            { id: 'math', label: '7. Mathematical Reference', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ARCHITECTURE EXPLORER */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Visual Pipeline Flow */}
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Decoder-Only Transformer Architecture Flow
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  How text transforms from raw characters into predictive probability distributions over the vocabulary.
                </p>
              </div>

              <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                2 Blocks • 4 Attention Heads • Pre-LayerNorm
              </div>
            </div>

            {/* Architecture Steps Flow Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: '01',
                  name: 'Tokenization',
                  desc: 'Splits raw text into discrete tokens & assigns deterministic integer IDs.',
                  color: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
                },
                {
                  step: '02',
                  name: 'Dense Embeddings',
                  desc: 'Maps integer IDs to 128-dimensional dense learned vectors with sqrt(d_model) scaling.',
                  color: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
                },
                {
                  step: '03',
                  name: 'Positional Encoding',
                  desc: 'Adds deterministic sinusoidal waves to inject word order into permutation-invariant attention.',
                  color: 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300',
                },
                {
                  step: '04',
                  name: 'Multi-Head Attention',
                  desc: 'Splits into 4 heads, projecting into Q, K, V with lower-triangular causal masking.',
                  color: 'border-purple-500/30 bg-purple-950/20 text-purple-300',
                },
                {
                  step: '05',
                  name: 'Residual Highway',
                  desc: 'Skip connections (x + Sublayer(x)) allow gradients to flow without vanishing.',
                  color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
                },
                {
                  step: '06',
                  name: 'Feed-Forward Network',
                  desc: 'Independent position-wise non-linear projection (128 -> 512 -> GELU -> 128).',
                  color: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
                },
                {
                  step: '07',
                  name: 'Layer Normalization',
                  desc: 'Normalizes mean & variance across feature channels to stabilize activations.',
                  color: 'border-teal-500/30 bg-teal-950/20 text-teal-300',
                },
                {
                  step: '08',
                  name: 'Next-Token Prediction',
                  desc: 'Linear LM head computes vocabulary logits; softmax produces probability distribution.',
                  color: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
                },
              ].map((item) => (
                <div key={item.step} className={`p-4 rounded-2xl border ${item.color} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 font-bold">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">{item.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Model Hyperparameters & Parameter Counter */}
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  Interactive Model Dimensions & Parameter Calculator
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Adjust architectural dimensions to see how parameters scale across token embeddings, attention weights, and feed-forward networks.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">Total Trainable Parameters:</span>
                <div className="text-2xl font-extrabold text-cyan-400 font-mono">
                  {calcParameters(vocabCount, simDModel, simLayers).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
              <div className="space-y-2 bg-[#0b0f17] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Embedding Dim (d_model):</span>
                  <span className="text-cyan-300 font-bold">{simDModel}</span>
                </div>
                <div className="flex gap-2">
                  {[64, 128, 256].map((dim) => (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => setSimDModel(dim)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        simDModel === dim
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {dim}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Vector representation width per token.</p>
              </div>

              <div className="space-y-2 bg-[#0b0f17] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Attention Heads:</span>
                  <span className="text-purple-300 font-bold">{simHeads}</span>
                </div>
                <div className="flex gap-2">
                  {[2, 4, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSimHeads(h)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        simHeads === h
                          ? 'bg-purple-500 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Head dim: {simDModel / simHeads} per attention subspace.</p>
              </div>

              <div className="space-y-2 bg-[#0b0f17] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Transformer Blocks:</span>
                  <span className="text-emerald-300 font-bold">{simLayers}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 4].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSimLayers(l)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        simLayers === l
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Depth of stacked attention + FFN blocks.</p>
              </div>

              <div className="space-y-2 bg-[#0b0f17] p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Context Window (seq_len):</span>
                  <span className="text-amber-300 font-bold">{simSeqLen} tokens</span>
                </div>
                <div className="flex gap-2">
                  {[16, 32, 64].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSimSeqLen(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        simSeqLen === s
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Maximum token history window.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOKENIZER & VOCABULARY */}
      {activeTab === 'tokenizer' && (
        <div className="space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  Step 1 & 2: Tokenization & Vocabulary Mapping
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Text must be converted into numerical Token IDs. Special tokens handle batch padding, unknown words, and generation boundaries.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-700 text-emerald-300">
                  Vocab Size: {tokenizeData?.vocab_size || vocabCount}
                </span>
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>Enter text to tokenize:</span>
                <span className="text-slate-500">Supports words and punctuation</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="The programmer fixed the error"
                  className="flex-1 bg-[#0b0f17] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleTokenize}
                  disabled={loadingTokenize}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs font-mono transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingTokenize ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Tokenize
                </button>
              </div>
            </div>

            {/* Results Grid */}
            {tokenizeData && (
              <div className="space-y-6 pt-4 border-t border-slate-800">
                {/* Special Tokens Key */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(tokenizeData.special_tokens || {}).map(([tok, id]) => (
                    <div key={tok} className="p-3 bg-[#0b0f17] rounded-xl border border-slate-800 text-xs font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase">Special Token</span>
                      <span className="text-cyan-300 font-bold text-sm">{tok}</span>
                      <span className="text-slate-500 float-right">ID: {id}</span>
                    </div>
                  ))}
                </div>

                {/* Tokens to IDs Mapping Cards */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Token Breakdown & Assigned IDs:
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {tokenizeData.token_breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0e1424] border border-cyan-800/40 rounded-xl p-3 flex flex-col items-center min-w-[70px] shadow-sm"
                      >
                        <span className="text-[10px] font-mono text-slate-400">Pos {idx}</span>
                        <span className="text-sm font-bold text-white my-1 font-mono">
                          "{item.token}"
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-bold">
                          ID: {item.id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Array Representation */}
                <div className="bg-[#0b0f17] p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="text-slate-400">Token ID Sequence (Input to Embedding Layer):</div>
                  <div className="text-purple-300 font-bold">
                    [{tokenizeData.token_ids.join(', ')}]
                  </div>
                  <div className="text-slate-500 text-[11px] pt-1">
                    With BOS & EOS boundary tokens: [{tokenizeData.token_ids_with_special.join(', ')}]
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: POSITIONAL ENCODING */}
      {activeTab === 'positional' && (
        <div className="space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-400" />
                Step 4: Sinusoidal Positional Encoding
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Because self-attention is permutation-invariant, "I debug code" and "code debug I"
                would produce identical representations without positional information.
              </p>
            </div>

            {/* Explanation card */}
            <div className="p-4 rounded-2xl bg-[#0b0f17] border border-indigo-900/40 text-xs text-slate-300 space-y-2 leading-relaxed">
              <div className="font-semibold text-indigo-300 font-mono">
                PE(pos, 2i) = sin(pos / 10000^(2i/d_model)) &bull; PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
              </div>
              <p>
                Low-index feature dimensions oscillate rapidly with high frequency (capturing immediate local neighbors),
                while high-index dimensions oscillate with long periods (tracking global sequence offsets).
              </p>
            </div>

            {/* Positional Matrix Heatmap */}
            {posMatrix.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Positional Matrix (16 Positions &times; 32 Embedding Dimensions):</span>
                  <span>Values range from -1.0 to +1.0</span>
                </div>

                <div className="overflow-x-auto bg-[#0b0f17] p-4 rounded-2xl border border-slate-800">
                  <div className="min-w-[600px] space-y-1">
                    {posMatrix.map((row, posIdx) => (
                      <div key={posIdx} className="flex items-center gap-1">
                        <span className="w-12 text-[10px] font-mono text-slate-500 text-right pr-2">
                          pos {posIdx}
                        </span>
                        <div className="flex flex-1 gap-0.5">
                          {row.slice(0, 32).map((val, dimIdx) => {
                            // Map -1..+1 to color
                            const intensity = Math.abs(val);
                            const isPositive = val >= 0;
                            const bg = isPositive
                              ? `rgba(6, 182, 212, ${intensity})`
                              : `rgba(168, 85, 247, ${intensity})`;

                            return (
                              <div
                                key={dimIdx}
                                title={`Pos: ${posIdx}, Dim: ${dimIdx}, Value: ${val}`}
                                style={{ backgroundColor: bg }}
                                className="flex-1 h-5 rounded-xs transition-transform hover:scale-125 hover:z-10 cursor-pointer"
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-800/80 mt-2">
                    <span>Dim 0 (High Frequency) &rarr;</span>
                    <span>&larr; Dim 31 (Low Frequency)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SELF-ATTENTION MATRIX */}
      {activeTab === 'attention' && (
        <div className="space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Steps 5, 6, & 7: Multi-Head Self-Attention Matrix Visualizer
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Inspect the token-by-token attention weights matrix. Notice the triangular causal mask preventing past tokens from seeing future tokens.
                </p>
              </div>

              {/* Sample Sentences Quick Buttons */}
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {[
                  'The programmer fixed the error',
                  'Python code contains syntax error',
                  'The function returns an incorrect value',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setAttnInput(s);
                      transformerClient.getAttentionMaps(s).then(setAttnResult);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 text-[11px]"
                  >
                    "{s.slice(0, 24)}..."
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={attnInput}
                onChange={(e) => setAttnInput(e.target.value)}
                placeholder="The programmer fixed the error"
                className="flex-1 bg-[#0b0f17] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleComputeAttention}
                disabled={loadingAttn}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs font-mono transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingAttn ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Compute Attention
              </button>
            </div>

            {/* Layer & Head Selectors */}
            {attnResult && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0b0f17] p-3 rounded-2xl border border-slate-800 text-xs font-mono">
                  {/* Layer Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Block Layer:</span>
                    {attnResult.layers.map((l) => (
                      <button
                        key={l.layer_index}
                        type="button"
                        onClick={() => setSelectedLayer(l.layer_index)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          selectedLayer === l.layer_index
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Layer {l.layer_index}
                      </button>
                    ))}
                  </div>

                  {/* Head Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Attention Head:</span>
                    {attnResult.layers[selectedLayer - 1]?.heads.map((h) => (
                      <button
                        key={h.head_index}
                        type="button"
                        onClick={() => setSelectedHead(h.head_index)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          selectedHead === h.head_index
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Head {h.head_index}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    d_k: 32 per head &bull; softmax(QK^T / &radic;d_k)
                  </span>
                </div>

                {/* The Attention Grid */}
                {(() => {
                  const currentHead = attnResult.layers[selectedLayer - 1]?.heads[selectedHead - 1];
                  const matrix = currentHead?.matrix || [];
                  const tokens = attnResult.tokens;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Matrix View */}
                      <div className="lg:col-span-2 bg-[#0b0f17] p-6 rounded-2xl border border-slate-800 overflow-x-auto">
                        <div className="inline-block min-w-full">
                          {/* Column Headers (Keys) */}
                          <div className="flex pl-24 mb-2 gap-1.5">
                            {tokens.map((token, j) => (
                              <div
                                key={j}
                                className="w-14 sm:w-16 text-center text-[11px] font-mono text-cyan-300 truncate"
                                title={`Key ${j}: ${token}`}
                              >
                                {token}
                              </div>
                            ))}
                          </div>

                          {/* Matrix Rows (Queries) */}
                          <div className="space-y-1.5">
                            {tokens.map((qToken, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="w-24 text-right pr-2 text-[11px] font-mono text-purple-300 truncate font-semibold">
                                  {qToken} &rarr;
                                </span>
                                <div className="flex gap-1.5">
                                  {tokens.map((kToken, j) => {
                                    const val = matrix[i] ? matrix[i][j] || 0 : 0;
                                    const isMasked = j > i; // Causal mask
                                    const intensity = Math.min(val, 1.0);

                                    return (
                                      <div
                                        key={j}
                                        onMouseEnter={() =>
                                          setHoveredCell({ qToken, kToken, qIdx: i, kIdx: j, val })
                                        }
                                        onMouseLeave={() => setHoveredCell(null)}
                                        style={{
                                          backgroundColor: isMasked
                                            ? 'rgba(15, 23, 42, 0.4)'
                                            : `rgba(6, 182, 212, ${Math.max(intensity, 0.08)})`,
                                        }}
                                        className={`w-14 sm:w-16 h-10 rounded-lg flex items-center justify-center font-mono text-[10px] transition-all cursor-pointer border ${
                                          isMasked
                                            ? 'border-slate-900 text-slate-700'
                                            : val > 0.4
                                            ? 'border-cyan-400 text-white font-bold shadow-md shadow-cyan-500/20'
                                            : 'border-slate-800 text-cyan-200'
                                        }`}
                                      >
                                        {isMasked ? '0.00' : val.toFixed(2)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-4 mt-2">
                            <span>&uarr; Query Tokens (Row i)</span>
                            <span>Key Tokens (Column j) &rarr;</span>
                          </div>
                        </div>
                      </div>

                      {/* Side Inspector & Explainer */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-[#0b0f17] border border-slate-800 space-y-3 text-xs font-mono">
                          <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                            Cell Inspector
                          </h4>

                          {hoveredCell ? (
                            <div className="space-y-2 bg-[#131b2e] p-3 rounded-xl border border-cyan-800/40">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Query Token:</span>
                                <span className="text-purple-300 font-bold">"{hoveredCell.qToken}"</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Key Token:</span>
                                <span className="text-cyan-300 font-bold">"{hoveredCell.kToken}"</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-700 pt-1">
                                <span className="text-slate-400">Attention Weight:</span>
                                <span className="text-white font-bold text-sm">
                                  {(hoveredCell.val * 100).toFixed(1)}% ({hoveredCell.val})
                                </span>
                              </div>
                              {hoveredCell.kIdx > hoveredCell.qIdx && (
                                <p className="text-[10px] text-amber-400">
                                  Masked to 0.00: future token cannot be attended to.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[11px] py-4 text-center">
                              Hover over any cell in the matrix to inspect query-key relationships.
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0b0f17] border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
                          <h4 className="font-bold text-slate-200">How to interpret:</h4>
                          <p>
                            Each row sums to exactly <strong>1.00</strong> (100%). It represents how much
                            the current token distributes its attention across previous tokens.
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            Attention weights reflect learned mathematical projections in the neural network,
                            not conscious human thought or reasoning.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUTOREGRESSIVE TEXT GENERATION */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                Steps 18 & 19: Autoregressive Text Generation & Temperature Sampling
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                The model predicts the probability distribution of the next token, samples a choice based on temperature,
                appends it to the sequence, and repeats autoregressively.
              </p>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1.5">Prompt Seed:</label>
                  <input
                    type="text"
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="The code has"
                    className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="text-slate-500 py-1">Quick prompts:</span>
                  {[
                    'The code has',
                    'The program contains',
                    'Python error occurs',
                    'To debug the program',
                    'The function returns',
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGenPrompt(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-emerald-300 text-xs"
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4 bg-[#0b0f17] p-4 rounded-2xl border border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Temperature (T):</span>
                    <span className="text-emerald-400 font-bold">{genTemp.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.8"
                    step="0.05"
                    value={genTemp}
                    onChange={(e) => setGenTemp(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>0.1 (Predictable)</span>
                    <span>1.8 (Diverse)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Max New Tokens:</span>
                    <span className="text-purple-300 font-bold">{genTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={genTokens}
                    onChange={(e) => setGenTokens(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs font-mono transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Generate Autoregressively
                </button>
              </div>
            </div>

            {/* Generated Output */}
            {genResult && (
              <div className="space-y-6 pt-4 border-t border-slate-800">
                <div className="p-5 rounded-2xl bg-[#0b0f17] border border-emerald-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 uppercase tracking-wider">Completed Text:</span>
                    <span className="text-emerald-400">Generated {genResult.total_new_tokens} tokens</span>
                  </div>
                  <div className="text-base sm:text-lg font-mono text-white leading-relaxed">
                    <span className="text-slate-400 underline decoration-slate-700 underline-offset-4">
                      {genResult.prompt}
                    </span>{' '}
                    <span className="text-emerald-300 font-bold font-mono">
                      {genResult.generated_text.slice(genResult.prompt.length).trim()}
                    </span>
                  </div>
                </div>

                {/* Step-by-Step Candidate Inspection */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Step-by-Step Next-Token Candidate Probabilities:
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {genResult.steps.map((s) => (
                      <div
                        key={s.step}
                        className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                          <span className="text-slate-400">Step {s.step}</span>
                          <span className="text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800">
                            "{s.chosen_token}" (ID {s.chosen_id})
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase">Top Logit Candidates:</span>
                          {s.top_candidates.slice(0, 3).map((cand, cIdx) => (
                            <div key={cIdx} className="flex items-center justify-between text-[11px]">
                              <span
                                className={
                                  cand.token === s.chosen_token
                                    ? 'text-emerald-300 font-semibold'
                                    : 'text-slate-400'
                                }
                              >
                                {cand.token}
                              </span>
                              <span className="text-slate-500 font-mono">
                                {(cand.probability * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: TRAINING DASHBOARD */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-cyan-400" />
                  Steps 15, 16, & 17: Training Dashboard & Loss Dynamics
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  CrossEntropyLoss measures next-token probability error; AdamW backpropagates gradients and updates weights.
                </p>
              </div>

              {/* Trigger Live Training */}
              <div className="flex items-center gap-3">
                <select
                  value={trainingEpochs}
                  onChange={(e) => setTrainingEpochs(parseInt(e.target.value, 10))}
                  disabled={isTraining}
                  className="bg-[#0b0f17] border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 font-mono"
                >
                  <option value={10}>10 Epochs</option>
                  <option value={15}>15 Epochs</option>
                  <option value={20}>20 Epochs</option>
                  <option value={25}>25 Epochs</option>
                </select>

                <button
                  type="button"
                  onClick={handleStartTraining}
                  disabled={isTraining}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs font-mono transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isTraining ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isTraining ? 'Training on CPU...' : 'Train Model from Scratch'}
                </button>
              </div>
            </div>

            {/* Live Progress Bar */}
            {isTraining && trainProgress && (
              <div className="p-4 rounded-2xl bg-[#0b0f17] border border-cyan-800/50 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>
                    Epoch {trainProgress.epoch} / {trainProgress.total_epochs}
                  </span>
                  <span className="text-cyan-400">
                    Train Loss: {trainProgress.train_loss.toFixed(4)} &bull; Val Loss:{' '}
                    {trainProgress.val_loss.toFixed(4)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                    style={{
                      width: `${(trainProgress.epoch / trainProgress.total_epochs) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Loss History Plot / Table */}
            {trainHistory && trainHistory.epochs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Cross-Entropy Loss Progression Across Epochs:</span>
                  <span className="text-purple-300">
                    Initial Loss: {trainHistory.train_loss[0]} &rarr; Final Loss:{' '}
                    {trainHistory.train_loss[trainHistory.train_loss.length - 1]}
                  </span>
                </div>

                {/* Interactive Loss Visualizer */}
                <div className="bg-[#0b0f17] p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="h-48 flex items-end gap-1.5 pt-6 border-b border-slate-800 pb-2">
                    {trainHistory.epochs.map((ep, idx) => {
                      const tLoss = trainHistory.train_loss[idx];
                      const maxLoss = 6.0;
                      const heightPercent = Math.max(Math.min((tLoss / maxLoss) * 100, 100), 5);

                      return (
                        <div key={ep} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-10 hidden group-hover:block bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap">
                            Epoch {ep}: {tLoss.toFixed(3)}
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm group-hover:brightness-125 transition-all"
                          />
                          <span className="text-[9px] font-mono text-slate-500">{ep}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-cyan-400 inline-block" />
                      Training Loss (Cross-Entropy)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Calculated on local CPU via PyTorch autograd
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: MATHEMATICAL REFERENCE */}
      {activeTab === 'math' && (
        <div className="space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                Mathematical Transparency & Foundations
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Every calculation in the DevFix Transformer Lab is based on the foundational equations of modern deep learning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Formula 1 */}
              <div className="p-5 rounded-2xl bg-[#0b0f17] border border-slate-800 space-y-3 font-mono">
                <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider block">
                  1. Scaled Dot-Product Attention
                </span>
                <div className="bg-[#121929] p-4 rounded-xl border border-cyan-900/40 text-sm text-cyan-200 font-bold overflow-x-auto">
                  Attention(Q, K, V) = softmax( (Q &bull; K^T) / &radic;d_k + M ) &bull; V
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The scale factor &radic;d_k stabilizes variance to 1.0, preventing dot products from growing so large that
                  the softmax function enters regions with vanishing gradients.
                </p>
              </div>

              {/* Formula 2 */}
              <div className="p-5 rounded-2xl bg-[#0b0f17] border border-slate-800 space-y-3 font-mono">
                <span className="text-xs text-purple-400 font-bold uppercase tracking-wider block">
                  2. Multi-Head Attention
                </span>
                <div className="bg-[#121929] p-4 rounded-xl border border-purple-900/40 text-sm text-purple-200 font-bold overflow-x-auto">
                  MultiHead(Q,K,V) = Concat(head_1, ..., head_h) &bull; W_o
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Each head operates in a lower-dimensional subspace (d_k = d_model / h), allowing simultaneous
                  specialization on syntax, syntax agreement, error words, and context.
                </p>
              </div>

              {/* Formula 3 */}
              <div className="p-5 rounded-2xl bg-[#0b0f17] border border-slate-800 space-y-3 font-mono">
                <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block">
                  3. Sinusoidal Positional Encoding
                </span>
                <div className="bg-[#121929] p-4 rounded-xl border border-indigo-900/40 text-sm text-indigo-200 font-bold overflow-x-auto">
                  PE(pos, 2i) = sin( pos / 10000^(2i/d_model) )
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Allows relative positional distances to be learned via linear transformations, without adding trainable parameters.
                </p>
              </div>

              {/* Formula 4 */}
              <div className="p-5 rounded-2xl bg-[#0b0f17] border border-slate-800 space-y-3 font-mono">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                  4. Cross-Entropy Loss
                </span>
                <div className="bg-[#121929] p-4 rounded-xl border border-emerald-900/40 text-sm text-emerald-200 font-bold overflow-x-auto">
                  L = - &Sigma; log P(target_token_i | previous_tokens)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Minimizes the negative log-likelihood of the ground-truth next token across all sequence positions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
