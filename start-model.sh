#!/bin/bash
# AI Model Launch Script for AI Dashboard Platform
# Edit this script to configure your model launching preferences

# Model Configuration
MODEL_PATH="./models/qwen2.5-coder-7b-instruct-q4_k_m.gguf"
PORT=${AI_PORT:-5001}
THREADS=4
CONTEXT=2048
BATCH_SIZE=512

# Display configuration
echo "🤖 AI Dashboard Platform - Model Launcher"
echo "=========================================="
echo "Model: $MODEL_PATH"
echo "Port: $PORT"
echo "Threads: $THREADS"
echo "Context: $CONTEXT"
echo "Batch Size: $BATCH_SIZE"
echo ""

# Check if model file exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ Error: Model file not found at $MODEL_PATH"
    echo ""
    echo "📥 To download models:"
    echo "1. Visit https://huggingface.co/models?library=gguf"
    echo "2. Download a GGUF model (recommended: qwen2.5-coder-7b-instruct-q4_k_m.gguf)"
    echo "3. Place it in the ./models/ directory"
    echo "4. Update MODEL_PATH in this script"
    echo ""
    exit 1
fi

# Check if KoboldCpp is installed
if ! command -v python &> /dev/null; then
    echo "❌ Error: Python not found"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

# Check if port is available
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Warning: Port $PORT is already in use"
    echo "To kill the process using this port:"
    echo "lsof -ti:$PORT | xargs kill -9"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install KoboldCpp if not available
if ! python -c "import koboldcpp" 2>/dev/null; then
    echo "📦 Installing KoboldCpp..."
    pip install koboldcpp
    echo ""
fi

# Launch the model
echo "🚀 Launching AI model..."
echo "Access the model at: http://localhost:$PORT"
echo "Press Ctrl+C to stop the model"
echo ""

# Launch KoboldCpp with configuration
python -m koboldcpp \
    --model "$MODEL_PATH" \
    --host 127.0.0.1 \
    --port $PORT \
    --threads $THREADS \
    --contextsize $CONTEXT \
    --batchsize $BATCH_SIZE \
    --quiet \
    --nowebui

echo ""
echo "🛑 Model stopped"