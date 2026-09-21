const Groq = require('groq-sdk');

// Define global variable to mock/cache the pipeline since it loads async
let pipeline;

// Dynamic import for Transformers.js since it's an ESM module usually, or use require if supported
// @xenova/transformers works in CJS but let's be careful with async loading
async function getTransformers() {
  if (!pipeline) {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
  }
  return pipeline;
}

let embeddingPipelineInstance = null;
let sentimentPipelineInstance = null;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-now',
});

/**
 * Initializes and returns the embedding pipeline.
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipelineInstance) {
    const pipe = await getTransformers();
    // Using a small, fast model for embeddings
    embeddingPipelineInstance = await pipe('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingPipelineInstance;
}

/**
 * Initializes and returns the sentiment analysis pipeline.
 */
async function getSentimentPipeline() {
  if (!sentimentPipelineInstance) {
    const pipe = await getTransformers();
    sentimentPipelineInstance = await pipe('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  }
  return sentimentPipelineInstance;
}

/**
 * Generate a vector embedding for a given text.
 */
async function generateEmbedding(text) {
  try {
    const embedder = await getEmbeddingPipeline();
    // Generate embeddings
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    // Convert to standard JS array
    return Array.from(output.data);
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

/**
 * Analyze an array of review strings and return an aggregate sentiment score and verdict.
 */
async function analyzeReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    return { score: null, verdict: "No Reviews" };
  }

  try {
    const analyzer = await getSentimentPipeline();
    let totalScore = 0;
    
    // Analyze each review
    for (const review of reviews) {
      // DistilBERT has a max length limit. Truncate safely.
      const text = review.substring(0, 512); 
      const result = await analyzer(text);
      const { label, score } = result[0];
      
      // Calculate normalized positivity score (0 to 100)
      if (label === 'POSITIVE') {
        totalScore += score * 100;
      } else {
        totalScore += (1 - score) * 100;
      }
    }

    const averagePositivity = totalScore / reviews.length;
    
    let verdict = "Mixed Feedback";
    if (averagePositivity >= 75) verdict = "Highly Recommended";
    else if (averagePositivity >= 60) verdict = "Good Product";
    else if (averagePositivity <= 40) verdict = "Avoid";
    else if (averagePositivity <= 25) verdict = "Terrible Product";

    return {
      score: averagePositivity.toFixed(2),
      verdict: verdict
    };
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { score: null, verdict: "Analysis Failed" };
  }
}

/**
 * Chat with Groq API using provided context for RAG
 */
async function chatWithGroq(userMessage, productContext) {
  try {
    const systemPrompt = `You are a helpful AI shopping assistant for Amaze, a price-tracking app. 
You answer the user's questions based on the context provided about the products they are tracking.
Keep your answers extremely concise and simple (1-2 sentences maximum). Do not use excessive emojis.
If no context information is provided or no products are loaded, just reply simply: "I don't have any product context right now. Please tell me which products you are tracking." without any fluff.

Context Information:
${productContext}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      model: "qwen/qwen3.8-27b", // Fast open source model
      temperature: 0.5,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error("Error chatting with Groq:", error);
    throw error;
  }
}

/**
 * Generate text chunks from product data and price history for RAG.
 */
function generateProductChunks(productData, priceHistory = []) {
  const chunks = [];
  
  // Chunk 1: Details
  const details = `Product Title: ${productData.title}. Current Price: ₹${productData.current_price}. Rating: ${productData.rating}. Stock Status: ${productData.stock_status}.`;
  chunks.push({ type: 'details', content: details });

  // Chunk 2: Price History
  if (priceHistory.length > 0) {
    const historyLines = priceHistory.slice(0, 10).map(h => `- ₹${h.price} on ${new Date(h.timestamp).toLocaleDateString()}`).join('\n');
    const historyText = `Price history for ${productData.title}:\n${historyLines}`;
    chunks.push({ type: 'price_history', content: historyText });
  }

  // Chunk 3: Reviews / Sentiment
  if (productData.sentiment_verdict) {
    const sentiment = `Review Sentiment for ${productData.title}: ${productData.sentiment_verdict}. Sentiment Score: ${productData.sentiment_score}.`;
    chunks.push({ type: 'sentiment', content: sentiment });
  }

  return chunks;
}

module.exports = {
  generateEmbedding,
  analyzeReviews,
  chatWithGroq,
  generateProductChunks
};
