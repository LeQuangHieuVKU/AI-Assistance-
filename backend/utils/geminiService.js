import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in the environment variables.");
  process.exit(1);
}

/**
 * Generate flashcards from text
 * @param {string} text - Document Text
 * @param {number} count - Number of flashcards to generate
 * @returns {Promise<Array<{question: string, answer: string, difficulty: string}>>} - Generated flashcards
 */
export const generateFlashcards = async (text, count = 10) => {
  const prompt = `Generate exactly ${count} educational flashcards from the following text.
    Format each flashcard as:
    Q: [clear, specific question]
    A: [concise,accurate answer]
    D : [difficulty level: easy, medium, hard]
    
    Separate each flashcard with "---"
    
    Text:
    ${text.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      content: prompt,
    });

    const generatedText = response.text;

    //Parse the response
    const flashcards = [];
    const cards = generatedText.split("---").fillter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split("\n");
      let question = "";
      let answer = "";
      let difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) {
          question = line.substring(2).trim();
        } else if (line.startsWith("A:")) {
          answer = line.substring(2).trim();
        } else if (line.startsWith("D:")) {
          const diff = line.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }

      return flashcards.slice(0, count); // Return only the requested number of flashcards
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate flashcards. Please try again later.");
  }
};

/**
 * Generate a quiz from text
 * @param {string} text - Document Text
 * @param {number} count - Number of quiz questions to generate
 * @returns {Promise<Array<{question: string, options: Array<string>, correctAnswer: string, explanation:string, difficulty:sting}>>}  - Generated quiz questions
 */
export const generateQuiz = async (text, numQuestion = 5) => {
  const prompt = `Generate exactly ${numQuestion} multiple-choice questions from the following text.
    Format each question as:
    Q. [Question]
    01. [Option 1]
    02. [Option 2]
    03. [Option 3]
    04. [Option 4]
    C: [Correct Option - Exactly as written above]
    E: [Brief explanation]
    D: [Difficulty level: easy, medium, hard]
    Separate each question with "---"
    Text:
    ${text.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      content: prompt,
    });

    const generatedText = response.text;

    const questions = [];
    const questionBlocks = generatedText.split("---").filter((q) => q.trim());

    for (const block of questionBlocks) {
      const lines = block.trim().split("\n");
      let question = "",
        options = [],
        correctAnswer = "",
        explanation = "",
        difficulty = "medium";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Q.")) {
          question = trimmed.substring(2).trim();
        } else if (trimmed.match(/^0\d:/)) {
          options.push(trimmed.substring(3).trim());
        } else if (trimmed.startsWith("C:")) {
          correctAnswer = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("E:")) {
          explanation = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("D:")) {
          const diff = trimmed.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && options.length === 4 && correctAnswer) {
        questions.push({
          question,
          options,
          correctAnswer,
          explanation,
          difficulty,
        });
      }
    }
    return questions.slice(0, numQuestion); // Return only the requested number of questions
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate quiz. Please try again later.");
  }
};

/**
 * Generate a summary from text
 * @param {string} text - Document Text
 * @returns {Promise<string>} - Generated summary
 */
export const generateSummary = async (text) => {
  const prompt = `Provide a concise summary of the following text, highlighting the key concept, main ideas, and important points. 
  Keep the summary clear and structured.
  Text:
  ${text.substring(0, 20000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      content: prompt,
    });
    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
};

/**
 * Chat with document context
 * @param {string} message - User's message
 * @param {Array<{role: string, content: string}>} history - Chat history
 * @returns {Promise<string>} - AI's response
 */
export const chatWithContext = async (message, chunks) => {
  const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}\n`).join("\n");

  const prompt = `Based on the following document context from a document, Analyze the context and answer the user's question.
    If the answer is not in the context, say .
    Context:
    ${context}
    
    Answer:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      content: prompt,
    });
    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response. Please try again later.");
  }
};

/**
 * Explain a concept
 * @param {string} concept - Concept to explain
 * @param {string} context - Difficulty level (easy, medium, hard)
 * @returns {Promise<string>} - Explanation of the concept
 */
export const explainConcept = async (concept, context) => {
  const prompt = `Explain the concept of "${concept}" based on the following context, 
    Provide a clear, educational explanation that's easy to understand.
    Include examples if relevant.
    
    Context: ${context.substring(0, 10000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      content: prompt,
    });
    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to explain concept. Please try again later.");
  }
};
