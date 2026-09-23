const { QdrantClient } = require('@qdrant/js-client-rest');
const crypto = require('crypto');

const client = new QdrantClient({ host: 'qdrant', port: 6333 });

const COLLECTION_NAME = 'product-chunks';

async function initQdrant() {
  try {
    const response = await client.getCollections();
    const collectionExists = response.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 384, // Xenova/all-MiniLM-L6-v2 vector dimension
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Created collection '${COLLECTION_NAME}'`);
    } else {
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' already exists.`);
    }
  } catch (err) {
    console.error('[Qdrant] Initialization error:', err.message);
  }
}

// Call initQdrant directly to ensure it exists on boot
initQdrant();

/**
 * Upsert document chunks and embeddings into Qdrant
 */
async function upsertChunks(productId, title, chunks, embeddings) {
  if (chunks.length !== embeddings.length) {
    throw new Error('Mismatched chunks and embeddings length');
  }
  
  const points = chunks.map((chunk, index) => {
    return {
      id: crypto.randomUUID(),
      vector: embeddings[index],
      payload: {
        product_id: productId,
        title: title,
        chunk_type: chunk.type,
        content: chunk.content,
      }
    };
  });

  try {
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: points
    });
    console.log(`[Qdrant] Upserted ${points.length} chunks for product ${productId}`);
  } catch (error) {
    console.error('[Qdrant] Upsert error:', error.message);
    throw error;
  }
}

/**
 * Search Qdrant for similar chunks
 */
async function searchChunks(queryVector, userId, limit = 5) {
  try {
    // We would typically filter by userId, but right now the chunks only have product_id.
    // If we want to filter to only user's tracked products, we need to pass a list of product IDs,
    // or store user_id in the Qdrant payload during upsert. 
    // For now, let's just search globally.
    
    const searchResult = await client.query(COLLECTION_NAME, {
      query: queryVector,
      limit: limit,
      with_payload: true
    });

    return searchResult.points.map(result => ({
      content: result.payload.content,
      chunk_type: result.payload.chunk_type,
      title: result.payload.title,
      distance: 1 - result.score // Convert cosine similarity to distance if needed
    }));
  } catch (error) {
    console.error('[Qdrant] Search error:', error.message);
    throw error;
  }
}

module.exports = {
  client,
  upsertChunks,
  searchChunks,
};
