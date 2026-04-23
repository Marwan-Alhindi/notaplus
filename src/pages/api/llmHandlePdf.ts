import type { NextApiRequest, NextApiResponse } from "next";
import { processPDF } from "@/server/llmHandlePdf";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pdfData } = req.body ?? {};

  if (typeof pdfData !== "string") {
    return res.status(400).json({ error: "pdfData (string) is required" });
  }

  try {
    const result = await processPDF(pdfData);
    return res.status(200).json({ result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
