@echo off
echo 🔮 Starting KoboldCpp...

set EXE_PATH=C:\Users\Ang\Downloads\nebulai\project\koboldcpp.exe
set MODEL_PATH=models\qwen2.5-coder-7b-instruct-q4_k_m.gguf
set PORT=5001
set THREADS=6

%EXE_PATH% --model "%MODEL_PATH%" --port %PORT% --threads %THREADS% --smartcontext