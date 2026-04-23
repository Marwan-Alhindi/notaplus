"use server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  // Initialize formidable with options
  const form = formidable({
    multiples: false, // Only allow a single file upload
    keepExtensions: true, // Preserve file extensions
  }); 

  // Parse the uploaded file
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Failed to parse form." });
    }


    // Access the uploaded file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile || !uploadedFile.filepath) {
      return res.status(400).json({ error: "No valid file uploaded." });
    }

    const filePath = uploadedFile.filepath;


    try {
      // Verify the file path
      if (!fs.existsSync(filePath)) {
        console.error("File does not exist at the given path.");
        return res.status(404).json({ error: "File not found on server." });
      }

      // Use PDFLoader to process the uploaded PDF
      const loader = new PDFLoader(filePath);
      const documents = await loader.load();

      // Extract text from the loaded documents
      const textContent = documents.map((doc) => doc.pageContent).join("\n");


      return res.status(200).json({ text: textContent });
    } catch (error) {
      console.error("Error processing PDF with PDFLoader:", error);
      return res.status(500).json({ error: "Failed to process PDF." });
    } finally {
      // Cleanup: delete the temporary file after processing
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting temp file:", err);
        else console.log("Temporary file deleted:", filePath);
      });
    }
  });
}