import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";

// =====================================================
// APP SETUP
// =====================================================

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

// =====================================================
// UPLOAD FOLDER
// =====================================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =====================================================
// MULTER
// =====================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    cb(
      null,
      `${Date.now()}-${safeName}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const allowed = [
      ".pdf",
      ".docx",
      ".txt",
    ];

    if (!allowed.includes(extension)) {
      return cb(
        new Error(
          "Only PDF, DOCX and TXT files are supported."
        )
      );
    }

    cb(null, true);
  },
});

// =====================================================
// DATA
// =====================================================

let activeJobCriteria = null;

const candidates = [];

// =====================================================
// PDF TEXT EXTRACTION
// =====================================================

async function readPdfFile(filePath) {
  try {
    const pdfjsLib = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

    const data = new Uint8Array(
      fs.readFileSync(filePath)
    );

    const pdf = await pdfjsLib.getDocument({
      data,
    }).promise;

    let text = "";

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page = await pdf.getPage(
        pageNumber
      );

      const content =
        await page.getTextContent();

      const pageText = content.items
        .map((item) => item.str)
        .join(" ");

      text += pageText + "\n";
    }

    return text;
  } catch (error) {
    console.error(
      "PDF extraction error:",
      error
    );

    throw new Error(
      "Could not read PDF file."
    );
  }
}

// =====================================================
// DOCX TEXT EXTRACTION
// =====================================================

async function readDocxFile(filePath) {
  try {
    const result =
      await mammoth.extractRawText({
        path: filePath,
      });

    return result.value || "";
  } catch (error) {
    console.error(
      "DOCX extraction error:",
      error
    );

    throw new Error(
      "Could not read DOCX file."
    );
  }
}

// =====================================================
// TXT TEXT EXTRACTION
// =====================================================

function readTxtFile(filePath) {
  try {
    return fs.readFileSync(
      filePath,
      "utf8"
    );
  } catch (error) {
    console.error(
      "TXT extraction error:",
      error
    );

    throw new Error(
      "Could not read TXT file."
    );
  }
}

// =====================================================
// CLEAN TEXT
// =====================================================

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// =====================================================
// EMAIL
// =====================================================

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : "";
}

// =====================================================
// PHONE
// =====================================================

function extractPhone(text) {
  const match = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/g
  );

  if (!match) {
    return "";
  }

  const phone = match
    .map((item) => item.trim())
    .find((item) => {
      const digits =
        item.replace(/\D/g, "");

      return (
        digits.length >= 8 &&
        digits.length <= 15
      );
    });

  return phone || "";
}

// =====================================================
// LINKEDIN
// =====================================================

function extractLinkedIn(text) {
  const match = text.match(
    /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i
  );

  return match ? match[0] : "";
}

// =====================================================
// NAME
// =====================================================

function extractName(text, originalName = "") {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Try first lines of CV
  for (
    let i = 0;
    i < Math.min(lines.length, 8);
    i++
  ) {
    const line = lines[i];

    if (
      line.includes("@") ||
      line.toLowerCase().includes("curriculum") ||
      line.toLowerCase().includes("resume") ||
      line.toLowerCase().includes("cv")
    ) {
      continue;
    }

    const words = line.split(/\s+/);

    if (
      words.length >= 2 &&
      words.length <= 5 &&
      /^[A-Za-zÀ-ÿ' -]+$/.test(line)
    ) {
      return line;
    }
  }

  // Filename fallback
  const filename = path
    .basename(
      originalName,
      path.extname(originalName)
    )
    .replace(/[_-]+/g, " ")
    .replace(/[—–]+/g, " ")
    .replace(/\bCV\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return filename || "Unknown Candidate";
}

// =====================================================
// SECTION EXTRACTION
// =====================================================

function extractSection(
  text,
  headings
) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedHeadings =
    headings.map((heading) =>
      heading.toLowerCase()
    );

  let startIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const current =
      lines[i].toLowerCase().trim();

    const isHeading =
      normalizedHeadings.some(
        (heading) =>
          current === heading ||
          current.startsWith(
            heading + ":"
          )
      );

    if (isHeading) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  const stopHeadings = [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "education",
    "certifications",
    "certificates",
    "skills",
    "technical skills",
    "projects",
    "languages",
    "contact",
    "profile",
    "summary",
    "professional summary",
    "objective",
    "references",
  ];

  const result = [];

  for (
    let i = startIndex;
    i < lines.length;
    i++
  ) {
    const current =
      lines[i].toLowerCase().trim();

    const shouldStop =
      stopHeadings.includes(current) &&
      !normalizedHeadings.includes(current);

    if (shouldStop) {
      break;
    }

    result.push(lines[i]);
  }

  return result.join("\n");
}

// =====================================================
// SKILLS
// =====================================================

const knownSkills = [
  "HTML5",
  "HTML",
  "CSS3",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "React.js",
  "Vue",
  "Angular",
  "Node.js",
  "Node",
  "Express",
  "PHP",
  "Laravel",
  "MySQL",
  "MongoDB",
  "SQLite",
  "PostgreSQL",
  "WordPress",
  "Shopify",
  "Git",
  "GitHub",
  "Tailwind CSS",
  "Bootstrap",
  "Sass",
  "SCSS",
  "Docker",
  "Python",
  "Java",
  "C++",
  "C#",
  "AWS",
  "Azure",
  "Linux",
  "Figma",
];

function extractSkills(text) {
  const found = [];

  const lowerText =
    text.toLowerCase();

  for (const skill of knownSkills) {
    const skillLower =
      skill.toLowerCase();

    if (
      lowerText.includes(skillLower)
    ) {
      if (
        !found.some(
          (item) =>
            item.toLowerCase() ===
            skillLower
        )
      ) {
        found.push(skill);
      }
    }
  }

  return found;
}

// =====================================================
// EXPERIENCE
// =====================================================

function extractExperience(text) {
  const section = extractSection(
    text,
    [
      "Experience",
      "Work Experience",
      "Professional Experience",
      "Employment History",
    ]
  );

  if (!section) {
    return [];
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const experiences = [];

  let current = null;

  const dateRegex =
    /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{2,4}\s*[-–]\s*\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4})/i;

  for (const line of lines) {
    const lower = line.toLowerCase();

    const dateMatch =
      line.match(dateRegex);

    if (
      lower.includes("intern") ||
      lower.includes("developer") ||
      lower.includes("engineer") ||
      lower.includes("teacher") ||
      lower.includes("manager") ||
      lower.includes("designer") ||
      lower.includes("assistant") ||
      lower.includes("freelance") ||
      lower.includes("trainee")
    ) {
      if (current) {
        experiences.push(current);
      }

      current = {
        position: line,
        company: "",
        description: "",
        dates: dateMatch
          ? dateMatch[0]
          : "",
      };

      continue;
    }

    if (!current) {
      current = {
        position: "Professional Experience",
        company: "",
        description: "",
        dates: dateMatch
          ? dateMatch[0]
          : "",
      };
    }

    if (dateMatch && !current.dates) {
      current.dates =
        dateMatch[0];
      continue;
    }

    if (!current.company) {
      if (
        line.length < 100 &&
        !line.includes(" - ")
      ) {
        current.company = line;
        continue;
      }
    }

    current.description +=
      (current.description
        ? " "
        : "") + line;
  }

  if (current) {
    experiences.push(current);
  }

  return experiences;
}

// =====================================================
// EDUCATION
// =====================================================

function extractEducation(text) {
  const section = extractSection(
    text,
    [
      "Education",
      "Academic Background",
      "Academic Education",
    ]
  );

  if (!section) {
    return [];
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const education = [];

  let current = null;

  for (const line of lines) {
    const lower =
      line.toLowerCase();

    const isDegree =
      lower.includes("bachelor") ||
      lower.includes("master") ||
      lower.includes("phd") ||
      lower.includes("doctorate") ||
      lower.includes("degree") ||
      lower.includes("computer science") ||
      lower.includes("information technology");

    const dateMatch = line.match(
      /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/
    );

    if (isDegree) {
      if (current) {
        education.push(current);
      }

      current = {
        degree: line,
        institution: "",
        dates: dateMatch
          ? dateMatch[0]
          : "",
      };

      continue;
    }

    if (!current) {
      current = {
        degree: line,
        institution: "",
        dates: dateMatch
          ? dateMatch[0]
          : "",
      };

      continue;
    }

    if (dateMatch && !current.dates) {
      current.dates =
        dateMatch[0];
      continue;
    }

    if (!current.institution) {
      current.institution = line;
    }
  }

  if (current) {
    education.push(current);
  }

  return education;
}

// =====================================================
// CERTIFICATIONS
// =====================================================

const knownCertifications = [
  "AWS",
  "AWS Certified",
  "Azure",
  "Microsoft Certified",
  "Microsoft Azure",
  "Google Certified",
  "Google Cloud",
  "Cisco",
  "CCNA",
  "CCNP",
  "Oracle",
  "CompTIA",
  "Security+",
  "Network+",
  "PMP",
  "Scrum Master",
  "ISTQB",
];

function extractCertifications(text) {
  const section = extractSection(
    text,
    [
      "Certifications",
      "Certification",
      "Certificates",
      "Certificates & Certifications",
    ]
  );

  const source =
    section || text;

  const found = [];

  for (const certification of knownCertifications) {
    if (
      source
        .toLowerCase()
        .includes(
          certification.toLowerCase()
        )
    ) {
      if (
        !found.some(
          (item) =>
            item.toLowerCase() ===
            certification.toLowerCase()
        )
      ) {
        found.push(certification);
      }
    }
  }

  return found;
}

// =====================================================
// INDUSTRY DETECTION
// =====================================================

function detectIndustry(text) {
  const lower =
    text.toLowerCase();

  const industries = {
    technology: [
      "software",
      "web development",
      "developer",
      "programming",
      "computer science",
      "information technology",
      "it ",
      "technology",
    ],

    ecommerce: [
      "e-commerce",
      "ecommerce",
      "online store",
      "shopify",
      "woocommerce",
    ],

    education: [
      "school",
      "teacher",
      "teaching",
      "education",
      "students",
      "university",
    ],

    finance: [
      "bank",
      "banking",
      "finance",
      "financial",
    ],

    healthcare: [
      "hospital",
      "healthcare",
      "medical",
      "clinic",
    ],
  };

  const found = [];

  for (const [industry, keywords] of Object.entries(
    industries
  )) {
    if (
      keywords.some((keyword) =>
        lower.includes(keyword)
      )
    ) {
      found.push(industry);
    }
  }

  return found;
}

// =====================================================
// GET JOB
// =====================================================

app.get("/api/jobs/current", (req, res) => {
  res.json({
    job: activeJobCriteria,
  });
});

// =====================================================
// CREATE JOB
// =====================================================

app.post("/api/jobs", (req, res) => {
  try {
    const {
      jobTitle,
      requiredSkills = [],
      minimumExperience = 0,
      minimumEducation = "",
      industryBackground = "",
      mandatoryCertifications = [],
    } = req.body;

    if (!jobTitle) {
      return res.status(400).json({
        message: "Job title is required.",
      });
    }

    activeJobCriteria = {
      jobTitle,
      requiredSkills: Array.isArray(
        requiredSkills
      )
        ? requiredSkills
        : [],

      minimumExperience:
        Number(minimumExperience) || 0,

      minimumEducation:
        minimumEducation || "",

      industryBackground:
        industryBackground || "",

      mandatoryCertifications:
        Array.isArray(
          mandatoryCertifications
        )
          ? mandatoryCertifications
          : [],
    };

    res.status(201).json({
      message: "Job created successfully.",
      job: activeJobCriteria,
    });
  } catch (error) {
    console.error(
      "Create job error:",
      error
    );

    res.status(500).json({
      message: "Could not create job.",
    });
  }
});

// =====================================================
// UPLOAD CV
// =====================================================

app.post(
  "/api/candidates/upload",
  upload.single("cv"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No CV file uploaded.",
        });
      }

      const filePath =
        req.file.path;

      const extension = path
        .extname(req.file.originalname)
        .toLowerCase();

      let cvText = "";

      if (extension === ".pdf") {
        cvText =
          await readPdfFile(filePath);
      } else if (
        extension === ".docx"
      ) {
        cvText =
          await readDocxFile(filePath);
      } else if (
        extension === ".txt"
      ) {
        cvText =
          readTxtFile(filePath);
      }

      cvText = cleanText(cvText);

      if (!cvText) {
        return res.status(400).json({
          message:
            "Could not extract text from the CV.",
        });
      }

      const candidateId =
        `candidate-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      const candidate = {
        candidateId,

        name: extractName(
          cvText,
          req.file.originalname
        ),

        email:
          extractEmail(cvText),

        phone:
          extractPhone(cvText),

        linkedin:
          extractLinkedIn(cvText),

        skills:
          extractSkills(cvText),

        experience:
          extractExperience(cvText),

        education:
          extractEducation(cvText),

        certifications:
          extractCertifications(cvText),

        industry:
          detectIndustry(cvText),

        originalFile:
          req.file.filename,

        originalName:
          req.file.originalname,

        cvText,

        evaluation: null,
      };

      candidates.push(candidate);

      return res.status(201).json({
        message:
          "CV uploaded successfully.",
        candidate,
      });
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "CV upload failed.",
      });
    }
  }
);

