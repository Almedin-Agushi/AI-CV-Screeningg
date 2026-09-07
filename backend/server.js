import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// Upload folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

let activeJobCriteria = null;
const candidates = [];

// Helpers
function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// Dummy readers (replace with real parsers if needed)
async function readPdfFile(filePath) { return fs.readFileSync(filePath, "utf8"); }
async function readDocxFile(filePath) { const result = await mammoth.extractRawText({ path: filePath }); return result.value; }
function readTxtFile(filePath) { return fs.readFileSync(filePath, "utf8"); }

// Experience extractor
function extractExperience(text) {
  if (!text) return [];
  return [{ position: "Experience", company: "Not parsed", description: text.slice(0,100), dates: "" }];
}

// Education extractor
function extractEducation(text) {
  if (!text) return [];
  return [{ degree: "Education", institution: "Not parsed", dates: "" }];
}

// Upload CV
app.post("/api/candidates/upload", upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No CV file uploaded." });
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let cvText = "";
    if (ext === ".pdf") cvText = await readPdfFile(filePath);
    else if (ext === ".docx") cvText = await readDocxFile(filePath);
    else if (ext === ".txt") cvText = readTxtFile(filePath);
    cvText = cleanText(cvText);

    const candidate = {
      candidateId: `candidate-${Date.now()}`,
      name: req.file.originalname,
      skills: [],
      experience: extractExperience(cvText),
      education: extractEducation(cvText),
      cvText,
      evaluation: null
    };

    candidates.push(candidate);
    res.status(201).json({ message: "CV uploaded successfully.", candidate });
  } catch (err) {
    res.status(200).json({
      message: "CV uploaded but parsing failed.",
      candidate: {
        candidateId: `candidate-${Date.now()}`,
        name: req.file ? req.file.originalname : "Unknown",
        skills: [],
        experience: [],
        education: [],
        cvText: "",
        evaluation: null
      }
    });
  }
});

// Get all candidates
app.get("/api/candidates", (req, res) => {
  res.json({ candidates });
});

// Get one candidate
app.get("/api/candidates/:id", (req, res) => {
  const candidate = candidates.find(c => c.candidateId === req.params.id);
  if (!candidate) return res.status(404).json({ message: "Candidate not found." });
  res.json({ candidate });
});

// Create job
app.post("/api/jobs", (req, res) => {
  const { jobTitle, requiredSkills = [], minimumExperience = 0, minimumEducation = "", industryBackground = "", mandatoryCertifications = [] } = req.body;
  if (!jobTitle) return res.status(400).json({ message: "Job title is required." });
  activeJobCriteria = { jobTitle, requiredSkills, minimumExperience, minimumEducation, industryBackground, mandatoryCertifications };
  res.status(201).json({ message: "Job created successfully.", job: activeJobCriteria });
});

// Get current job
app.get("/api/jobs/current", (req, res) => {
  res.json({ job: activeJobCriteria });
});

// Evaluate candidate by ID
app.post("/api/candidates/:id/evaluate", (req, res) => {
  const candidate = candidates.find(c => c.candidateId === req.params.id);
  if (!candidate) return res.status(404).json({ message: "Candidate not found." });

  // Dummy evaluation logic
  const evaluation = {
    matchScore: 100,
    category: "Tier 1",
    justification: "Strong match for the job."
  };

  candidate.evaluation = evaluation;
  res.json({ message: "Candidate evaluated successfully.", candidate, evaluation });
});

// Root
app.get("/", (req, res) => res.json({ message: "AI CV Screening API is running" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
