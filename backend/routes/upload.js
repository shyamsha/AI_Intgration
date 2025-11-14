const fs = require("fs");
const express = require("express");
const multer = require("multer");
const path = require("path");
const pdfProcessor = require("../services/pdfProcessor");
const vectorStore = require("../services/vectorStore");

const router = express.Router();
// Configure multer for file upload
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Only PDF files allowed")),
});
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = path.join(__dirname, "../uploads");
//     try {
//       fs.mkdir(uploadDir, { recursive: true });
//       cb(null, uploadDir);
//     } catch (error) {
//       cb(error);
//     }
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(
//       null,
//       file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
//     );
//   },
// });
// const upload = multer({
//   storage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === "application/pdf") {
//       cb(null, true);
//     } else {
//       cb(new Error("Only PDF files are allowed"));
//     }
//   },
// });
router.post("/upload", upload.single("file"), async (req, res) => {
  // Save file and respond with a simple success. In a real implementation you'd vectorize & parse the PDF here.
  if (!req.file) return res.status(400).json({ error: "no file uploaded" });
  // Move to original filename for convenience
  // const target = path.join(__dirname, "uploads/", req.file.originalname);
  // console.log("📄 Uploading file:", req.file);
  // fs.rename(req.file.path, target, async (err) => {
  //   if (err) {
  //     console.error(err);
  //     return res.status(500).json({ error: "move failed" });
  //   }
  //   try {
  //     const pdfData = await pdfProcessor.extractText(target);
  //     const chunks = pdfProcessor.chunkText(pdfData.text);
  //     vectorStore.addDocuments(chunks);
  //     await fs.unlink(req.file.path); // Clean up temp file
  //     // pretend processing time
  //     setTimeout(() => {
  //       res.json({
  //         success: true,
  //         filename: req.file.originalname,
  //         numPages: pdfData.numPages,
  //         chunks: chunks.length,
  //         message: "PDF uploaded and processed successfully",
  //       });
  //     }, 600);
  //   } catch (error) {
  //     console.error("error processing PDF:", error);
  //     if (req.file) {
  //       try {
  //         await fs.unlink(req.file.path);
  //       } catch (unlinkError) {
  //         console.error("Error deleting file:", unlinkError);
  //       }
  //     }

  //     res.status(500).json({
  //       error: "Failed to process PDF",
  //       message: error.message,
  //     });
  //   }
  // });
  // at top: const fs = require('fs'); const path = require('path');
  // inside your route handler (async)
  const uploadsDir = path.join(__dirname, "..", "uploads"); // adjust if your uploads folder is elsewhere
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  // req.file.path is where multer stored the temp file (absolute or relative to CWD).
  // Normalize it to an absolute path to be safe:
  const srcPath = path.isAbsolute(req.file.path)
    ? req.file.path
    : path.join(process.cwd(), req.file.path);

  // sanitize original name for filesystem safety
  const safeBase = req.file.originalname.replace(/[\/\\?%*:|"<>]/g, "-").trim();
  const targetPath = path.join(uploadsDir, `${Date.now()}-${safeBase}`);

  try {
    // Move the file (atomic rename where possible)
    await fs.promises.rename(srcPath, targetPath);

    // Now process the PDF from targetPath
    const pdfData = await pdfProcessor.extractText(targetPath);
    const chunks = pdfProcessor.chunkText(pdfData.text);
    await vectorStore.addDocuments(chunks);

    // Clean up the moved file when done
    try {
      await fs.promises.unlink(targetPath);
    } catch (e) {
      console.warn("Failed to delete moved file:", e);
    }

    // respond
    res.json({
      success: true,
      filename: req.file.originalname,
      numPages: pdfData.numPages,
      chunks: chunks.length,
      message: "PDF uploaded and processed successfully",
    });
  } catch (err) {
    console.error("Error moving/processing file:", err);
    // Try to remove src if it still exists
    try {
      if (await fileExists(srcPath)) await fs.promises.unlink(srcPath);
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }
    res
      .status(500)
      .json({ error: "Failed to process PDF", message: err.message });
  }

  // helper
  async function fileExists(p) {
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  }
});
module.exports = router;
