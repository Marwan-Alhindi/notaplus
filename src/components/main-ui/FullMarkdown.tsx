"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "@/styles/FullMarkdown.module.css";
import {
  updateIsQuizableMD,
  updateNote,
  updateNotTrash,
} from "@/lib/clientApi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faHeading,
  faImage,
  faBookOpen,
  faTrash,
  faQuestionCircle,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import debounce from "@/utils/llmUtils";
import Chatbot from "@/components/Chatbot/chatbot";

interface FullMarkdownProps {
  note: any;
  allNotes: any[];
  onUpdateNote: (updatedNote: any) => void; // Callback to update notes
  onDeleteNote: (noteId: string) => void; // Callback to delete note
  isTrash: boolean;
  whichNoteRetrieved: (noteDeleted: any) => void;
}

export default function FullMarkdown({
  note,
  allNotes,
  onUpdateNote,
  onDeleteNote,
  isTrash,
  whichNoteRetrieved
}: FullMarkdownProps) {
  const [localAllNotesMD, setLocalAllNotesMD] = useState<any[]>([]);
  const [localNote, setLocalNote] = useState<any>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDelete = () => {
    if (note) {
      onDeleteNote(note.note_id);
    }
  };

  // Sync `localAllNotesMD` with `allNotes` when `allNotes` changes
  useEffect(() => {
    const storedNotes = localStorage.getItem("localAllNotesMD");
    if (storedNotes) {
      setLocalAllNotesMD(JSON.parse(storedNotes));
    } else {
      setLocalAllNotesMD(allNotes);
    }
  }, [allNotes]);

  // --- NEW: Retrieve note locally as "not trash" ---
  const handleRetrieveNote = (retrievedNote: any) => {
    // 1) Update in the database
    updateNotTrash(retrievedNote.note_id);

    // 2) Update your local note object so that it’s no longer in trash
    const updatedNote = { ...retrievedNote, is_trash: false };
    // or if you store it under another field, e.g., `trash: false`, set that accordingly:
    // const updatedNote = { ...retrievedNote, trash: false };

    // 3) Update local state in parent (if needed)
    onUpdateNote(updatedNote);

    // 4) Update in `localAllNotesMD`
    setLocalAllNotesMD((prevNotes) => {
      const updatedNotes = prevNotes.map((n) =>
        n.note_id === updatedNote.note_id ? updatedNote : n
      );
      saveToLocalStorage(updatedNotes);
      return updatedNotes;
    });

    // 5) Update local trash notes
    whichNoteRetrieved(retrievedNote);

    // 5) Update local note
    setLocalNote(updatedNote);
  };
  // -------------------------------------------------

  // Sync `localNote` with `note` when `note` changes
  useEffect(() => {
    if (!note) return; // If no note is selected, do nothing

    const updatedNote =
      localAllNotesMD.find((n) => n.note_id === note.note_id) || note;

    setLocalNote(updatedNote);
    setMarkdown(updatedNote?.content || "# Welcome to your Markdown Editor!");
    setTitle(updatedNote?.note_title || "Untitled Note");
    setTags(updatedNote?.tags || []);
  }, [note, localAllNotesMD]);

  // Save updated notes to `localStorage`
  const saveToLocalStorage = (updatedNotes: any[]) => {
    localStorage.setItem("localAllNotesMD", JSON.stringify(updatedNotes));
  };

  // Debounced save function
  const debouncedSaveNote = useCallback(
    debounce((updatedNote) => {
      onUpdateNote(updatedNote);

      // Update database
      updateNote(
        updatedNote.note_id,
        updatedNote.note_title,
        updatedNote.content,
        updatedNote.tags,
        updatedNote.is_new,
        updatedNote.notebook
      );

      // Update note in `localAllNotesMD`
      setLocalAllNotesMD((prevNotes) => {
        const updatedNotes = prevNotes.some(
          (n) => n.note_id === updatedNote.note_id
        )
          ? prevNotes.map((n) =>
              n.note_id === updatedNote.note_id ? updatedNote : n
            )
          : [...prevNotes, updatedNote]; // Add new note if not found
        saveToLocalStorage(updatedNotes);
        return updatedNotes;
      });
    }, 1000),
    [onUpdateNote]
  );

  const handleChange = (field: string, value: string | string[]) => {
    const updatedNote = {
      ...localNote,
      note_title: field === "title" ? value : title,
      content: field === "content" ? value : markdown,
      tags: field === "tags" ? value : tags,
    };

    if (field === "title") setTitle(value as string);
    else if (field === "content") setMarkdown(value as string);
    else if (field === "tags") setTags(value as string[]);

    setLocalNote(updatedNote);
    debouncedSaveNote(updatedNote); // Save updates
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange("content", e.target.value);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange("title", e.target.value);
  };

  const handleTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputValue = e.currentTarget.value.trim();
      if (inputValue && !tags.includes(inputValue)) {
        handleChange("tags", [...tags, inputValue]);
        e.currentTarget.value = "";
      }
    }
  };

  const handleQuiz = async () => {
    if (!localNote) return;

    // Toggle the is_quizable state
    const updatedIsQuizable = !localNote.is_quizable;
    const updatedNote = {
      ...localNote,
      is_quizable: updatedIsQuizable, // Toggle true/false
    };

    setLocalNote(updatedNote);

    // Update the database
    const success = await updateIsQuizableMD(updatedNote.note_id, updatedIsQuizable);
    if (!success) {
      console.error("Failed to update is_quizable in the database");
      return;
    }

    // Update local state
    onUpdateNote(updatedNote);

    // Update localAllNotesMD
    setLocalAllNotesMD((prevNotes) => {
      const updatedNotes = prevNotes.map((n) =>
        n.note_id === updatedNote.note_id ? updatedNote : n
      );
      saveToLocalStorage(updatedNotes);
      return updatedNotes;
    });
  };

  const renderTags = () => (
    <div className={styles.tagsContainer}>
      {tags.map((tag: string, index: number) => (
        <span key={index} className={styles.tag}>
          {tag}
        </span>
      ))}
    </div>
  );

  const applySyntax = (syntaxStart: string, syntaxEnd: string = "") => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = markdown.substring(start, end);
      const newMarkdown =
        markdown.substring(0, start) +
        syntaxStart +
        selectedText +
        syntaxEnd +
        markdown.substring(end);

      setMarkdown(newMarkdown);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + syntaxStart.length,
          end + syntaxStart.length
        );
      }, 0);

      // Update content
      handleChange("content", newMarkdown);
    }
  };

  return (
    <div className={styles.fullMarkdownContainer}>
      {isEditingTitle ? (
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onBlur={() => setIsEditingTitle(false)}
          className={styles.titleInput}
          autoFocus
        />
      ) : (
        <h1 className={styles.title} onClick={() => setIsEditingTitle(true)}>
          {title}
        </h1>
      )}
      <div className={styles.toolbar}>
        <button className={styles.button} onClick={() => applySyntax("**", "**")}>
          <FontAwesomeIcon icon={faBold} />
        </button>
        <button className={styles.button} onClick={() => applySyntax("_", "_")}>
          <FontAwesomeIcon icon={faItalic} />
        </button>
        <button className={styles.button} onClick={() => applySyntax("# ", "")}>
          <FontAwesomeIcon icon={faHeading} />
        </button>
        <button
          className={styles.button}
          onClick={() => applySyntax("![Alt text](", ")")}
        >
          <FontAwesomeIcon icon={faImage} />
        </button>
        <button
          className={styles.button}
          onClick={() => setIsPreview((prev) => !prev)}
        >
          <FontAwesomeIcon icon={faBookOpen} />
        </button>

        {/* Show the retrieve button only if we're in the trash view */}
        {isTrash && (
          <button className={styles.button}>
            <FontAwesomeIcon
              icon={faRotateLeft}
              onClick={() => handleRetrieveNote(note)}
            />
          </button>
        )}

        <button
          className={`${styles.button} ${
            localNote?.is_quizable ? styles.activeQuiz : ""
          }`}
          onClick={handleQuiz}
        >
          <FontAwesomeIcon icon={faQuestionCircle} />
        </button>

        <input
          type="text"
          onKeyPress={handleTagsKeyDown}
          placeholder="Add Tags"
          className={styles.tagsInput}
        />
        <button className={styles.button} onClick={handleDelete}>
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>

      {renderTags()}

      <div className={styles.editor}>
        {isPreview ? (
          <div className={styles.preview}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={markdown}
            onChange={handleInputChange}
            placeholder="Write your Markdown here..."
          />
        )}
      </div>

      <div
        className={styles.chatButton}
        onClick={() => setIsChatVisible(!isChatVisible)}
      >
        💬
      </div>

      {isChatVisible && (
        <div className={styles.chatWindow}>
          <Chatbot />
        </div>
      )}
    </div>
  );
}