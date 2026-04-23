// "use client";

// import React, { useState, useRef } from "react";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm"; // For GitHub-flavored Markdown
// import styles from "@/styles/MarkdownEditor.module.css";
// import { saveFullNote, saveNoteInChunks } from "@/pages/api/vectorsDatabase";

// export default function MarkdownEditor() {
//   const [markdown, setMarkdown] = useState<string>("# Welcome to your Markdown Editor!");
//   const [isPreview, setIsPreview] = useState<boolean>(false);
//   const [saving, setSaving] = useState<boolean>(false); // State to track saving status
//   const [title, setTitle] = useState<string>("");
//   const [tags, setTags] = useState<string[]>([]);

//   // Reference for the textarea to work with selection
//   const textareaRef = useRef<HTMLTextAreaElement>(null);

//   // Handle editor input
//   const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     setMarkdown(e.target.value);
//   };

//   // Insert Markdown Syntax around selected text
//   const applySyntax = (syntaxStart: string, syntaxEnd: string = "") => {
//     if (textareaRef.current) {
//       const textarea = textareaRef.current;
//       const start = textarea.selectionStart;
//       const end = textarea.selectionEnd;

//       const selectedText = markdown.substring(start, end);

//       // Wrap the selected text with the syntax
//       const newMarkdown =
//         markdown.substring(0, start) +
//         syntaxStart +
//         selectedText +
//         syntaxEnd +
//         markdown.substring(end);

//       setMarkdown(newMarkdown);

//       // Re-focus the textarea and adjust the cursor
//       setTimeout(() => {
//         textarea.focus();
//         textarea.setSelectionRange(
//           start + syntaxStart.length,
//           end + syntaxStart.length
//         );
//       }, 0);
//     }
//   };

//   // Handle adding tags by pressing Enter
//   const handleTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter") {
//       e.preventDefault(); // Prevent form submission or default behavior
//       const inputValue = e.currentTarget.value.trim();

//       if (inputValue && !tags.includes(inputValue)) {
//         const updatedTags = [...tags, inputValue]; // Add the new tag
//         setTags(updatedTags); // Update the state
//         e.currentTarget.value = ""; // Clear the input field
//       }
//     }
//   };

//   // Render tags
//   const renderTags = () => (
//     <div className={styles.tagsContainer}>
//       {tags.map((tag, index) => (
//         <span key={index} className={styles.tag}>
//           {tag}
//         </span>
//       ))}
//     </div>
//   );

//   // Save Markdown with Embedding
//   const handleGPTSave = async () => {
//     setSaving(true);
//     try {
//       // Save the title and content together
//       await saveNoteInChunks(title, markdown, tags);
//       await saveFullNote(title, markdown, tags);

//       alert("Markdown saved successfully!");
//     } catch (error) {
//       console.error("Error saving markdown:", error);
//       alert("Failed to save markdown. Please try again.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className={styles.container}>
//       {/* Toolbar */}
//       <div className={styles.toolbar}>
//         <button onClick={() => applySyntax("**", "**")}>Bold</button>
//         <button onClick={() => applySyntax("_", "_")}>Italic</button>
//         <button onClick={() => applySyntax("# ", "")}>H1</button>
//         <button onClick={() => applySyntax("![Alt text](", ")")}>Image</button>
//         <button onClick={() => applySyntax("[", "](url)")}>Link</button>
//         <button onClick={() => setIsPreview((prev) => !prev)}>
//           {isPreview ? "Edit" : "Preview"}
//         </button>
//         <input
//           type="text"
//           onKeyPress={handleTagsKeyDown}
//           placeholder="Add Tags"
//           className={styles.tagsInput}
//         />
//         <button onClick={handleGPTSave} disabled={saving}>
//           {saving ? "Saving..." : "GPT Save"}
//         </button>
//       </div>

//       {/* Render Tags */}
//       {renderTags()}

//       {/* Title Input */}
//       <input
//         type="text"
//         value={title}
//         onChange={(e) => setTitle(e.target.value)}
//         placeholder="Enter note title..."
//         className={styles.titleInput}
//       />

//       {/* Editor/Preview */}
//       <div className={styles.editor}>
//         {isPreview ? (
//           <div className={styles.preview}>
//             <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
//           </div>
//         ) : (
//           <textarea
//             ref={textareaRef}
//             className={styles.textarea}
//             value={markdown}
//             onChange={handleInputChange}
//             placeholder="Write your Markdown here..."
//           />
//         )}
//       </div>
//     </div>
//   );
// }