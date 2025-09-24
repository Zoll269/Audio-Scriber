import React, { useState } from 'react';
import type { Recording } from '../types';
import { ExportIcon } from './icons/PrintIcon'; // Renamed component, same file
import { SummaryIcon } from './icons/SummaryIcon';
import { ActionItemIcon } from './icons/ActionItemIcon';
import { HighlightsIcon } from './icons/HighlightsIcon';
import { TranscriptIcon } from './icons/TranscriptIcon';
import jsPDF from 'jspdf';
import Spinner from './Spinner';

interface TranscriptionDisplayProps {
  recording: Recording;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="mb-8 print:break-inside-avoid-page">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
);

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ recording }) => {
  const { transcription } = recording;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!transcription) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
      };
      
      const FONT_SIZES = {
        h1: 20,
        h2: 16,
        body: 12,
        small: 10,
      };
      const LINE_HEIGHT_RATIO = 1.4;
      const getLineHeight = (size: number) => size * 0.35 * LINE_HEIGHT_RATIO;

      // === Document Header ===
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_SIZES.h1);
      const titleLines = doc.splitTextToSize(recording.name, usableWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * getLineHeight(FONT_SIZES.h1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_SIZES.small);
      doc.setTextColor(128, 128, 128); // Gray
      y += 2;
      doc.text(`Recorded on: ${new Date(recording.date).toLocaleString()}`, margin, y);
      y += getLineHeight(FONT_SIZES.small) + 10; // Extra space
      doc.setTextColor(0, 0, 0); // Reset color

      // === Helper function to render sections ===
      const renderSection = (title: string, content: () => void) => {
          checkPageBreak(getLineHeight(FONT_SIZES.h2) + 5);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(FONT_SIZES.h2);
          doc.text(title, margin, y);
          y += getLineHeight(FONT_SIZES.h2) + 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(FONT_SIZES.body);
          content();
          y += 10; // Space after section
      };

      // === Summary ===
      renderSection('Summary', () => {
          const summaryLines = doc.splitTextToSize(transcription.summary, usableWidth);
          const summaryHeight = summaryLines.length * getLineHeight(FONT_SIZES.body);
          checkPageBreak(summaryHeight);
          doc.text(summaryLines, margin, y);
          y += summaryHeight;
      });

      // === Action Items ===
      if (transcription.actionItems.length > 0) {
        renderSection('Action Items', () => {
          transcription.actionItems.forEach(item => {
            const itemLines = doc.splitTextToSize(item, usableWidth - 6);
            const itemHeight = itemLines.length * getLineHeight(FONT_SIZES.body);
            checkPageBreak(itemHeight + 2);
            doc.text('•', margin, y);
            doc.text(itemLines, margin + 6, y);
            y += itemHeight + 2;
          });
        });
      }

      // === Key Highlights ===
      if (transcription.highlights.length > 0) {
        renderSection('Key Highlights', () => {
          transcription.highlights.forEach(item => {
            const itemLines = doc.splitTextToSize(item, usableWidth - 6);
            const itemHeight = itemLines.length * getLineHeight(FONT_SIZES.body);
            checkPageBreak(itemHeight + 2);
            doc.text('•', margin, y);
            doc.text(itemLines, margin + 6, y);
            y += itemHeight + 2;
          });
        });
      }
      
      // === Full Transcript ===
      renderSection('Full Transcript', () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZES.small);
        const transcriptLines = doc.splitTextToSize(transcription.rawTranscript, usableWidth);
        transcriptLines.forEach((line: string) => {
            const lineHeight = getLineHeight(FONT_SIZES.small);
            checkPageBreak(lineHeight);
            doc.text(line, margin, y);
            y += lineHeight;
        });
      });

      const sanitizedName = recording.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'transcription';
      doc.save(`${sanitizedName}.pdf`);

    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Sorry, an error occurred while exporting to PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!transcription) {
    return (
      <div className="text-center text-slate-500">
        <p>No transcription available for this recording.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex-grow">
          <p className="text-sm text-slate-500">
            Recorded on: {new Date(recording.date).toLocaleString()}
          </p>
          {recording.audioUrl && (
             <audio controls src={recording.audioUrl} className="mt-2 h-10 w-full max-w-sm"></audio>
          )}
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-2 w-40 bg-slate-600 text-white font-sans font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 disabled:cursor-wait"
        >
          {isExporting ? (
            <>
              <Spinner className="h-5 w-5 border-white/50 border-b-white" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <ExportIcon />
              <span>Export to PDF</span>
            </>
          )}
        </button>
      </div>

      <div className="prose max-w-none prose-p:text-slate-700 prose-li:text-slate-700 prose-headings:text-slate-900">
          <Section title="Summary" icon={<SummaryIcon />}>
              <p className="text-base leading-relaxed">{transcription.summary}</p>
          </Section>

          <Section title="Action Items" icon={<ActionItemIcon />}>
              {transcription.actionItems.length > 0 ? (
                  <ul className="list-none p-0 space-y-2">
                      {transcription.actionItems.map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="text-indigo-500 mt-1">&#10003;</span>
                            <span>{item}</span>
                          </li>
                      ))}
                  </ul>
              ) : (
                  <p className="text-slate-500 italic">No action items were identified.</p>
              )}
          </Section>

          <Section title="Key Highlights" icon={<HighlightsIcon />}>
              {transcription.highlights.length > 0 ? (
                  <ul className="list-none p-0 space-y-2">
                      {transcription.highlights.map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                             <span className="text-indigo-500 mt-1">&#9733;</span>
                             <span>{item}</span>
                          </li>
                      ))}
                  </ul>
              ) : (
                   <p className="text-slate-500 italic">No key highlights were identified.</p>
              )}
          </Section>
          
          <Section title="Full Transcript" icon={<TranscriptIcon />}>
              <div className="bg-slate-50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap text-slate-600 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible print:bg-transparent">
                {transcription.rawTranscript}
              </div>
          </Section>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;