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

// Section extractor
function extractSection(text, headings) {
  const lines = cleanText(text).split("\n").map(l => l.trim()).filter(Boolean);
  const normalizedHeadings = headings.map(h => h.toLowerCase());
  let startIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].toLowerCase();
    if (normalizedHeadings.some(h => current.startsWith(h))) {
      startIndex = i + 1;
      break;
    }
  }
  if (startIndex === -1) return "";

  const stopHeadings = ["experience","education","skills","projects","certifications","summary"];
  const result = [];
  for (let i = startIndex; i < lines.length; i++) {
    const current = lines[i].toLowerCase();
    if (stopHeadings.includes(current)) break;
    result.push(lines[i]);
  }
  return result.join("\n");
}

// Experience extractor (improved)
function extractExperience(text) {
  const section = extractSection(text, ["Experience","Work Experience","Professional Experience","Employment History","EXPERIENCE"]);
  if (!section) return [];
  const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
  const experiences = [];
  let current = null;
  const dateRegex = /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\b/gi;

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (/developer|engineer|intern|manager|designer|assistant|teacher/i.test(line)) {
      if (current) experiences.push(current);
      current = { position: line, company: "", description: "", dates: dateMatch ? dateMatch[0] : "" };
      continue;
    }
    if (!current) current = { position: "Experience", company: "", description: "", dates: dateMatch ? dateMatch[0] : "" };
    if (dateMatch && !current.dates) { current.dates = dateMatch[0]; continue; }
    if (!current.company && line.length < 100) { current.company = line; continue; }
    current.description += (current.description ? " " : "") + line;
  }
  if (current) experiences.push(current);
  return experiences;
}

// Education extractor (improved)
function extractEducation(text) {
  const section = extractSection(text, ["Education","Academic Background","Academic Education","EDUCATION"]);
  if (!section) return [];
  const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
  const education = [];
  let current = null;
  const dateRegex = /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/;

  for (const line of lines) {
    const isDegree = /bachelor|master|phd|doctorate|degree|computer science|information technology/i.test(line);
    const dateMatch = line.match(dateRegex);
    if (isDegree) {
      if (current) education.push(current);
      current = { degree: line, institution: "", dates: dateMatch ? dateMatch[0] : "" };
      continue;
    }
    if (!current) current = { degree: line, institution: "", dates: dateMatch ? dateMatch[0] : "" };
    if (dateMatch && !current.dates) { current.dates = dateMatch[0]; continue; }
    if (!current.institution) current.institution = line;
  }
  if (current) education.push(current);
  return education;
}

// Upload CV endpoint
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
      skills: [], // add skill extraction if needed
      experience: extractExperience(cvText),
      education: extractEducation(cvText),
      cvText
    };
    candidates.push(candidate);
    res.status(201).json({ message: "CV uploaded successfully.", candidate });
  } catch (err) {
    res.status(500).json({ message: err.message || "Upload failed." });
  }
});

// Root
app.get("/", (req, res) => res.json({ message: "AI CV Screening API is running" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
