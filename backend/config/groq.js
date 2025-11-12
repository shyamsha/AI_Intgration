const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Available Groq models
const MODELS = {
  LLAMA3_70B: "lllama-3.3-70b-versatile",
};

// Default model for chat
const DEFAULT_MODEL = MODELS.LLAMA3_70B;

module.exports = {
  groq,
  MODELS,
  DEFAULT_MODEL,
};
