import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { v4 as uuidv4 } from 'uuid';

import client from '@/utils/supabase/supabaseClient';

const openAIApiKey: string = process.env.OPENAI_API_KEY || '';

const embeddings = new OpenAIEmbeddings({ openAIApiKey });

const vectorStore = new SupabaseVectorStore(embeddings, {
  client,
  tableName: 'documents',
  queryName: 'match_documents',
});

const retriever = vectorStore.asRetriever();

export { retriever };

export const splitTextIntoChunks = (text: string, chunkSize: number = 512): string[] => {
  if (!text) return [];

  const words = text.split(" ");
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  for (const word of words) {
    if (currentChunk.join(" ").length + word.length + 1 <= chunkSize) {
      currentChunk.push(word);
    } else {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk.join(" "));
  return chunks;
};

export async function saveNoteInChunks(note_title: string, content: string, tags: string[], notebook: string, userId: string): Promise<void> {
  try {
    const noteId = uuidv4();
    const chunks = splitTextIntoChunks(content);
    const embeddingsArray = await embeddings.embedDocuments(chunks);

    let lineCounter = 1;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddingsArray[i];

      const chunkLines = chunk.split("\n");
      const metadata = {
        loc: {
          lines: {
            from: lineCounter,
            to: lineCounter + chunkLines.length - 1,
          },
        },
      };

      const { error } = await client.from("documents").insert([
        {
          user_id: userId,
          note_title,
          content: chunk,
          embedding,
          metadata,
          note_id: noteId,
          full_note: false,
          date_created: new Date().toISOString(),
          tags,
          notebook: notebook,
          noteType: "markdown",
        },
      ]);

      if (error) {
        throw new Error(`Error saving chunk: ${error.message}`);
      }

      lineCounter += chunkLines.length;
    }
  } catch (error) {
    console.error("Error saving note in chunks:", error);
    throw error;
  }
}

