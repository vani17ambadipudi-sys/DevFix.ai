"""
Training Loss Visualization Module
==================================
Plots training and validation loss curves from training history JSON.
"""

import os
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def plot_training_history(
    history_json_path: str = "checkpoints/training_history.json",
    output_png_path: str = "checkpoints/loss_curve.png"
):
    if not os.path.exists(history_json_path):
        raise FileNotFoundError(f"History file not found at: {history_json_path}")

    with open(history_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    history = data["history"]
    epochs = history["epochs"]
    train_loss = history["train_loss"]
    val_loss = history["val_loss"]

    plt.figure(figsize=(8, 4.5), dpi=200)
    plt.plot(epochs, train_loss, label="Training Loss", color="#06b6d4", linewidth=2, marker='o', markersize=4)
    plt.plot(epochs, val_loss, label="Validation Loss", color="#a855f7", linewidth=2, linestyle='--', marker='s', markersize=4)
    
    plt.title("DevFix Transformer Lab — Cross-Entropy Loss Across Epochs", fontsize=12, fontweight='bold', pad=12)
    plt.xlabel("Epoch", fontsize=10)
    plt.ylabel("Cross-Entropy Loss (nats)", fontsize=10)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(frameon=True, facecolor="#1e293b", edgecolor="#334155", labelcolor="white")
    
    # Dark modern styling
    plt.gca().set_facecolor("#0f172a")
    plt.gcf().patch.set_facecolor("#0b0f17")
    plt.tick_params(colors="white")
    for spine in plt.gca().spines.values():
        spine.set_color("#334155")
    plt.gca().xaxis.label.set_color("white")
    plt.gca().yaxis.label.set_color("white")
    plt.gca().title.set_color("white")

    os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
    plt.savefig(output_png_path, bbox_inches="tight", facecolor=plt.gcf().get_facecolor())
    plt.close()
    print(f"Training loss curve saved to: {output_png_path}")


if __name__ == "__main__":
    try:
        plot_training_history()
    except Exception as e:
        print(f"Plotting error: {e}")
