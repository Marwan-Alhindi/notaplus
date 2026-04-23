import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { formatConvHistory } from "@/utils/llmUtils";
import { retrieveRelevantNotes } from "@/server/notesDb";

const openAIApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({
  openAIApiKey,
  modelName: "gpt-4o",
});

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

const standaloneQuestionChain = standaloneQuestionPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const answerChain = answerPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const chain = RunnableSequence.from([
  {
    standalone_question: standaloneQuestionChain,
    original_input: new RunnablePassthrough(),
  },
  async ({ standalone_question, original_input }) => {
    const { userId } = original_input;
    if (!userId) throw new Error("User ID is required to retrieve relevant notes.");

    const relevantNote = await retrieveRelevantNotes(standalone_question, userId);
    const { note_title, content, tags } = relevantNote || {};
    const context = `Title: ${note_title}\nContent: ${content}\nTags: ${tags?.join(", ") || "No tags available"}`;

    return {
      context,
      question: original_input.question,
      conv_history: original_input.conv_history,
    };
  },
  answerChain,
]);

const convHistory: string[] = [];

export async function progressConversation(question: string, userId: string): Promise<string> {
  const formattedConvHistory = formatConvHistory(convHistory);

  const response = await chain.invoke({
    question,
    conv_history: formattedConvHistory,
    userId,
  });

  convHistory.push(question);
  convHistory.push(response);

  return response;
}
