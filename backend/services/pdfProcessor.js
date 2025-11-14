// const fs = require("fs").promises;
// const pdfParse = require("pdf-parse");

// class PDFProcessor {
//   constructor() {
//     this.currentPDF = null;
//   }

//   async extractText(filePath) {
//     try {
//       const dataBuffer = await fs.readFile(filePath);
//       const pdfData = await pdfParse(dataBuffer);

//       this.currentPDF = {
//         text: pdfData.text,
//         numPages: pdfData.numpages,
//         info: pdfData.info,
//         metadata: pdfData.metadata,
//       };

//       return this.currentPDF;
//     } catch (error) {
//       console.error("Error extracting PDF text:", error);
//       throw new Error("Failed to extract text from PDF");
//     }
//   }

//   // Split text into chunks for better processing
//   chunkText(text, chunkSize = 1500, overlap = 200) {
//     const chunks = [];
//     let start = 0;

//     while (start < text.length) {
//       const end = Math.min(start + chunkSize, text.length);
//       const chunk = text.slice(start, end);

//       chunks.push({
//         text: chunk,
//         start,
//         end,
//         // Estimate page number (rough calculation)
//         estimatedPage: Math.floor(start / 3000) + 1,
//       });

//       start += chunkSize - overlap;
//     }

//     return chunks;
//   }

//   // Extract relevant chunks based on query
//   findRelevantChunks(query, chunks, topK = 3) {
//     const queryWords = query
//       .toLowerCase()
//       .split(" ")
//       .filter((w) => w.length > 3);

//     const scoredChunks = chunks.map((chunk) => {
//       const chunkText = chunk.text.toLowerCase();
//       let score = 0;

//       queryWords.forEach((word) => {
//         const matches = (chunkText.match(new RegExp(word, "g")) || []).length;
//         score += matches;
//       });

//       return { ...chunk, score };
//     });

//     // Sort by score and return top K
//     return scoredChunks.sort((a, b) => b.score - a.score).slice(0, topK);
//   }

//   getCurrentPDF() {
//     return this.currentPDF;
//   }

//   clear() {
//     this.currentPDF = null;
//   }
// }

// pdfProcessor.js
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

class PDFProcessor {
  constructor() {
    this.currentPDF = null;
  }

  async extractText(filePath) {
    // Normalize path and check file exists
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    try {
      await fs.promises.access(absPath, fs.constants.R_OK);
    } catch (err) {
      const msg = `PDF file not found or not readable at path: ${absPath}`;
      console.error(msg, err);
      throw new Error(msg);
    }

    try {
      const dataBuffer = await fs.promises.readFile(absPath);

      // Pass options if needed (pagerender can be customized)
      const pdfData = await pdfParse(dataBuffer);
      // Normalize returned values (pdf-parse sometimes differs)
      const text = typeof pdfData.text === "string" ? pdfData.text.trim() : "";
      const numPages =
        typeof pdfData.numpages === "number"
          ? pdfData.numpages
          : pdfData.numPages || 0;

      const result = {
        text,
        numPages,
        info: pdfData.info || null,
        metadata: pdfData.metadata || null,
        needsOcr: !text, // heuristic: if very short, probably scanned PDF
      };

      this.currentPDF = result;
      return result;
    } catch (error) {
      // Log full error for debugging: message + stack
      console.error(
        "pdf-parse error:",
        error && error.message,
        error && error.stack
      );
      // Provide helpful hint in the thrown error
      const hint =
        error &&
        error.message &&
        error.message.toLowerCase().includes("encrypted")
          ? "The PDF might be encrypted/password-protected."
          : "pdf-parse failed to extract. If the PDF contains only images (scanned pages) you need OCR.";

      throw new Error(
        `Failed to extract text from PDF. ${hint} (detail: ${
          error && error.message
        })`
      );
    }
  }

  // Split text into chunks for better processing
  chunkText(text = "", chunkSize = 1500, overlap = 200) {
    const chunks = [];
    let start = 0;
    if (!text) return chunks;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);

      chunks.push({
        text: chunk,
        start,
        end,
        estimatedPage: Math.max(1, Math.floor(start / 3000) + 1),
      });

      start += chunkSize - overlap;
    }

    return chunks;
  }

  // Simple keyword-based relevance scoring
  findRelevantChunks(query = "", chunks = [], topK = 3) {
    if (!query || !chunks.length) return [];

    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const scored = chunks.map((chunk) => {
      const chunkText = (chunk.text || "").toLowerCase();
      let score = 0;
      queryWords.forEach((word) => {
        const matches = (
          chunkText.match(
            new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
          ) || []
        ).length;
        score += matches;
      });
      return { ...chunk, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  getCurrentPDF() {
    return this.currentPDF;
  }

  clear() {
    this.currentPDF = null;
  }
}
module.exports = new PDFProcessor();
