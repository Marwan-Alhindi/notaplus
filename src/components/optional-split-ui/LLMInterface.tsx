"use client";

import React, { useContext, useState } from "react";
import RenderText from "@/components/optional-split-ui/llm-ui/RenderText";
import styles from "@/styles/LLMInterface.module.css";
import { progressConversation } from "@/lib/clientApi";
import { UserContext } from "@/UserContext"; // <-- import your context

export default function LLMInterface() {
  // 1) Retrieve context & guard if it's null (or just destructure carefully)
  const userContextValue = useContext(UserContext);
  if (!userContextValue) {
    return <div>No UserContext available</div>;
  }

  const { user } = userContextValue;

  const [userInput, setUserInput] = useState<string>("");
  const [conversation, setConversation] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSend = async () => {
    if (userInput.trim() === "") return; // Prevent sending empty messages
    if (!user) return; // No user? Can't pass userId.

    // Add user input to the conversation
    const userMessage = `**You:** ${userInput}`;
    setConversation((prev) => [...prev, userMessage]);

    setLoading(true);

    try {
      // 2) Pass question & userId to progressConversation
      const botResponse = await progressConversation(userInput, user.id);

      // Add LLM response to conversation
      const botMessage = `**LLM:** ${botResponse}`;
      setConversation((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error fetching LLM response:", error);
      setConversation((prev) => [
        ...prev,
        "**LLM:** Sorry, something went wrong.",
      ]);
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  return (
    <div className={styles.LLMBox}>
      <div className={styles.responseBox}>
        {conversation.map((message, index) => (
          <div key={index} className={styles.message}>
            <RenderText llmOutput={message} />
          </div>
        ))}
        {loading && <div className={styles.loading}>Loading...</div>}
      </div>
      <div className={styles.inputContainer}>
        <input
          className={styles.LLMinput}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your question..."
        />
        <button
          className={styles.LLMbutton}
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}