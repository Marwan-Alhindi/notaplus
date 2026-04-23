"use server";

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

const openAIApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({
  openAIApiKey,
  modelName: "gpt-4o",
});

const segmentTemplate = `You are an AI agent designed to organize and condense information into structured, clear, and concise notes. Given the following input text, transform it into well-organized notes that capture the key points and main ideas.
Your response should be structured exactly as follows:

Title: [Put the title here]
Structured notes:
[Put the structured notes here]

Input text: {messy_text}`;

// Create the segmentation prompt
const segmentPrompt = PromptTemplate.fromTemplate(segmentTemplate);

// Create a chain for segmentation
const segmentChain = segmentPrompt.pipe(llm).pipe(new StringOutputParser());

// Combine the chain into a sequence
const chain = RunnableSequence.from([
  async ({ pdfData }) => {
    return { messy_text: pdfData };
  },
  async ({ messy_text }) => {
    const structuredSections = await segmentChain.invoke({ messy_text });
    return { structured_sections: structuredSections };
  },
]);

/**
 * Main function to process and structure a PDF document.
 * @param {string} pdfData - The messy text extracted from the PDF.
 * @returns {Promise<string>} - The structured document as a string.
 */
async function processPDF(pdfData: string): Promise<string> {
  const response = await chain.invoke({ pdfData });

  // Extract the structured sections from the response
  const { structured_sections } = response;
  return structured_sections; // Return the structured document
}

export { processPDF };