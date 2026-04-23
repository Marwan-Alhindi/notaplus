import type { NextApiRequest, NextApiResponse } from "next";
import * as notesDb from "@/server/notesDb";

const allowedActions = new Set([
  "saveFullNote",
  "saveHandWrittenNote",
  "saveNoteInChunks",
  "getAllFullNotes",
  "getAllUniqueTags",
  "createNotebook",
  "getAllNotebooks",
  "getNotesForNotebook",
  "getDeletedNotes",
  "deleteNote",
  "updateIsQuizableMD",
  "updateNote",
  "updateNotTrash",
  "updateWrittenNote",
  "saveStrokesToDatabase",
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, args } = req.body ?? {};

  if (typeof action !== "string" || !allowedActions.has(action)) {
    return res.status(400).json({ error: `Unknown or disallowed action: ${action}` });
  }

  const fn = (notesDb as Record<string, any>)[action];
  if (typeof fn !== "function") {
    return res.status(400).json({ error: `Action not found: ${action}` });
  }

  try {
    const result = await fn(...(Array.isArray(args) ? args : []));
    return res.status(200).json({ result: result ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
