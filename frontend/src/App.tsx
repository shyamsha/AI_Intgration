import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import styles from "./styles";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import axios from "axios";
pdfjs.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface Citation {
  page: number;
  snippet: string;
}

interface PDFDocument {
  name: string;
  file: File;
  numPages: number;
}

const App: React.FC = () => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [numPages, setNumPages] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
    setIsUploading(false);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    const BACKEND_UPLOAD_URL = "http://localhost:4000/api/upload";
    const form = new FormData();
    form.append("file", file);

    try {
      await axios.post(BACKEND_UPLOAD_URL, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (e) {
      console.warn("Upload failed or backend not available, simulating...", e);
    }
    // simulate quick processing before showing viewer (you had a timeout)
    setTimeout(() => {
      // revoke previous url if any
      if (fileUrl) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch (err) {
          /* noop */
        }
      }

      const url = URL.createObjectURL(file);
      setFileUrl(url);
      console.log("Created object URL for PDF:", url, file);
      setPdfDoc({
        name: file.name,
        file: file,
        numPages: 0,
      });

      setMessages([
        {
          id: "1",
          role: "assistant",
          content: `I've successfully processed "${file.name}". You can now ask me questions about the document. I'll provide answers with citations to specific pages.`,
          timestamp: new Date(),
        },
      ]);

      setIsUploading(false);
    }, 500);
  };

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (fileUrl) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch (err) {}
      }
    };
  }, [fileUrl]);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file)
      handleFileUpload(file as unknown as ChangeEvent<HTMLInputElement>);
  };

  const generateResponse = (): Message => {
    const responses: Array<{ content: string; citations: Citation[] }> = [
      {
        content: `Based on the document, this topic is discussed in detail. The key points include implementation strategies, best practices, and performance considerations.`,
        citations: [
          { page: 3, snippet: "Implementation strategies for optimal results" },
          {
            page: 7,
            snippet: "Performance benchmarks and optimization techniques",
          },
        ],
      },
      {
        content: `The document provides comprehensive information on this subject. Several methodologies are outlined with practical examples and case studies.`,
        citations: [
          { page: 12, snippet: "Methodology overview and framework" },
          { page: 15, snippet: "Real-world case study analysis" },
        ],
      },
      {
        content: `This is explained through multiple sections. The document covers theoretical foundations, practical applications, and future directions in this area.`,
        citations: [
          { page: 5, snippet: "Theoretical foundations and principles" },
          { page: 9, snippet: "Practical implementation examples" },
          { page: 18, snippet: "Future research directions" },
        ],
      },
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: randomResponse.content,
      citations: randomResponse.citations,
      timestamp: new Date(),
    };
  };

  const handleSendMessage = (): void => {
    if (!inputValue.trim() || !pdfDoc || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse = generateResponse();
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleCitationClick = (page: number): void => {
    setCurrentPage(page);
    if (pdfContainerRef.current) {
      pdfContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClearDocument = (): void => {
    setPdfDoc(null);
    setMessages([]);
    setCurrentPage(1);
    setNumPages(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const goToPrevPage = (): void => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = (): void => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };
  useEffect(() => {
    console.log(
      "pdfjs worker src:",
      (pdfjs as any).GlobalWorkerOptions?.workerSrc
    );
    // test worker is reachable (network will show request)
    fetch((pdfjs as any).GlobalWorkerOptions?.workerSrc, { method: "HEAD" })
      .then((r) => console.log("worker HEAD status:", r.status))
      .catch((e) => console.warn("worker fetch failed:", e));
  }, []);

  return (
    <div style={styles.container}>
      {/* Chat Section */}
      <div style={styles.chatSection}>
        <div style={styles.chatHeader}>
          <h2 style={styles.chatHeaderTitle}>Chat with Document</h2>
          <p style={styles.chatHeaderText}>Ask questions about your PDF</p>
        </div>

        <div style={styles.chatMessages}>
          {!pdfDoc && (
            <div style={styles.chatEmpty}>
              <div style={styles.chatEmptyContent}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.chatEmptyIcon}
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p>Upload a PDF to start asking questions</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              style={
                message.role === "user"
                  ? styles.messageUser
                  : styles.messageAssistant
              }
            >
              <div
                style={
                  message.role === "user"
                    ? styles.messageContentUser
                    : styles.messageContentAssistant
                }
              >
                <p style={styles.messageText}>{message.content}</p>

                {message.citations && message.citations.length > 0 && (
                  <div style={styles.citations}>
                    {message.citations.map((citation, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCitationClick(citation.page)}
                        style={styles.citationBtn}
                      >
                        <svg
                          style={styles.citationIcon}
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <div style={styles.citationContent}>
                          <div style={styles.citationPage}>
                            Page {citation.page}
                          </div>
                          <div style={styles.citationSnippet}>
                            {citation.snippet}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={styles.messageAssistant}>
              <div style={styles.messageContentAssistant}>
                <div style={styles.loader}></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div style={styles.chatInputContainer}>
          <div style={styles.chatInputWrapper}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                pdfDoc
                  ? "Ask a question about the document..."
                  : "Upload a PDF first..."
              }
              disabled={!pdfDoc || isLoading}
              style={
                !pdfDoc || isLoading
                  ? styles.chatInputDisabled
                  : styles.chatInput
              }
            />
            <button
              onClick={handleSendMessage}
              disabled={!pdfDoc || !inputValue.trim() || isLoading}
              style={
                !pdfDoc || !inputValue.trim() || isLoading
                  ? styles.sendBtnDisabled
                  : styles.sendBtn
              }
            >
              {isLoading ? (
                <div style={styles.loaderSmall}></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer Section */}
      <div style={styles.pdfSection}>
        <div style={styles.pdfHeader}>
          <div style={styles.pdfHeaderTop}>
            <h2 style={styles.pdfHeaderTitle}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Document Viewer
            </h2>
            {pdfDoc && (
              <button onClick={handleClearDocument} style={styles.clearBtn}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear
              </button>
            )}
          </div>
          {pdfDoc && numPages > 0 && (
            <div style={styles.pdfInfo}>
              <div style={styles.filename}>{pdfDoc.name}</div>
              <div style={styles.pageInfo}>
                <div style={styles.pageNavigation}>
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    style={
                      currentPage <= 1 ? styles.navBtnDisabled : styles.navBtn
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span>
                    Page {currentPage} of {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage >= numPages}
                    style={
                      currentPage >= numPages
                        ? styles.navBtnDisabled
                        : styles.navBtn
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.pdfContent} ref={pdfContainerRef}>
          {!pdfDoc && !isUploading && (
            <div style={styles.uploadPrompt}>
              <div style={styles.uploadIcon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 style={styles.uploadTitle}>Upload PDF to start chatting</h3>
              <p style={styles.uploadText}>
                Click or drag and drop your file here
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={styles.hiddenInput}
                id="pdf-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              />
              <label htmlFor="pdf-upload" style={styles.uploadBtn}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose PDF File
              </label>
            </div>
          )}

          {isUploading && (
            <div style={styles.uploadingContainer}>
              <div style={styles.progressHeader}>
                <span style={styles.progressLabel}>Loading PDF</span>
                <span style={styles.progressLabel}>Please wait...</span>
              </div>
              <div style={styles.progressBar}>
                <div style={styles.progressFill}></div>
              </div>
              <p style={styles.progressText}>Processing document...</p>
            </div>
          )}

          {pdfDoc && !isUploading && (
            <div style={styles.pdfViewer}>
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div style={styles.loadingPdf}>
                    <div style={styles.loader}></div>
                    <p>Loading PDF...</p>
                  </div>
                }
                onLoadError={(err) => {
                  console.error("react-pdf load error:", err);
                  alert("Failed to load PDF — see console for details.");
                }}
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={Math.min(window.innerWidth * 0.45, 800)}
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
