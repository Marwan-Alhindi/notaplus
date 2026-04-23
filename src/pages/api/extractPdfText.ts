// import formidable from "formidable";
// import fs from "fs/promises";
// import AWS from "aws-sdk";

// export const config = {
//   api: {
//     bodyParser: false, // Disable Next.js body parsing
//   },
// };

// // AWS Textract Configuration
// const textract = new AWS.Textract({
//   region: "us-east-1", // Replace with your region
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// /**
//  * Extracts text from a PDF using AWS Textract.
//  * @param {Buffer} pdfBuffer - Buffer containing the PDF file.
//  */
// async function extractTextFromPDF(pdfBuffer) {
//   const params = {
//     Document: {
//       Bytes: pdfBuffer,
//     },
//     FeatureTypes: ["FORMS"], // Optional: Extract forms, tables, etc.
//   };

//   console.log("Sending PDF to AWS Textract...");
//   const response = await textract.analyzeDocument(params).promise();
//   console.log("Received response from AWS Textract.", response);
//   const extractedText = response.Blocks?.filter((block) => block.Text) // Keep blocks with Text
//   .map((block) => block.Text) // Extract the Text value
//   .join("\n"); // Join all text into a single string

//   return extractedText || "No text found.";
// }

// /**
//  * API route for extracting handwritten text from a PDF file.
//  */
// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed." });
//   }

//   const form = formidable({ keepExtensions: true });

//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       console.error("Error parsing form:", err);
//       return res.status(500).json({ error: "Failed to parse form." });
//     }

//     const uploadedFile = files["file"]?.[0]?.filepath;

//     if (!uploadedFile) {
//       return res.status(400).json({ error: "No valid file uploaded." });
//     }

//     try {
//       // console.log("Uploaded File Path:", uploadedFile);

//       // Read PDF file as a buffer
//       const pdfBuffer = await fs.readFile(uploadedFile);

//       // Extract text using AWS Textract
//       const extractedText = await extractTextFromPDF(pdfBuffer);
//       // Cleanup uploaded file
//       await fs.unlink(uploadedFile);

//       // Return extracted text
//       return res.status(200).json({ text: extractedText });
//     } catch (error) {
//       console.error("Error processing PDF with Textract:", error);
//       return res.status(500).json({ error: "Failed to extract text from PDF." });
//     }
//   });
// }