"use client";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import getStroke from "perfect-freehand";
import styles from "@/styles/WrittenNotes.module.css";
import Chatbot from "@/components/Chatbot/chatbot";
import debounce from "@/utils/llmUtils";
import { updateWrittenNote } from "@/pages/api/vectorsDatabase";
import { UserContext } from "@/UserContext";

const options = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: { taper: 0, easing: (t: number) => t, cap: true },
  end: { taper: 100, easing: (t: number) => t, cap: true },
};

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

interface DrawingCanvasProps {
  note: any;
  allNotes: any[];
  onUpdateNote: (updatedNote: any) => void; // Callback for parent update
}

export default function DrawingCanvas({
  note,
  allNotes,
  onUpdateNote,
}: DrawingCanvasProps) {
  const [points, setPoints] = useState<number[][]>([]);
  const [strokes, setStrokes] = useState<number[][][]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  // 1) Retrieve context & guard if it's null
  const userContextValue = useContext(UserContext);
  if (!userContextValue) {
    return <div>No UserContext available</div>;
  }

  // 2) Destructure from non-null context
  const { user } = userContextValue;

  const [noteTitle, setNoteTitle] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [localAllNotes, setLocalAllNotes] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>("pen"); // Default to pen

  // Sync localAllNotes with allNotes when allNotes changes
  useEffect(() => {
    const storedNotes = localStorage.getItem("localAllNotes");
    if (storedNotes) {
      setLocalAllNotes(JSON.parse(storedNotes));
    } else {
      setLocalAllNotes(allNotes);
    }
  }, [allNotes]);

  // Update strokes when the selected note changes
  useEffect(() => {
    if (!note) return;

    const updatedNote =
      localAllNotes.find((n) => n.note_id === note.note_id) || note;

    setStrokes(updatedNote?.strokesData || []);
  }, [note, localAllNotes]);

  // Save to localStorage
  const saveToLocalStorage = (updatedNotes: any[]) => {
    localStorage.setItem("localAllNotes", JSON.stringify(updatedNotes));
  };

  // Debounced save function
  const debouncedSaveNote = useCallback(
    debounce((updatedStrokes: number[][][]) => {
      const updatedNote = { ...note, strokesData: updatedStrokes };
      onUpdateNote(updatedNote);

      if (user) {
        updateWrittenNote(
          updatedNote.note_id,
          updatedNote.note_title,
          updatedNote.noteContent,
          updatedNote.tags,
          updatedNote.is_new,
          updatedNote.notebook,
          updatedStrokes
        );
      }

      setLocalAllNotes((prevNotes) => {
        const updatedNotes = prevNotes.some(
          (n) => n.note_id === updatedNote.note_id
        )
          ? prevNotes.map((n) =>
              n.note_id === updatedNote.note_id ? updatedNote : n
            )
          : [...prevNotes, updatedNote];
        saveToLocalStorage(updatedNotes);
        return updatedNotes;
      });
    }, 1000),
    [note, user, onUpdateNote]
  );

  const toggleChat = () => setIsChatVisible(!isChatVisible);

  const getSvgPoint = (event: React.PointerEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [event.clientX, event.clientY];
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return [event.clientX, event.clientY];
    const svgPoint = point.matrixTransform(ctm.inverse());
    return [svgPoint.x, svgPoint.y];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const [x, y] = getSvgPoint(e);

    if (selectedTool === "eraser") {
      // Eraser mode: Remove strokes near the point
      const updatedStrokes = strokes.filter(
        (stroke) =>
          !stroke.some(
            ([px, py]) => Math.abs(px - x) < 10 && Math.abs(py - y) < 10
          )
      );
      setStrokes(updatedStrokes);
      debouncedSaveNote(updatedStrokes);
    } else {
      // Drawing mode
      setPoints([[x, y]]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    if (selectedTool === "eraser") return;

    const [x, y] = getSvgPoint(e);
    setPoints((prevPoints) => [...prevPoints, [x, y]]);
  };

  const handlePointerUp = () => {
    if (points.length > 0 && selectedTool === "pen") {
      const updatedStrokes = [...strokes, points];
      setStrokes(updatedStrokes);
      debouncedSaveNote(updatedStrokes);
      setPoints([]);
    }
  };

  const debouncedSaveTitle = useCallback(
    debounce((updatedTitle: string) => {
      const updatedNote = { ...note, note_title: updatedTitle };
      onUpdateNote(updatedNote);

      if (user) {
        updateWrittenNote(
          updatedNote.note_id,
          updatedNote.note_title,
          updatedNote.noteContent,
          updatedNote.tags,
          updatedNote.is_new,
          updatedNote.notebook,
          updatedNote.strokesData
        );
      }
    }, 1000),
    [note, user, onUpdateNote]
  );

  useEffect(() => {
    if (note) {
      setNoteTitle(note.note_title || "");
    }
  }, [note]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setNoteTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "auto",
        border: "1px solid black",
        position: "relative",
      }}
    >
      <div>
        <input
          type="text"
          value={noteTitle}
          onChange={handleTitleChange}
          onBlur={() => setIsEditingTitle(false)}
          className={styles.titleInput}
          autoFocus
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <div className={styles.tools}>
          <button
            className={selectedTool === "pen" ? styles.activeTool : ""}
            onClick={() => setSelectedTool("pen")}
          >
            🖊️
          </button>
          <button
            className={selectedTool === "eraser" ? styles.activeTool : ""}
            onClick={() => setSelectedTool("eraser")}
          >
            🧽
          </button>
          <button
            className={selectedTool === "highlighter" ? styles.activeTool : ""}
            onClick={() => setSelectedTool("highlighter")}
          >
            🖍️
          </button>
          <button
            className={selectedTool === "selector" ? styles.activeTool : ""}
            onClick={() => setSelectedTool("selector")}
          >
            🔍
          </button>
          <button
            className={selectedTool === "delete" ? styles.activeTool : ""}
            onClick={() => setSelectedTool("delete")}
          >
            🗑️
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ width: "100%", height: "5000px", background: "#f9f9f9" }}
        viewBox="0 0 1000 5000"
      >
        {strokes.map((stroke, index) => (
          <path
            key={index}
            d={getSvgPathFromStroke(getStroke(stroke, options))}
            fill="black"
            stroke="black"
            strokeWidth="2"
          />
        ))}
        {points.length > 0 && (
          <path
            d={getSvgPathFromStroke(getStroke(points, options))}
            fill="black"
            stroke="black"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className={styles.chatButton} onClick={toggleChat}>
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