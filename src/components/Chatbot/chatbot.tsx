"use client";
import React, { useContext, useState } from "react";
import styles from "@/styles/FullMarkdown.module.css";
import { progressConversation, processPDF, createNotebook, saveFullNote } from "@/lib/clientApi";
import RenderText from "@/components/optional-split-ui/llm-ui/RenderText";
import "react-resizable/css/styles.css";
import { faPaperclip, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { UserContext } from "@/UserContext";

export default function Chatbot() {
  // 1) Retrieve the context value
  const userContextValue = useContext(UserContext);
  // 2) Guard in case it's null
  if (!userContextValue) {
    return <div>No UserContext available</div>;
  }

  // 3) Now safely destructure from the non-null value
  const { user, loading: userLoading } = userContextValue;

  const [userInput, setUserInput] = useState<string>("");
  const [conversation, setConversation] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Chatbot loading state
  const [pdfText, setPdfText] = useState<string>("");
  const [isPdf, setIsPdf] = useState<boolean>(false);

  const handleSend = async () => {
    if (userLoading || !user) return; // Ensure user is ready
    if (userInput.trim() === "") return; // Prevent sending empty messages

    const userMessage = `**You:** ${userInput}`;
    setConversation((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const botResponse = await progressConversation(userInput, user.id);
      const botMessage = `**LLM:** ${botResponse}`;
      setConversation((prev) => [...prev, botMessage]);
      setIsPdf(false);
    } catch (error) {
      console.error("Error fetching LLM response:", error);
      const errorMessage = "**LLM:** Sorry, something went wrong.";
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userLoading || !user) return; // Ensure user is ready

    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/uploadPdf", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to process PDF");
      }
      const data = await response.json();
      const preprocessedText = await processPDF(data.text);
      setPdfText(preprocessedText);
      setConversation((prev) => [...prev, preprocessedText]);
      setIsPdf(true);
    } catch (error) {
      console.error("Error processing PDF:", error);
    }
  };

  const extractTitleAndContent = (text: string) => {
    const titleMatch = text.match(/Title:\s*(.*)/);
    const contentMatch = text.match(/Structured notes:\s*([\s\S]*)/);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const content = contentMatch ? contentMatch[1].trim() : "";

    return { title, content };
  };

  const handleSaveNote = async (text: string) => {
    if (userLoading || !user) return; // Ensure user is ready

    const { title, content } = extractTitleAndContent(text);
    const tags = ["AI Generated"];
    const notebook = "AI Generated";

    try {
      await createNotebook(notebook, user.id);
      await saveFullNote(title, "note_id", content, tags, notebook, user.id);
      setIsPdf(false);
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  if (userLoading) {
    return <div>Loading...</div>; // Global loading state while user data is fetched
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>Nota at your service!</div>
      <div className={styles.chatMessages}>
        {conversation.map((message, index) => (
          <div key={index}>
            <RenderText llmOutput={message} />
          </div>
        ))}
        {loading && <div>Loading...</div>}
      </div>
      {isPdf && (
        <div className={styles.centeredButtons}>
          <p>Save Note?</p>
          <button onClick={() => handleSaveNote(pdfText)}>Yes</button>
          <button onClick={() => setIsPdf(false)}>No</button>
        </div>
      )}
      <div className={styles.chatInputContainer}>
        <input
          className={styles.chatInput}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type a message..."
        />
        <input
          type="file"
          id="fileUpload"
          className={styles.fileInput}
          onChange={handleFileUpload}
          accept=".pdf"
        />
        <label htmlFor="fileUpload" className={styles.fileUploadButton}>
          <FontAwesomeIcon icon={faPaperclip} />
        </label>
        <button
          className={styles.chatSendButton}
          onClick={handleSend}
          disabled={loading || userLoading}
        >
          {loading ? "Sending..." : <FontAwesomeIcon icon={faPaperPlane} />}
        </button>
      </div>
    </div>
  );
}