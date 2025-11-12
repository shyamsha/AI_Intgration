class VectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = new Map();
  }

  // Simple cosine similarity for text matching
  cosineSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const allWords = [...new Set([...words1, ...words2])];

    const vector1 = allWords.map(
      (word) => words1.filter((w) => w === word).length
    );
    const vector2 = allWords.map(
      (word) => words2.filter((w) => w === word).length
    );

    const dotProduct = vector1.reduce(
      (sum, val, i) => sum + val * vector2[i],
      0
    );
    const magnitude1 = Math.sqrt(
      vector1.reduce((sum, val) => sum + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
      vector2.reduce((sum, val) => sum + val * val, 0)
    );

    return dotProduct / (magnitude1 * magnitude2) || 0;
  }

  // Store document chunks
  addDocuments(chunks) {
    this.documents = chunks.map((chunk, idx) => ({
      id: idx,
      ...chunk,
    }));
  }

  // Search for relevant documents
  search(query, topK = 3) {
    const results = this.documents.map((doc) => ({
      ...doc,
      similarity: this.cosineSimilarity(query, doc.text),
    }));

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  clear() {
    this.documents = [];
    this.embeddings.clear();
  }

  getDocuments() {
    return this.documents;
  }
}

module.exports = new VectorStore();
