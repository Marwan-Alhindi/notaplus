"use server";
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Import the centralized Supabase client
import client from '@/utils/supabase/supabaseClient';

// Keys and Clients
const openAIApiKey: string = process.env.OPENAI_API_KEY || '';

const embeddings = new OpenAIEmbeddings({ openAIApiKey });

// Vector Store and Retriever
const vectorStore = new SupabaseVectorStore(embeddings, {
  client,
  tableName: 'documents',
  queryName: 'match_documents',
});

const retriever = vectorStore.asRetriever();

export { retriever };

// Function to Split Text into Smaller Chunks
// ------------------------------------------------------------

// Function to Split Text into Smaller Chunks
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
    // Generate a unique ID for the note
    const noteId = uuidv4();

    // Split the note into smaller chunks
    const chunks = splitTextIntoChunks(content);

    // Generate embeddings for all chunks
    const embeddingsArray = await embeddings.embedDocuments(chunks);

    let lineCounter = 1; // Keeps track of line numbers for metadata

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddingsArray[i];

      // Create metadata for each chunk
      const chunkLines = chunk.split("\n");
      const metadata = {
        loc: {
          lines: {
            from: lineCounter,
            to: lineCounter + chunkLines.length - 1,
          },
        },
      };

      // Save the chunk and metadata to the database
      const { error } = await client.from("documents").insert([
        {
          user_id: userId,          // Include the user ID
          note_title, // Include the note title
          content: chunk,
          embedding,
          metadata,
          note_id: noteId, // Assign the note ID to each chunk
          full_note: false,
          date_created: new Date().toISOString(), // Add the current date and time
          tags,
          notebook: notebook,
          noteType: "markdown",
        },
      ]);

      if (error) {
        console.error("Error saving chunk:", error);
        throw new Error(`Error saving chunk: ${error.message}`);
      }

      // Update line counter for the next chunk
      lineCounter += chunkLines.length;
    }

  } catch (error) {
    console.error("Error saving note in chunks:", error);
    throw error;
   }
}

export async function saveFullNote(note_title: string, note_id:string, content: string, tags: string[], notebook: string, userId: string ): Promise<void> {
  try {
    console.log('saveFullNote triggered!')
    

    // Generate embedding for the full content if content is not empty, otherwise use default embedding
    let embedding;
    if (content.trim()) {
      [embedding] = await embeddings.embedDocuments([content]);
    } else {
      embedding = new Array(1536).fill(0); // Default embedding with 1536 dimensions
    }

    // Create metadata including note_id
    const metadata = {
      note_id: note_id,
    };

    // Save the full note to the database with full_note set to TRUE
    const { error } = await client.from('documents').insert([
      {
        user_id: userId,
        note_title, // Include the note title
        content,
        embedding,
        metadata,        // Include metadata with note_id
        note_id: note_id, // If you have a separate note_id column
        full_note: true,
        date_created: new Date().toISOString(), // Add the current date and time
        tags, // Include tags
        is_new: true,
        notebook: notebook,
        noteType: "markdown",
      },
    ]);

    if (error) {
      console.error("Error saving full note:", error);
      throw new Error(`Error saving full note: ${error.message}`);
    }

  } catch (error) {
    console.error("Error in saveFullNote:", error);
    throw error;
  }
}


// export async function getAllFullNotes(userId: string): Promise<any[]> {
//   try {
//     // Query the database for full notes belonging to the specified user
//     const { data, error } = await client
//       .from('documents')
//       .select('note_id, note_title, date_created, tags, content, is_new, notebook, noteType')
//       .eq('full_note', true) // Filter only full notes
//       .eq('user_id', userId); // Ensure it matches the logged-in user's ID

//     console.log('yo')
//     console.log(data)
//     return data || [];
//   } catch (error) {
//     console.error("Error in getAllFullNotes:", error);
//     throw error;
//   }
// }

