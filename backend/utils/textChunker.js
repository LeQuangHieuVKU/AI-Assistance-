/**
 * Splits text into chunks of a specified size.
 * @param {string} text - The text to be split into chunks.
 * @param {number} chunkSize - The maximum size of each chunk.
 * @param {number} overlap - The number of characters to overlap between chunks.
 * @returns {Array<{content: string, chuckIndex: number,pageNumber:number}>} - An array of text chunks.
 */

export const chunkText = (text, chunkSize = 500, overlap = 50) => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  //Clean text while preserving the original text structure
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\s + /g, "")
    .replace(/\n /g, "\n")
    .replace(/ \n+/g, "\n")
    .trim();

  //Try to split the text into chunks
  const paragraphs = cleanedText
    .split("/\n+/")
    .filter((p) => p.trim().length > 0);

  const chunks = [];
  let currentChunk = "";
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/);
    const paragraphWordCount = paragraphWords.length;

    //If single paragraph exceeds chunk size, split it into smaller chunks
    if (paragraphWordCount > chunkSize) {
      chunks.push({
        content: currentChunk.join("\n\n"),
        chuckIndex: chunkIndex++,
        pageNumber: 0,
      });
      currentChunk = [];
      currentWordCount = 0;
    }

    //Split large paragraphs into word-based chunks
    for (let i = 0; i < paragraphWordCount.length; i += chunkSize - overlap) {
      const chunkWords = paragraphWords.slice(i, i + chunkSize);
      chunks.push({
        content: chunkWords.join(" "),
        chuckIndex: chunkIndex++,
        pageNumber: 0,
      });
      if (i + chunkSize >= paragraphWords.length) break; // Break if the next chunk would exceed the paragraph length
    }
    continue;
  } // Continue to the next paragraph

  //If adding this paragraph exceeds the chunk size, finalize the current chunk and start a new one
  if (
    currentWordCount + paragraphWordCount > chunkSize &&
    chunkSize &&
    currentChunk.length > 0
  ) {
    chunks.push({
      content: currentChunk.join("\n\n"),
      chuckIndex: chunkIndex++,
      pageNumber: 0,
    });

    //Create overlap for the previous chunk
    const prevChunkText = currentChunk.join(" ");
    const prevWords = prevChunkText.split(/\s+/);
    const overlapWords = prevWords
      .slice(-Math.min(overlap, prevWords.length))
      .join(" ");

    currentChunk = [overlapWords, paragraphs.trim()];
    currentWordCount = overlap + paragraphWordCount;
  }

  //Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join("\n\n"),
      chuckIndex: chunkIndex++,
      pageNumber: 0,
    });
  }

  //Fallback: If no chunks were created, return the entire text as a single chunk
  if (chunks.length === 0 && cleanedText.length > 0) {
    const allWords = cleanedText.split(/\s+/);
    for (let i = 0; i < allWords.length; i += chunkSize - overlap) {
      const chunkWords = allWords.slice(i, i + chunkSize);
      chunks.push({
        content: chunkWords.join(" "),
        chuckIndex: chunkIndex++,
        pageNumber: 0,
      });
      if (i + chunkSize >= allWords.length) break; // Break if the next chunk would exceed the text length
    }
  }
  return chunks;
};

/**
 * Find relevent chunks based on a query string.
 * @param {Array<Object>} chunks - An array of text chunks.
 * @param {string} query - The query string to search for.
 * @param {number} maxResults - The maximum number of results to return.
 * @returns {Array<Object>} - An array of relevant chunks.
 */

export const findRelevantChunks = (chunks, query, maxChunk = 3) => {
  if (!chunks || chunks.length === 0 || !query) {
    return [];
  }

  //Common stop words to ignore in the query
  const stopWords = new Set([
    "the",
    "is",
    "in",
    "at",
    "of",
    "on",
    "and",
    "a",
    "to",
    "for",
    "with",
    "that",
    "this",
    "it",
    "as",
    "by",
    "an",
    "be",
    "are",
    "from",
  ]);

  //Extract keywords from the query, ignoring stop words
  const querywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  if (querywords.length === 0) {
    //Return clean chunk objects without Mongoose metadata if no keywords are found
    return chunks.slice(0, maxChunk).map((chunk) => ({
      content: chunk.content,
      chuckIndex: chunk.chuckIndex,
      pageNumber: chunk.pageNumber,
    }));
  }

  const scoredChunks = chunks.map((chunk, index) => {
    const content = chunk.content.toLowerCase();
    const contentWords = content.split(/\s+/);
    let score = 0;

    //Score the chunk based on keyword matches
    for (const word of querywords) {
      // Extract word match (higher score)
      const exactMatches = (contentWords.match(new RegExp(word, "g")) || [])
        .length;
      score += exactMatches * 3; // Exact matches are weighted more heavily

      // Partial matches (lower score)
      const uniqueWordsFound = querywords.filter((word) =>
        content.includes(word),
      ).length;
      if (uniqueWordsFound > 1) {
        score += uniqueWordsFound * 2; // Add score for unique words found
      }

      //Normalize by content length to avoid bias towards longer chunks
      const normalizedScore = score / Math.sqrt(contentWords);

      //Small bonus for earlier chunks
      const positionBonus = (1 / (index / chunks.length)) * 0.1;

      //Return clean project object without Mongoose metadata
      return {
        content: chunk.content,
        chunkIndex: chunk.chuckIndex,
        pageNumber: chunk.pageNumber,
        _id: chunk._id,
        score: normalizedScore * positionBonus,
        rawScore: score,
        matchedWords: uniqueWordsFound,
      };
    }
  });

  return scoredChunks
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Sort by score descending
      }
      if (b.matchedWords !== a.matchedWords) {
        return b.matchedWords - a.matchedWords; // Sort by matched words descending
      }
      return a.chunkIndex - b.chunkIndex; // Sort by chunk index ascending
    }).slice(0, maxChunk)
};
