const fs = require("fs");
const express = require("express");
const multer = require("multer");
const path = require("path");
const pdfProcessor = require("../services/pdfProcessor");
const vectorStore = require("../services/vectorStore");

const router = express.Router();
// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});
router.post("/upload", upload.single("pdf"), async (req, res) => {
  // Save file and respond with a simple success. In a real implementation you'd vectorize & parse the PDF here.
  if (!req.file) return res.status(400).json({ error: "no file uploaded" });
  // Move to original filename for convenience
  const target = path.join(__dirname, "uploads", req.file.originalname);

  fs.rename(req.file.path, target, async (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "move failed" });
    }
    try {
      const pdfData = await pdfProcessor.extractText(target);
      const chunks = pdfProcessor.chunkText(pdfData.text);
      vectorStore.addDocuments(chunks);
      await fs.unlink(req.file.path); // Clean up temp file
      // pretend processing time
      setTimeout(() => {
        res.json({
          success: true,
          filename: req.file.originalname,
          numPages: pdfData.numPages,
          chunks: chunks.length,
          message: "PDF uploaded and processed successfully",
        });
      }, 600);
    } catch (error) {
      console.error("error processing PDF:", error);
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }

      res.status(500).json({
        error: "Failed to process PDF",
        message: error.message,
      });
    }
  });
});
module.exports = router;
