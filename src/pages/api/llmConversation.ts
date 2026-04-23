import type { NextApiRequest, NextApiResponse } from "next";
import { progressConversation } from "@/server/llmConversation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, userId } = req.body ?? {};

  if (typeof question !== "string" || typeof userId !== "string") {
    return res.status(400).json({ error: "question and userId are required" });
  }

  try {
    const result = await progressConversation(question, userId);
    return res.status(200).json({ result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