// =====================================================
// GET ALL CANDIDATES
// =====================================================

app.get(
  "/api/candidates",
  (req, res) => {
    res.json({
      candidates,
    });
  }
);

// =====================================================
// GET ONE CANDIDATE
// =====================================================

app.get(
  "/api/candidates/:id",
  (req, res) => {
    const candidate =
      candidates.find(
        (item) =>
          item.candidateId ===
          req.params.id
      );

    if (!candidate) {
      return res.status(404).json({
        message:
          "Candidate not found.",
      });
    }

    res.json({
      candidate,
    });
  }
);

// =====================================================
// EVALUATE CANDIDATE
// =====================================================

function evaluateCandidate(candidate) {
  if (!activeJobCriteria) {
    throw new Error(
      "No active job has been created."
    );
  }

  const job =
    activeJobCriteria;

  const candidateSkills =
    candidate.skills || [];

  const requiredSkills =
    job.requiredSkills || [];

  // ===================================================
  // SKILLS
  // ===================================================

  const matchedSkills =
    requiredSkills.filter(
      (requiredSkill) =>
        candidateSkills.some(
          (candidateSkill) =>
            candidateSkill.toLowerCase() ===
              requiredSkill.toLowerCase() ||
            candidateSkill
              .toLowerCase()
              .includes(
                requiredSkill.toLowerCase()
              ) ||
            requiredSkill
              .toLowerCase()
              .includes(
                candidateSkill.toLowerCase()
              )
        )
    );

  const missingSkills =
    requiredSkills.filter(
      (requiredSkill) =>
        !matchedSkills.includes(
          requiredSkill
        )
    );

  let skillsScore = 0;

  if (requiredSkills.length > 0) {
    skillsScore =
      (matchedSkills.length /
        requiredSkills.length) *
      100;
  } else {
    skillsScore = 100;
  }

  // ===================================================
  // EXPERIENCE
  // ===================================================

  const experienceCount =
    Array.isArray(candidate.experience)
      ? candidate.experience.length
      : Number(candidate.experience) || 0;

  const minimumExperience =
    Number(
      job.minimumExperience
    ) || 0;

  let experienceScore = 100;

  const eliminationReasons = [];

  if (
    minimumExperience > 0
  ) {
    if (
      experienceCount <
      minimumExperience
    ) {
      experienceScore = 0;

      eliminationReasons.push(
        "Minimum experience requirement not met"
      );
    } else {
      experienceScore = 100;
    }
  }

  // ===================================================
  // EDUCATION
  // ===================================================

  const educationText =
    JSON.stringify(
      candidate.education || []
    ).toLowerCase();

  const requiredEducation =
    String(
      job.minimumEducation || ""
    ).toLowerCase();

  let educationScore = 100;

  if (requiredEducation) {
    if (
      educationText.includes(
        requiredEducation
      )
    ) {
      educationScore = 100;
    } else {
      educationScore = 50;
    }
  }

  // ===================================================
  // CERTIFICATIONS
  // ===================================================

  const candidateCertifications =
    candidate.certifications || [];

  const mandatoryCertifications =
    job.mandatoryCertifications ||
    [];

  let certificationScore = 100;

  if (
    mandatoryCertifications.length >
    0
  ) {
    const matchedCertifications =
      mandatoryCertifications.filter(
        (requiredCert) =>
          candidateCertifications.some(
            (candidateCert) =>
              candidateCert
                .toLowerCase()
                .includes(
                  requiredCert.toLowerCase()
                ) ||
              requiredCert
                .toLowerCase()
                .includes(
                  candidateCert.toLowerCase()
                )
          )
      );

    certificationScore =
      (matchedCertifications.length /
        mandatoryCertifications.length) *
      100;

    if (
      matchedCertifications.length !==
      mandatoryCertifications.length
    ) {
      eliminationReasons.push(
        "Missing mandatory certification"
      );
    }
  }

  // ===================================================
  // INDUSTRY
  // ===================================================

  let industryScore = 100;

  const requiredIndustry =
    String(
      job.industryBackground || ""
    ).toLowerCase();

  if (requiredIndustry) {
    const candidateIndustryText =
      [
        ...(candidate.industry || []),
        candidate.cvText || "",
      ]
        .join(" ")
        .toLowerCase();

    industryScore =
      candidateIndustryText.includes(
        requiredIndustry
      )
        ? 100
        : 50;
  }

  // ===================================================
  // FINAL SCORE
  // ===================================================

  const matchScore = Math.round(
    skillsScore * 0.4 +
      experienceScore * 0.25 +
      educationScore * 0.15 +
      certificationScore * 0.1 +
      industryScore * 0.1
  );

  // ===================================================
  // CATEGORY
  // ===================================================

  let category = "Tier 3";

  if (
    eliminationReasons.length === 0 &&
    matchScore >= 85
  ) {
    category = "Tier 1";
  } else if (
    eliminationReasons.length === 0 &&
    matchScore >= 65
  ) {
    category = "Tier 2";
  } else {
    category = "Tier 3";
  }

  // ===================================================
  // EVALUATION MATRIX
  // ===================================================

  const evaluationMatrix = {
    Skills:
      Math.round(skillsScore / 10),

    Experience:
      Math.round(experienceScore / 10),

    Education:
      Math.round(educationScore / 10),

    Industry:
      Math.round(industryScore / 10),

    Certifications:
      Math.round(certificationScore / 10),
  };

  // ===================================================
  // JUSTIFICATION
  // ===================================================

  let justification = "";

  if (
    eliminationReasons.length > 0
  ) {
    justification =
      `The candidate does not meet one or more mandatory requirements for the ${job.jobTitle} position. ${eliminationReasons.join(
        ". "
      )}.`;
  } else if (
    category === "Tier 1"
  ) {
    justification =
      `Strong match for the ${job.jobTitle} position. The candidate demonstrates strong technical skills, relevant education, and suitable professional experience.`;
  } else if (
    category === "Tier 2"
  ) {
    justification =
      `Potential match for the ${job.jobTitle} position. The candidate meets several important requirements but may need further review.`;
  } else {
    justification =
      `The candidate has some relevant qualifications but does not strongly match the ${job.jobTitle} requirements.`;
  }

  return {
    matchScore,
    category,

    evaluationMatrix,

    matchedSkills,

    missingSkills,

    eliminationReasons,

    justification,

    experienceCount,

    scores: {
      skills: Math.round(
        skillsScore
      ),

      experience: Math.round(
        experienceScore
      ),

      education: Math.round(
        educationScore
      ),

      certifications:
        Math.round(
          certificationScore
        ),

      industry:
        Math.round(
          industryScore
        ),
    },
  };
}

