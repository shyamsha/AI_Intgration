const fs = require("fs").promises;
const pdfParse = require("pdf-parse");

class PDFProcessor {
  constructor() {
    this.currentPDF = null;
  }

  async extractText(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      this.currentPDF = {
        text: pdfData.text,
        numPages: pdfData.numpages,
        info: pdfData.info,
        metadata: pdfData.metadata,
      };

      return this.currentPDF;
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      throw new Error("Failed to extract text from PDF");
    }
  }

  // Split text into chunks for better processing
  chunkText(text, chunkSize = 1500, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);

      chunks.push({
        text: chunk,
        start,
        end,
        // Estimate page number (rough calculation)
        estimatedPage: Math.floor(start / 3000) + 1,
      });

      start += chunkSize - overlap;
    }

    return chunks;
  }

  // Extract relevant chunks based on query
  findRelevantChunks(query, chunks, topK = 3) {
    const queryWords = query
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 3);

    const scoredChunks = chunks.map((chunk) => {
      const chunkText = chunk.text.toLowerCase();
      let score = 0;

      queryWords.forEach((word) => {
        const matches = (chunkText.match(new RegExp(word, "g")) || []).length;
        score += matches;
      });

      return { ...chunk, score };
    });

    // Sort by score and return top K
    return scoredChunks.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  getCurrentPDF() {
    return this.currentPDF;
  }

  clear() {
    this.currentPDF = null;
  }
}

module.exports = new PDFProcessor();
