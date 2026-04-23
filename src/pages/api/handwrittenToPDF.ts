"use server";
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs";
import path from "path";

/**
 * Converts strokes into a PDF file and returns a Blob.
 * @param strokes - Array of strokes where each stroke is an array of [x, y] coordinates.
 * @returns A Blob representing the PDF file.
 */

/**
 * Converts strokes into a PDF Blob.
 * @param strokes - Array of strokes where each stroke is an array of [x, y] coordinates.
 * @returns A Blob representing the PDF file.
 */
export const strokesToPDF = (strokes: number[][][]): Blob => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context.");
  }

  const canvasWidth = 1000;
  const canvasHeight = 1400;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  strokes.forEach((stroke) => {
    ctx.beginPath();
    stroke.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [canvasWidth, canvasHeight],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvasWidth, canvasHeight);
  return pdf.output("blob");
};