export async function getAllFullNotes(userId: string): Promise<any[]> {
  try {
    // Query the 'documents' table for full notes
    const { data: documentsData, error: documentsError } = await client
      .from('documents')
      .select('note_id, note_title, date_created, tags, content, is_new, notebook, noteType')
      .eq('full_note', true) // Filter only full notes
      .eq('user_id', userId)
      .or('is_deleted.eq.false,is_deleted.is.null'); 

    if (documentsError) {
      console.error("Error fetching from documents table:", documentsError);
      throw documentsError;
    }

    // Query the 'writtenNotes' table for handwritten notes
    const { data: writtenNotesData, error: writtenNotesError } = await client
      .from('writtenNotes')
      .select('note_id, note_title, created_at, tags, noteContent, is_new, notebook, noteType, strokesData')
      .eq('user_id', userId)
      .or('is_deleted.eq.false,is_deleted.is.null'); 

    if (writtenNotesError) {
      console.error("Error fetching from writtenNotes table:", writtenNotesError);
      throw writtenNotesError;
    }

    // Combine results from both tables
    const combinedData = [
      ...(documentsData || []), 
      ...(writtenNotesData || [])
    ];
    return combinedData;
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
      .eq('user_id', userId) // Filter by the logged-in user's ID
      .neq('tags', null);    // Ensure tags are not null

    if (error) {
      console.error("Error retrieving tags:", error);
      throw new Error(`Error retrieving tags: ${error.message}`);
    }

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
  

    // Retrieve relevant documents based on the question
    const relevantDocs = await retriever.getRelevantDocuments(question);

    // Filter documents by userId
    const userSpecificDocs = relevantDocs.filter(
      (doc) => doc.metadata.user_id === userId
    );

    if (userSpecificDocs.length === 0) {
      console.warn("No relevant documents found for the user.");
      return null;
    }

    // Extract note IDs from user-specific documents
    const note_ids = userSpecificDocs.map((doc) => doc.metadata.note_id);

    // Get the most relevant note_id
    const mostRelevantNoteId = note_ids.length > 0 ? note_ids[0] : null;

    if (mostRelevantNoteId) {
      console.log("Querying database with:", {
        note_id: mostRelevantNoteId,
        user_id: userId,
      });

      const { data: requiredData, error } = await client
        .from("documents")
        .select("note_title, content, tags, note_id")
        .eq("note_id", mostRelevantNoteId) // Filter by the most relevant note ID
        .eq("user_id", userId) // Filter by user ID
        .eq("full_note", true) // Ensure it's a full note
        .single();

      if (error) {
        console.error("Database error:", error);
        throw new Error("Failed to retrieve the full note.");
      }

      return requiredData;
    }

    console.warn("No relevant note_id found for the user.");
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
  if (!note_id) {
    throw new Error("Note ID is required to update the note");
  }

  try {
    // Ensure content is a string
    content = content || "";

    // Update full note embedding
    let fullNoteEmbedding;
    if (content.trim()) {
      [fullNoteEmbedding] = await embeddings.embedDocuments([content]);
    } else {
      fullNoteEmbedding = new Array(1536).fill(0);
    }

    const fullNoteMetadata = { note_id };
    
    // Update full note
    const { error: fullNoteError } = await client
      .from("documents")
      .update({
        note_title,
        content,
        embedding: fullNoteEmbedding,
        metadata: fullNoteMetadata,
        tags,
        is_new: false, // Mark note as no longer new
        notebook: notebook
      })
      .eq("note_id", note_id)
      .eq("full_note", true);

    if (fullNoteError) {
      console.error("Error updating full note:", fullNoteError);
      throw new Error(`Error updating full note: ${fullNoteError.message}`);
    } else {
      // console.log("Full note updated successfully.");
    }

    // Skip chunk processing for new notes
    if (is_new) {
      // console.log("Note is new, skipping chunk creation.");
      return;
    }

    // Split content into manageable chunks
    const chunkSize = 10000; // Define max chunk size
    const chunks = content.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];

    if (!chunks.length) {
      console.warn("No content to chunk.");
      return;
    }

    // Generate embeddings for chunks
    const embeddingsArray = await embeddings.embedDocuments(chunks);

    // Delete existing chunks (if any)
    const { error: deleteChunksError } = await client
      .from("documents")
      .delete()
      .eq("note_id", note_id)
      .eq("full_note", false);

    if (deleteChunksError) {
      console.error("Error deleting existing chunks:", deleteChunksError);
      throw new Error("Error deleting existing chunks");
    }

    // Insert new chunks in batch
    const chunkInserts = [];
    let charCounter = 0; // Initialize character counter
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddingsArray[i];

      // Calculate character-level offsets
      const from = charCounter + 1; // Start character (1-indexed)
      const to = charCounter + chunk.length; // End character (inclusive)
      charCounter += chunk.length; // Update counter for the next chunk

      const chunkMetadata = {
        loc: {
          chars: {
            from,
            to,
          },
        },
      };

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
        notebook: notebook
      });
    }

    const { error: chunkInsertError } = await client
      .from("documents")
      .insert(chunkInserts);

    if (chunkInsertError) {
      console.error("Error inserting chunks:", chunkInsertError);
      throw new Error("Error inserting chunks into the database");
    }

    
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
      .update({is_deleted: true })
      .eq("note_id", note_id);
    if (error) {
      console.error(`Error deleting note from ${table}:`, error);
      throw new Error(`Error deleting note: ${error.message}`);
    }
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

    if (markdownError) {
      console.error("Error retrieving deleted markdown notes:", markdownError);
      throw new Error(`Error retrieving deleted markdown notes: ${markdownError.message}`);
    }

    const { data: handwrittenNotes, error: handwrittenError } = await client
      .from('writtenNotes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', true);

    if (handwrittenError) {
      console.error("Error retrieving deleted handwritten notes:", handwrittenError);
      throw new Error(`Error retrieving deleted handwritten notes: ${handwrittenError.message}`);
    }

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
    if (error) {
      console.error("Error creating notebook:", error);
      throw new Error(`Error creating notebook: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in createNotebook:", error);
    throw error;
  }
}

// Function to get all notebooks for a specific user
export async function getAllNotebooks(userId: string): Promise<any[]> {
  try {
    const { data, error } = await client
      .from('notebooks')
      .select('name')
      .eq('user_id', userId); // Filter by user ID
    if (error) {
      console.error("Error retrieving notebooks:", error);
      throw new Error(`Error retrieving notebooks: ${error.message}`);
    }
    return data;
  } catch (error) {
    console.error("Error in getAllNotebooks:", error);
    throw error;
  }
}

// Function to get notes for a specific notebook and user
export async function getNotesForNotebook(notebookName: string, userId: string): Promise<any[]> {
  try {
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('notebook', notebookName)
      .eq('user_id', userId)
      .eq('is_deleted', false);
      
    if (error) {
      console.error("Error retrieving notes for notebook:", error);
      throw new Error(`Error retrieving notes for notebook: ${error.message}`);
    }
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
        strokesData: strokes, // Store the strokes vector
        noteContent,          // Store the extracted text content
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Error saving strokes and note content:", error);
      throw new Error(`Error saving strokes and note content: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in saveStrokesToDatabase:", error);
    throw error;
  }
}

