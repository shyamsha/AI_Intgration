const express = require("express");
const cors = require("cors");
require("dotenv").config();

const uploadRoute = require("./routes/upload");
const chatRoute = require("./routes/chat");
const app = express();
app.use(cors());
app.use(express.json());
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Routes
app.use("/api", uploadRoute);
app.use("/api", chatRoute);

app.get("/", (req, res) => res.send("NotebookLM backend running"));
// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

app.listen(process.env.PORT || 4000, () =>
  console.log(
    `Server listening on http://localhost:${process.env.PORT || 4000}`
  )
);
