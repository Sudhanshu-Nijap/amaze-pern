const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');
const qdrantService = require('../services/qdrant.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/', requireAuth, async (req, res) => {
  const { message } = req.body;
  const user = req.user;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // 1. Generate embedding for user's query
    const queryEmbeddingArray = await aiService.generateEmbedding(message);
    const queryEmbeddingStr = queryEmbeddingArray ? `[${queryEmbeddingArray.join(',')}]` : null;

    let productContext = "No specific product context found.";

    // 2. Perform vector search in Qdrant if we have an embedding
    if (queryEmbeddingArray) {
      // Pass the user.djangoId in case we want to filter by user in the future, 
      // but currently the service searches globally.
      const searchRes = await qdrantService.searchChunks(queryEmbeddingArray, user.djangoId, 5);

      if (searchRes.length > 0) {
        productContext = searchRes.map((row, index) => {
          return `--- Information Chunk ${index + 1} (${row.chunk_type} for ${row.title}) ---\n${row.content}`;
        }).join("\n\n");
      }
    }

    // 3. Chat with Groq using context
    const aiResponse = await aiService.chatWithGroq(message, productContext);

    res.status(200).json({ reply: aiResponse });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

module.exports = router;
