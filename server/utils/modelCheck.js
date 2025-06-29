import fs from 'fs';
import path from 'path';

export function checkModelAvailability() {
  const modelPath = path.join(process.cwd(), 'models', 'qwen2.5-coder-7b-instruct-q4_k_m.gguf');

  const exists = fs.existsSync(modelPath);

  return {
    available: exists,
    path: modelPath,
    message: exists
      ? '✅ Local model found.'
      : '❌ Local model not found. Please download the .gguf file from Hugging Face and place it in the /models folder.'
  };
}