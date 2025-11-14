require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env["GROQ_API_KEY"],
});
// console.log("Groq configured with model key:", process.env.GROQ_API_KEY);
// Available Groq models
const MODELS = {
  LLAMA3_70B: "lllama-3.3-70b-versatile",
  OPENAI_GPT_OSS_20B: "openai/gpt-oss-20b",
};

// Default model for chat
const DEFAULT_MODEL = MODELS.OPENAI_GPT_OSS_20B;

module.exports = {
  groq,
  MODELS,
  DEFAULT_MODEL,
};
