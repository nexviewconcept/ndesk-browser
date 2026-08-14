export const HuggingFaceProvider = {
  /**
   * Sends a prompt with optional context to the Hugging Face Inference API.
   * If rate-limited or no API key is specified, falls back to a smart mock response.
   */
  async askQuestion(message, context = '', apiKey = '') {
    const model = 'HuggingFaceH4/zephyr-7b-beta';
    const systemPrompt = `You are NDesk AI, a helpful, privacy-oriented assistant integrated directly inside NDesk Browser.
Use the context below to help answer the user's questions about the webpage they are reading.
Context: ${context || 'None'}`;

    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (!apiKey || apiKey === 'hf_demo_ndesk_general_fallback_token' || apiKey.includes('placeholder')) {
      return `👋 Hi there! I am NDesk AI, your privacy-oriented sidekick. 

I received your request: "${message}".

To enable real-time replies from the cloud, please go to **Settings** and add your **Hugging Face** or **Gemini API Key**. 

**Web Context Analyzed:**
${context ? `"${context.slice(0, 150)}..."` : 'No webpage context provided. Try reading an article and opening me!'}`;
    }

    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: `<|system|>\n${systemPrompt}</s>\n<|user|>\n${message}</s>\n<|assistant|>\n`,
          parameters: { max_new_tokens: 300, return_full_text: false }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result) && result[0]?.generated_text) {
          return result[0].generated_text.trim();
        }
        if (result.error) {
          return `Hugging Face Error: ${result.error}`;
        }
      }

      return 'An unexpected response was received from the AI model.';
    } catch (e) {
      console.error('AI Service Error:', e);
      return 'Sorry, I couldn\'t connect to the AI model. Please verify your internet connection.';
    }
  }
};