export async function saveHandWrittenNote(note_title: string, content: string, tags: string[], notebook: string, userId: string ): Promise<void> {
  try {
    // Generate a unique ID for the note
    const noteId = uuidv4();

    // Save the full note to the database with full_note set to TRUE
    const { error } = await client.from('writtenNotes').insert([
      {
        user_id: userId,
        note_title, // Include the note title
        noteContent: content,
        note_id: noteId, // If you have a separate note_id column
        created_at: new Date().toISOString(), // Add the current date and time
        tags, // Include tags
        is_new: true,
        notebook: notebook,
        noteType: "handwritten"
      },
    ]);

    if (error) {
      console.error("Error saving full note:", error);
      throw new Error(`Error saving full note: ${error.message}`);
    }

  } catch (error) {
    console.error("Error in saveFullNote:", error);
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
  strokesData?: any // Add this
) {
  const { error } = await client
    .from("writtenNotes")
    .update({
      note_title,
      noteContent: content,
      tags,
      is_new,
      notebook,
      strokesData: strokesData || null, // Explicitly store strokesData
    })
    .eq("note_id", note_id);

  if (error) {
    console.error("Error updating note:", error);
    throw error;
  }
}


// export async function updateHandWrittenNote(
//   note_id: string,
//   note_title: string,
// ): Promise<void> {
//   try {
//     const { error } = await client
//       .from("writtenNotes")
//       .update({
//         note_title
//       })
//       .eq("note_id", note_id);

//     if (error) {
//       console.error("Error updating handwritten note:", error);
//       throw new Error(`Error updating handwritten note: ${error.message}`);
//     }
//     console.log("Handwritten note updated successfully!");
//   } catch (error) {
//     console.error("Error in updateHandWrittenNote:", error);
//     throw error;
//   }
// }


export const updateIsQuizableMD = async (noteId: string, isQuizable: boolean) => {
  try {
    const { error } = await client
      .from("documents") 
      .update({ is_quizable: isQuizable })
      .eq("note_id", noteId);

    if (error) {
      console.error("Error updating is_quizable column:", error);
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error("Error in updateIsQuizable:", error);
    return false;
  }
};


export async function updateNotTrash(
  note_id: string,

): Promise<void> {
    // Update full note
    try {
      const { error: fullNoteError } = await client
        .from("documents")
        .update({
          is_deleted: false
        })
        .eq("note_id", note_id)
        .eq("full_note", true);

      if (fullNoteError) {
        console.error("Error updating full note:", fullNoteError);
        throw new Error(`Error updating full note: ${fullNoteError.message}`);
      } else {
        // console.log("Full note updated successfully.");
      }    
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
}