// =====================================================
// EVALUATE BY ID
// =====================================================

app.post(
  "/api/candidates/:id/evaluate",
  (req, res) => {
    try {
      const candidate =
        candidates.find(
          (item) =>
            item.candidateId ===
            req.params.id
        );

      if (!candidate) {
        return res.status(404).json({
          message:
            "Candidate not found.",
        });
      }

      const evaluation =
        evaluateCandidate(
          candidate
        );

      candidate.evaluation =
        evaluation;

      res.json({
        message:
          "Candidate evaluated successfully.",

        candidate,

        evaluation,
      });
    } catch (error) {
      console.error(
        "Evaluation error:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Candidate evaluation failed.",
      });
    }
  }
);

// =====================================================
// EVALUATE WITH CANDIDATE DATA
// =====================================================

app.post(
  "/api/candidates/evaluate",
  (req, res) => {
    try {
      const candidate =
        req.body;

      if (!candidate) {
        return res.status(400).json({
          message:
            "Candidate data is required.",
        });
      }

      const evaluation =
        evaluateCandidate(
          candidate
        );

      res.json({
        message:
          "Candidate evaluated successfully.",

        candidate: {
          ...candidate,
          evaluation,
        },

        evaluation,
      });
    } catch (error) {
      console.error(
        "Evaluation error:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Evaluation failed.",
      });
    }
  }
);

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message:
      "AI CV Screening API is running",
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    if (
      error instanceof multer.MulterError
    ) {
      return res.status(400).json({
        message:
          error.message,
      });
    }

    res.status(500).json({
      message:
        error.message ||
        "Internal server error.",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(
    `AI CV Screening API running on port ${PORT}`
  );
});