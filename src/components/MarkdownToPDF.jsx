"use client";
import { useRef } from "react";
import html2pdf from "html2pdf.js";

export default function MarkdownToPDF({ htmlContent }) {
  const contentRef = useRef();

  const generatePDF = () => {
    const opt = {
      margin:       [28, 28, 28, 28],    // 28pt ≈ 0.39" margins
      filename:     "activity.pdf",
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: "pt", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(contentRef.current).save();
  };

  return (
    <div className="space-y-2">
     
    </div>
  );
}
