"use server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { combineDocuments, formatConvHistory } from "@/utils/llmUtils";
import { retrieveRelevantNotes } from "@/pages/api/vectorsDatabase";

const openAIApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({
  openAIApiKey,
  modelName: "gpt-4o", // Specify the model here
});

// Define the prompt templates
const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question. 
conversation history: {conv_history}
question: {question} 
standalone question:`;

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate);

const answerTemplate = `You are a helpful assistant who can provide detailed answers based on the context provided. You are allowed to include code snippets if needed from the context in your answers when appropriate.
context: {context}
conversation history: {conv_history}
question: {question}
answer:`;

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

// Chains for standalone question conversion and answering
const standaloneQuestionChain = standaloneQuestionPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const answerChain = answerPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

// Combine the chains into a single sequence
const chain = RunnableSequence.from([
  {
    standalone_question: standaloneQuestionChain,
    original_input: new RunnablePassthrough(),
  },
  async ({ standalone_question, original_input }) => {
    // Extract userId from original_input
    const { userId } = original_input;

    if (!userId) {
      throw new Error("User ID is required to retrieve relevant notes.");
    }

    // Retrieve relevant documents using the standalone question and userId
    const relevantNote = await retrieveRelevantNotes(standalone_question, userId);

    // Extract relevant details from the note
    const { note_title, content, tags } = relevantNote || {};

    // Build the context
    const context = `Title: ${note_title}\nContent: ${content}\nTags: ${tags?.join(", ") || "No tags available"}`;


    return {
      context,
      question: original_input.question,
      conv_history: original_input.conv_history,
    };
  },
  answerChain,
]);

// Conversation history
const convHistory: string[] = [];

/**
 * Main function to handle conversation progress.
 * @param {string} question - The user's question.
 * @param {string} userId - The user's ID.
 * @returns {Promise<string>} - The chatbot's response.
 */
async function progressConversation(question: string, userId: string): Promise<string> {
  // Format the conversation history
  const formattedConvHistory = formatConvHistory(convHistory);

  // Invoke the chain
  const response = await chain.invoke({
    question,
    conv_history: formattedConvHistory,
    userId, // Pass userId to the chain
  });

  // Update conversation history
  convHistory.push(question);
  convHistory.push(response);

  return response; // Return the chatbot's response
}

export { progressConversation };