export async function saveFullNote(note_title: string, note_id: string, content: string, tags: string[], notebook: string, userId: string): Promise<void> {
  try {
    let embedding;
    if (content.trim()) {
      [embedding] = await embeddings.embedDocuments([content]);
    } else {
      embedding = new Array(1536).fill(0);
    }

    const metadata = { note_id };

    const { error } = await client.from('documents').insert([
      {
        user_id: userId,
        note_title,
        content,
        embedding,
        metadata,
        note_id,
        full_note: true,
        date_created: new Date().toISOString(),
        tags,
        is_new: true,
        notebook,
        noteType: "markdown",
      },
    ]);

    if (error) {
      throw new Error(`Error saving full note: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in saveFullNote:", error);
    throw error;
  }
}

export async function getAllFullNotes(userId: string): Promise<any[]> {
  try {
    const { data: documentsData, error: documentsError } = await client
      .from('documents')
      .select('note_id, note_title, date_created, tags, content, is_new, notebook, noteType')
      .eq('full_note', true)
      .eq('user_id', userId)
      .or('is_deleted.eq.false,is_deleted.is.null');

    if (documentsError) throw documentsError;

    const { data: writtenNotesData, error: writtenNotesError } = await client
      .from('writtenNotes')
      .select('note_id, note_title, created_at, tags, noteContent, is_new, notebook, noteType, strokesData')
      .eq('user_id', userId)
      .or('is_deleted.eq.false,is_deleted.is.null');

    if (writtenNotesError) throw writtenNotesError;

    return [
      ...(documentsData || []),
      ...(writtenNotesData || []),
    ];
  } catch (error) {
    console.error("Error in getAllFullNotes:", error);
    throw error;
  }
}

export async function getAllUniqueTags(userId: string): Promise<string[]> {
  try {
    const { data, error } = await client
      .from('documents')
      .select('tags')
      .eq('user_id', userId)
      .neq('tags', null);

    if (error) throw new Error(`Error retrieving tags: ${error.message}`);

    const tagsSet = new Set<string>();
    data.forEach((item: { tags: string[] }) => {
      item.tags.forEach((tag: string) => tagsSet.add(tag));
    });

    return Array.from(tagsSet);
  } catch (error) {
    console.error("Error in getAllUniqueTags:", error);
    throw error;
  }
}

export async function retrieveRelevantNotes(
  question: string,
  userId: string
): Promise<{ note_title: string; content: string; tags: string[] } | null> {
  try {
    const relevantDocs = await retriever.getRelevantDocuments(question);

    const userSpecificDocs = relevantDocs.filter(
      (doc) => doc.metadata.user_id === userId
    );

    if (userSpecificDocs.length === 0) return null;

    const note_ids = userSpecificDocs.map((doc) => doc.metadata.note_id);
    const mostRelevantNoteId = note_ids.length > 0 ? note_ids[0] : null;

    if (mostRelevantNoteId) {
      const { data: requiredData, error } = await client
        .from("documents")
        .select("note_title, content, tags, note_id")
        .eq("note_id", mostRelevantNoteId)
        .eq("user_id", userId)
        .eq("full_note", true)
        .single();

      if (error) throw new Error("Failed to retrieve the full note.");
      return requiredData;
    }

    return null;
  } catch (error) {
    console.error("Error retrieving relevant notes:", error);
    throw error;
  }
}

export async function updateNote(
  note_id: string,
  note_title: string,
  content: string,
  tags: string[],
  is_new: boolean,
  notebook: string
): Promise<void> {
  if (!note_id) throw new Error("Note ID is required to update the note");

  try {
    content = content || "";

    let fullNoteEmbedding;
    if (content.trim()) {
      [fullNoteEmbedding] = await embeddings.embedDocuments([content]);
    } else {
      fullNoteEmbedding = new Array(1536).fill(0);
    }

    const fullNoteMetadata = { note_id };

    const { error: fullNoteError } = await client
      .from("documents")
      .update({
        note_title,
        content,
        embedding: fullNoteEmbedding,
        metadata: fullNoteMetadata,
        tags,
        is_new: false,
        notebook,
      })
      .eq("note_id", note_id)
      .eq("full_note", true);

    if (fullNoteError) throw new Error(`Error updating full note: ${fullNoteError.message}`);

    if (is_new) return;

    const chunkSize = 10000;
    const chunks = content.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];

    if (!chunks.length) return;

    const embeddingsArray = await embeddings.embedDocuments(chunks);

    const { error: deleteChunksError } = await client
      .from("documents")
      .delete()
      .eq("note_id", note_id)
      .eq("full_note", false);

    if (deleteChunksError) throw new Error("Error deleting existing chunks");

    const chunkInserts = [];
    let charCounter = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddingsArray[i];

      const from = charCounter + 1;
      const to = charCounter + chunk.length;
      charCounter += chunk.length;

      const chunkMetadata = { loc: { chars: { from, to } } };

      chunkInserts.push({
        note_id,
        note_title,
        content: chunk,
        embedding,
        metadata: chunkMetadata,
        tags,
        full_note: false,
        date_created: new Date().toISOString(),
        is_new: false,
        notebook,
      });
    }

    const { error: chunkInsertError } = await client
      .from("documents")
      .insert(chunkInserts);

    if (chunkInsertError) throw new Error("Error inserting chunks into the database");
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
}

export async function deleteNote(note_id: string, noteType: string): Promise<void> {
  try {
    const table = noteType === 'handwritten' ? 'writtenNotes' : 'documents';
    const { error } = await client
      .from(table)
      .update({ is_deleted: true })
      .eq("note_id", note_id);
    if (error) throw new Error(`Error deleting note: ${error.message}`);
  } catch (error) {
    console.error("Error in deleteNote:", error);
    throw error;
  }
}

export async function getDeletedNotes(userId: string): Promise<any[]> {
  try {
    const { data: markdownNotes, error: markdownError } = await client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', true);

    if (markdownError) throw new Error(`Error retrieving deleted markdown notes: ${markdownError.message}`);

    const { data: handwrittenNotes, error: handwrittenError } = await client
      .from('writtenNotes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', true);

    if (handwrittenError) throw new Error(`Error retrieving deleted handwritten notes: ${handwrittenError.message}`);

    return [...(markdownNotes || []), ...(handwrittenNotes || [])];
  } catch (error) {
    console.error("Error in getDeletedNotes:", error);
    throw error;
  }
}

export async function createNotebook(name: string, userId: string): Promise<void> {
  try {
    const { error } = await client
      .from('notebooks')
      .insert([{ name, user_id: userId }]);
    if (error) throw new Error(`Error creating notebook: ${error.message}`);
  } catch (error) {
    console.error("Error in createNotebook:", error);
    throw error;
  }
}

export async function getAllNotebooks(userId: string): Promise<any[]> {
  try {
    const { data, error } = await client
      .from('notebooks')
      .select('name')
      .eq('user_id', userId);
    if (error) throw new Error(`Error retrieving notebooks: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Error in getAllNotebooks:", error);
    throw error;
  }
}

export async function getNotesForNotebook(notebookName: string, userId: string): Promise<any[]> {
  try {
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('notebook', notebookName)
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throw new Error(`Error retrieving notes for notebook: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Error in getNotesForNotebook:", error);
    throw error;
  }
}

export async function saveStrokesToDatabase(
  strokes: number[][][],
  noteContent: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await client.from("writtenNotes").insert([
      {
        user_id: userId,
        strokesData: strokes,
        noteContent,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw new Error(`Error saving strokes and note content: ${error.message}`);
  } catch (error) {
    console.error("Error in saveStrokesToDatabase:", error);
    throw error;
  }
}

export async function saveHandWrittenNote(note_title: string, content: string, tags: string[], notebook: string, userId: string): Promise<void> {
  try {
    const noteId = uuidv4();

    const { error } = await client.from('writtenNotes').insert([
      {
        user_id: userId,
        note_title,
        noteContent: content,
        note_id: noteId,
        created_at: new Date().toISOString(),
        tags,
        is_new: true,
        notebook,
        noteType: "handwritten",
      },
    ]);

    if (error) throw new Error(`Error saving full note: ${error.message}`);
  } catch (error) {
    console.error("Error in saveHandWrittenNote:", error);
    throw error;
  }
}

export async function updateWrittenNote(
  note_id: string,
  note_title: string,
  content: string,
  tags: string[],
  is_new: boolean,
  notebook: string,
  strokesData?: any
) {
  const { error } = await client
    .from("writtenNotes")
    .update({
      note_title,
      noteContent: content,
      tags,
      is_new,
      notebook,
      strokesData: strokesData || null,
    })
    .eq("note_id", note_id);

  if (error) {
    console.error("Error updating note:", error);
    throw error;
  }
}

export const updateIsQuizableMD = async (noteId: string, isQuizable: boolean) => {
  try {
    const { error } = await client
      .from("documents")
      .update({ is_quizable: isQuizable })
      .eq("note_id", noteId);

    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    console.error("Error in updateIsQuizable:", error);
    return false;
  }
};

export async function updateNotTrash(note_id: string): Promise<void> {
  try {
    const { error: fullNoteError } = await client
      .from("documents")
      .update({ is_deleted: false })
      .eq("note_id", note_id)
      .eq("full_note", true);

    if (fullNoteError) throw new Error(`Error updating full note: ${fullNoteError.message}`);
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
}
