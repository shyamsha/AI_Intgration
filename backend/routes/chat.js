const express = require("express");
const { groq, DEFAULT_MODEL } = require("../config/groq");
const vectorStore = require("../services/vectorStore");
const pdfProcessor = require("../services/pdfProcessor");
const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { query, filename } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    const currentPDF = pdfProcessor.getCurrentPDF();
    if (!currentPDF) {
      return res
        .status(400)
        .json({ error: "No PDF uploaded. Please upload a PDF first." });
    }

    // Search for relevant chunks using vector store
    const relevantChunks = vectorStore.search(query, 3);

    if (relevantChunks.length === 0) {
      return res.json({
        response:
          "I couldn't find relevant information in the PDF to answer your question. Please try rephrasing or ask a different question.",
        citations: [],
      });
    }

    // Prepare context from relevant chunks
    const context = relevantChunks
      .map((chunk, idx) => `[Context ${idx + 1}]:\n${chunk.text}`)
      .join("\n\n");

    // Extract page numbers for citations
    const citations = relevantChunks
      .map((chunk) => ({ page: chunk.estimatedPage }))
      .filter((v, i, a) => a.findIndex((t) => t.page === v.page) === i) // Remove duplicates
      .slice(0, 3);

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that answers questions based on PDF documents. 
          Always provide accurate, detailed answers based on the context provided.
          If the context doesn't contain enough information, say so clearly.
          Be concise but informative.`,
        },
        {
          role: "user",
          content: `Based on the following context from the PDF document, please answer the question.

          Context:${context}
          Question: ${query} Please provide a clear and detailed answer based on the context above.`,
        },
      ],
      model: DEFAULT_MODEL,
      temperature: 1,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
    });

    const response =
      completion.choices[0]?.message?.content || "No response generated";

    res.json({
      response,
      citations,
      model: DEFAULT_MODEL,
      tokensUsed: completion.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({
      error: "Failed to process query",
      message: error.message,
    });
  }
});

module.exports = router;
