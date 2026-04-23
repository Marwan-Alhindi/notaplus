"use client";
import React, { useContext, useState, useEffect } from "react";
import { Note } from "@/components/main-ui/Note";
import {
  getAllUniqueTags,
  saveFullNote,
  saveHandWrittenNote,
} from "@/lib/clientApi";
import styles from "@/styles/mainlayout.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import { v4 as uuidv4 } from "uuid";
import { UserContext } from "@/UserContext";
import { faPen } from "@fortawesome/free-solid-svg-icons"; // Import the new icon

export default function NotesList({
  notes,
  category,
  notebook,
  onSelectNote,
  onCreateNewNote,
}: {
  notes: any[];
  category: string;
  notebook: string;
  onSelectNote: (note: any) => void;
  onCreateNewNote: (newNote: any) => void; // Callback for new note creation
}) {
  // 1) Retrieve the context, then guard if it's null
  const userContextValue = useContext(UserContext);
  if (!userContextValue) {
    return <div>No UserContext available</div>;
  }
  // 2) Safely destructure from the non-null context
  const { user, loading } = userContextValue;

  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState<boolean>(false);

  useEffect(() => {
    if (loading || !user) return;

    const fetchTags = async () => {
      try {
        const uniqueTags = await getAllUniqueTags(user.id);
        setTags(uniqueTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    if (category === "Tags") {
      setShowTags(true);
      fetchTags();
    } else {
      setShowTags(false);
    }
  }, [loading, user, category]);

  const handleNewWrittenNote = async () => {
    if (!user) return;

    const newNote = {
      note_title: "New Note",
      noteContent: "",
      tags: [],
      created_at: new Date().toISOString(),
      is_new: true,
      notebook: notebook || "none",
      note_id: uuidv4(),
      noteType: "handwritten",
    };

    try {
      await saveHandWrittenNote(
        newNote.note_title,
        newNote.noteContent,
        newNote.tags,
        newNote.notebook,
        user.id
      );
      onCreateNewNote(newNote);
    } catch (error) {
      console.error("Error creating new handwritten note:", error);
    }
  };

  const handleCreateNewNote = async () => {
    if (!user) return;

    const newNote = {
      note_title: "New Note",
      content: "",
      tags: [],
      created_at: new Date().toISOString(),
      is_new: true,
      notebook: notebook || "none",
      note_id: uuidv4(),
      noteType: "markdown",
    };
    
    try {
      await saveFullNote(
        newNote.note_title,
        newNote.note_id,
        newNote.content,
        newNote.tags,
        newNote.notebook,
        user.id
      );
      onCreateNewNote(newNote);
    } catch (error) {
      console.error("Error creating new markdown note:", error);
    }
  };

  return (
    <div className={styles.notesList}>
      <div className={styles.categoryHeader}>
        <h2 className={styles.title}>{notebook || category}</h2>
        <div className={styles.iconsContainer}>
          <FontAwesomeIcon
            icon={faPenToSquare}
            className={styles.newNoteIcon}
            onClick={handleCreateNewNote}
          />
          <FontAwesomeIcon
            icon={faPen}
            className={styles.newNoteIcon}
            onClick={handleNewWrittenNote}
          />
        </div>
      </div>
      <div className={styles.notesContainer}>
        {showTags ? (
          tags.length ? (
            tags.map((tag, index) => (
              <div key={index} className={styles.tagItem}>
                {tag}
              </div>
            ))
          ) : (
            <p>No tags available</p>
          )
        ) : notes.length ? (
          notes.map((note, index) => (
            <div
              key={note.note_id}
              onClick={() => {
                setSelectedNoteIndex(index);
                onSelectNote(note);
              }}
              className={`${styles.noteCard} ${
                index === selectedNoteIndex ? styles.selected : ""
              }`}
            >
              <Note
                title={note.note_title}
                description={note.content}
                createdAt={note.created_at}
                tags={note.tags}
              />
            </div>
          ))
        ) : (
          <p>No items available</p>
        )}
      </div>
    </div>
  );
}