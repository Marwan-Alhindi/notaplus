async function callNotesDb<T = any>(action: string, args: any[]): Promise<T> {
  const res = await fetch("/api/vectorsDatabase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`);
  return body.result as T;
}

export function saveFullNote(note_title: string, note_id: string, content: string, tags: string[], notebook: string, userId: string): Promise<void> {
  return callNotesDb("saveFullNote", [note_title, note_id, content, tags, notebook, userId]);
}

export function saveHandWrittenNote(note_title: string, content: string, tags: string[], notebook: string, userId: string): Promise<void> {
  return callNotesDb("saveHandWrittenNote", [note_title, content, tags, notebook, userId]);
}

export function saveNoteInChunks(note_title: string, content: string, tags: string[], notebook: string, userId: string): Promise<void> {
  return callNotesDb("saveNoteInChunks", [note_title, content, tags, notebook, userId]);
}

export function getAllFullNotes(userId: string): Promise<any[]> {
  return callNotesDb("getAllFullNotes", [userId]);
}

export function getAllUniqueTags(userId: string): Promise<string[]> {
  return callNotesDb("getAllUniqueTags", [userId]);
}

export function createNotebook(name: string, userId: string): Promise<void> {
  return callNotesDb("createNotebook", [name, userId]);
}

export function getAllNotebooks(userId: string): Promise<any[]> {
  return callNotesDb("getAllNotebooks", [userId]);
}

export function getNotesForNotebook(notebookName: string, userId: string): Promise<any[]> {
  return callNotesDb("getNotesForNotebook", [notebookName, userId]);
}

export function getDeletedNotes(userId: string): Promise<any[]> {
  return callNotesDb("getDeletedNotes", [userId]);
}

export function deleteNote(note_id: string, noteType: string): Promise<void> {
  return callNotesDb("deleteNote", [note_id, noteType]);
}

export function updateIsQuizableMD(noteId: string, isQuizable: boolean): Promise<boolean> {
  return callNotesDb("updateIsQuizableMD", [noteId, isQuizable]);
}

export function updateNote(
  note_id: string,
  note_title: string,
  content: string,
  tags: string[],
  is_new: boolean,
  notebook: string
): Promise<void> {
  return callNotesDb("updateNote", [note_id, note_title, content, tags, is_new, notebook]);
}

export function updateNotTrash(note_id: string): Promise<void> {
  return callNotesDb("updateNotTrash", [note_id]);
}

export function updateWrittenNote(
  note_id: string,
  note_title: string,
  content: string,
  tags: string[],
  is_new: boolean,
  notebook: string,
  strokesData?: any
): Promise<void> {
  return callNotesDb("updateWrittenNote", [note_id, note_title, content, tags, is_new, notebook, strokesData]);
}

export function saveStrokesToDatabase(strokes: number[][][], noteContent: string, userId: string): Promise<void> {
  return callNotesDb("saveStrokesToDatabase", [strokes, noteContent, userId]);
}

export async function progressConversation(question: string, userId: string): Promise<string> {
  const res = await fetch("/api/llmConversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, userId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`);
  return body.result as string;
}

export async function processPDF(pdfData: string): Promise<string> {
  const res = await fetch("/api/llmHandlePdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfData }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`);
  return body.result as string;
}
