"use client";
import React, { useContext, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import NotesList from "@/components/main-ui/NotesList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faNoteSticky,
  faBook,
  faTrash,
  faTag,
  faSquareCheck,
  faPlus,
  faMemory,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import styles from "@/styles/resizable.module.css";
import FullMarkdown from "./FullMarkdown";
import {
  getAllFullNotes,
  createNotebook,
  getAllNotebooks,
  getDeletedNotes,
  deleteNote,
} from "@/lib/clientApi";
import DrawingCanvas from "./WrittenNotes";
import { UserContext } from "@/UserContext";
import { useRouter } from "next/router";
import { createClient } from "@/utils/supabase/component";

export default function Resizable() {
  const router = useRouter();
  const supabase = createClient();

  console.log("Resizable component");
  // 1) Retrieve the UserContext, check if it's null
  const userContextValue = useContext(UserContext);
  console.log(userContextValue)
  if (!userContextValue) {
    return <div>No UserContext available</div>;
  }

  // 2) Safely destructure from the non-null context
  const { user, loading: userLoading } = userContextValue;

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [whichCategory, setWhichCategory] = useState<string>("All Notes");
  const [fullNotes, setFullNotes] = useState<any[]>([]);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newNotebookName, setNewNotebookName] = useState<string>("");
  const [whichNotebook, setWhichNotebook] = useState<string>("");
  const [noteType, setNoteType] = useState("markdown");
  const [trashNotes, setTrashNotes] = useState<any[]>([]);
  const [isTrash, setIsTrash] = useState<boolean>(false);
  const [whichNoteDeleted, setWhichNoteDeleted] = useState<any>(null);

  const handleWhichNoteDeleted = (note: any) => {
    console.log(note);
    setWhichNoteDeleted(note);
  };

  useEffect(() => {
    if (whichCategory === "Trash") {
      setIsTrash(true);
    } else {
      setIsTrash(false);
    }
  }, [whichCategory]);

  useEffect(() => {
    if (!whichNoteDeleted) return; // only run if it's a real note object
    setTrashNotes((prevTrashNotes) =>
      prevTrashNotes.filter((n) => n.note_id !== whichNoteDeleted.note_id)
    );
    setFullNotes((prevNotes) =>
      prevNotes.filter((n) => n.note_id !== whichNoteDeleted.note_id)
    );
  }, [whichNoteDeleted]);

  const categories = [
    { name: "All Notes", icon: faNoteSticky },
    { name: "Notebooks", icon: faBook },
    { name: "Trash", icon: faTrash },
    { name: "Tags", icon: faTag },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      return;
    }
    router.push("/");
  };

  // 3) Ensure user isn't null before calling getAllFullNotes
  const fetchNotes = async () => {
    if (!user) return;
    try {
      const allNotes = await getAllFullNotes(user.id);
      console.log('all notes fetched!')
      if (whichNotebook) {
        const filteredNotes = allNotes.filter(
          (note) => note.notebook === whichNotebook
        );
        setFullNotes(filteredNotes);
      } else {
        setFullNotes(allNotes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      // Find the note to be deleted
      const noteToDelete = fullNotes.find((note) => note.note_id === noteId);

      if (!noteToDelete) {
        console.error("Note not found");
        return;
      }

      // Update the `fullNotes` state to remove the deleted note
      setFullNotes((prevNotes) =>
        prevNotes.filter((note) => note.note_id !== noteId)
      );

      // Add the deleted note to the `trashNotes` state
      setTrashNotes((prevTrashNotes) => [...prevTrashNotes, noteToDelete]);

      // Clear the selected note if it's the deleted one
      if (selectedNote?.note_id === noteId) {
        setSelectedNote(null);
      }

      // Optionally, call an API to delete the note from the database
      const noteType =
        noteToDelete.noteType === "handwritten" ? "handwritten" : "markdown";
      await deleteNote(noteId, noteType);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // 3) Ensure user isn't null before calling getAllNotebooks
  const fetchNotebooks = async () => {
    if (!user) return;
    try {
      const notebookList = await getAllNotebooks(user.id);
      setNotebooks(notebookList);
    } catch (error) {
      console.error("Error fetching notebooks:", error);
    }
  };

  // 3) Ensure user isn't null before calling getDeletedNotes
  const fetchTrashNotes = async () => {
    if (!user) return;
    try {
      const trashNotes = await getDeletedNotes(user.id);
      setTrashNotes(trashNotes);
      setFullNotes(trashNotes);
    } catch (error) {
      console.error("Error fetching notebooks:", error);
    }
  };

  useEffect(() => {
    // If user is still loading, or there's no user, skip
    if (userLoading || !user) return;

    if (whichCategory === "All Notes" || whichNotebook) {
      fetchNotes();
    } else {
      fetchNotebooks();
    }

    if (whichCategory === "Trash") {
      fetchTrashNotes();
    }
  }, [userLoading, user, whichCategory, whichNotebook]);

  const handleSelectNote = (note: any) => {
    setSelectedNote(note);
    setNoteType(note.noteType === "handwritten" ? "handwritten" : "markdown");
  };

  const handleCreateNewNote = (newNote: any) => {
    setFullNotes((prevNotes) => [...prevNotes, newNote]);
    setSelectedNote(newNote);
  };

  const handleCreateNewNotebook = async () => {
    if (!user) return;
    try {
      await createNotebook(newNotebookName, user.id);
      fetchNotebooks();
      setShowModal(false);
      setNewNotebookName("");
    } catch (error) {
      console.error("Error creating new notebook:", error);
    }
  };

  const handleUpdateNote = (updatedNote: any) => {
    setFullNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.note_id === updatedNote.note_id ? updatedNote : note
      )
    );
  };

  if (userLoading) {
    return <div>Loading...</div>;
  }

  return (
    <PanelGroup autoSaveId="example" direction="horizontal">
      <Panel defaultSize={20} minSize={10} maxSize={30}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarOneTextMargin}>
            {categories.map((category, index) => {
              if (category.name === "Notebooks") {
                return (
                  <React.Fragment key={index}>
                    <div className={styles.categoryItemContainer}>
                      <p
                        onClick={() => {
                          setWhichCategory(category.name);
                          setWhichNotebook("");
                        }}
                        className={styles.categoryItem}
                      >
                        <FontAwesomeIcon
                          icon={category.icon}
                          className={styles.icon}
                        />
                        {category.name}
                      </p>
                      <FontAwesomeIcon
                        icon={faPlus}
                        className={styles.newNotebookIcon}
                        onClick={() => setShowModal(true)}
                      />
                    </div>

                    {notebooks.map((notebook, notebookIndex) => (
                      <div
                        key={`notebook-${notebookIndex}`}
                        className={styles.notebookItem}
                        onClick={() => {
                          setWhichCategory("Notebooks");
                          setWhichNotebook(notebook.name);
                        }}
                      >
                        <p className={styles.categoryItem}>{notebook.name}</p>
                      </div>
                    ))}
                  </React.Fragment>
                );
              }
              return (
                <div key={index} className={styles.categoryItemContainer}>
                  <p
                    onClick={() => {
                      setWhichCategory(category.name);
                      setWhichNotebook("");
                    }}
                    className={styles.categoryItem}
                  >
                    <FontAwesomeIcon
                      icon={category.icon}
                      className={styles.icon}
                    />
                    {category.name}
                  </p>
                </div>
              );
            })}
            <button className={styles.logoutButton} onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={40} minSize={20} maxSize={60}>
        <div className={styles.categoryData}>
          <NotesList
            notes={fullNotes}
            category={whichCategory}
            notebook={whichNotebook}
            onSelectNote={handleSelectNote}
            onCreateNewNote={handleCreateNewNote}
          />
        </div>
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={40} minSize={20}>
        {noteType === "handwritten" ? (
          <DrawingCanvas
            note={selectedNote}
            allNotes={fullNotes}
            onUpdateNote={handleUpdateNote}
          />
        ) : (
          <FullMarkdown
            note={selectedNote}
            allNotes={fullNotes}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            isTrash={isTrash}
            whichNoteRetrieved={handleWhichNoteDeleted}
          />
        )}
      </Panel>
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add New Notebook</h2>
            <input
              type="text"
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              placeholder="Enter notebook name"
              className={styles.modalInput}
            />
            <div className={styles.modalButtons}>
              <button
                onClick={handleCreateNewNotebook}
                className={styles.createButton}
              >
                Create
              </button>
              <button
                onClick={() => setShowModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelGroup>
  );
}