import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";

// ==================================================
// APP SETUP
// ==================================================

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==================================================
// UPLOAD DIRECTORY
// ==================================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// ==================================================
// MULTER CONFIGURATION
// ==================================================

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

    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".txt",
    ];

    if (
      !allowedExtensions.includes(extension)
    ) {
      return cb(
        new Error(
          "Only PDF, DOCX and TXT files are supported."
        )
      );
    }

    cb(null, true);
  },
});

// ==================================================
// IN-MEMORY DATA
// ==================================================

let activeJobCriteria = {
  jobTitle: "",
  requiredSkills: [],
  minimumExperience: 0,
  minimumEducation: "None",
  industryBackground: "",
  mandatoryCertifications: [],
};

const candidates = [];

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) =>
          cleanValue(item)
        )
        .filter(Boolean)
    ),
  ];
}

// ==================================================
// READ TXT
// ==================================================

function readTxtFile(filePath) {
  return fs.readFileSync(
    filePath,
    "utf8"
  );
}

// ==================================================
// READ DOCX
// ==================================================

async function readDocxFile(filePath) {
  const result =
    await mammoth.extractRawText({
      path: filePath,
    });

  return result.value;
}

// ==================================================
// READ PDF
// ==================================================

async function readPdfFile(filePath) {
  const pdfjsLib =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const data = new Uint8Array(
    fs.readFileSync(filePath)
  );

  const pdf =
    await pdfjsLib.getDocument({
      data,
    }).promise;

  let fullText = "";

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(pageNumber);

    const content =
      await page.getTextContent();

    const pageText =
      content.items
        .map((item) =>
          item.str || ""
        )
        .join(" ");

    fullText += pageText + "\n";
  }

  return fullText;
}

// ==================================================
// EXTRACT CV TEXT
// ==================================================

async function extractCVText(
  filePath,
  originalName
) {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  if (extension === ".pdf") {
    return await readPdfFile(filePath);
  }

  if (extension === ".docx") {
    return await readDocxFile(filePath);
  }

  if (extension === ".txt") {
    return readTxtFile(filePath);
  }

  throw new Error(
    "Unsupported file format."
  );
}

// ==================================================
// EMAIL
// ==================================================

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match
    ? match[0]
    : "";
}

// ==================================================
// LINKEDIN
// ==================================================

function extractLinkedIn(text) {
  const match = text.match(
    /https?:\/\/(?:www\.)?linkedin\.com\/[^\s|]+/i
  );

  if (!match) {
    return "";
  }

  return match[0].replace(
    /[.,;)\]]+$/,
    ""
  );
}

// ==================================================
// PHONE
// ==================================================

function extractPhone(text) {
  const phoneRegex =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/g;

  const matches =
    text.match(phoneRegex) || [];

  for (const phone of matches) {
    const digits =
      phone.replace(/\D/g, "");

    if (
      digits.length >= 8 &&
      digits.length <= 15
    ) {
      return cleanValue(phone);
    }
  }

  return "";
}

// ==================================================
// NAME
// ==================================================

function extractName(
  text,
  originalName
) {
  const lines = text
    .split("\n")
    .map((line) =>
      cleanValue(line)
    )
    .filter(Boolean);

  for (
    const line of lines.slice(0, 10)
  ) {
    const lower =
      line.toLowerCase();

    if (
      lower.includes("date of birth") ||
      lower.includes("phone") ||
      lower.includes("email") ||
      lower.includes("linkedin") ||
      lower.includes("address")
    ) {
      continue;
    }

    const cleaned = line
      .replace(
        /^(candidate|name)\s*[:\-]?\s*/i,
        ""
      )
      .trim();

    const words =
      cleaned.split(/\s+/);

    if (
      words.length >= 2 &&
      words.length <= 5 &&
      /^[A-Za-zÀ-ž' -]+$/.test(cleaned)
    ) {
      return cleaned;
    }
  }

  const filenameName = path
    .basename(
      originalName,
      path.extname(originalName)
    )
    .replace(/[_-]+/g, " ")
    .replace(/\bCV\b/gi, "")
    .replace(/\bResume\b/gi, "")
    .trim();

  return (
    filenameName ||
    "Unknown Candidate"
  );
}

// ==================================================
// SKILLS DATABASE
// ==================================================

const skillsDatabase = [
  "HTML5",
  "HTML",
  "CSS3",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React JS",
  "React.js",
  "React",
  "Next.js",
  "Next",
  "Vue.js",
  "Vue",
  "Angular",
  "Tailwind CSS",
  "Tailwind",
  "Bootstrap",
  "Sass",
  "SCSS",
  "PHP",
  "Laravel",
  "MySQL",
  "PostgreSQL",
  "SQL",
  "WordPress",
  "GitHub",
  "Git",
  "Node.js",
  "Node",
  "Express",
  "MongoDB",
  "Java",
  "Python",
  "C++",
  "C#",
  ".NET",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Shopify",
  "Figma",
  "Linux",
  "Windows",
  "REST API",
  "API",
];

// ==================================================
// SKILL NORMALIZATION
// ==================================================

function normalizeSkill(skill) {
  let value = String(skill || "")
    .toLowerCase()
    .trim();

  value = value
    .replace(/\s+/g, " ");

  const aliases = {
    "html5": "html",
    "css3": "css",

    "react.js": "react",
    "react js": "react",
    "reactjs": "react",

    "node.js": "node",
    "node js": "node",
    "nodejs": "node",

    "next.js": "next",
    "next js": "next",

    "vue.js": "vue",
    "vue js": "vue",

    "tailwind css": "tailwind",

    "rest api": "api",
  };

  return aliases[value] || value;
}

// ==================================================
// EXTRACT SKILLS
// ==================================================

function extractSkills(text) {
  const lowerText =
    String(text || "").toLowerCase();

  const found = [];

  for (
    const skill of skillsDatabase
  ) {
    const normalizedSkill =
      normalizeSkill(skill);

    let searchTerms = [
      skill.toLowerCase(),
      normalizedSkill,
    ];

    if (
      normalizedSkill === "react"
    ) {
      searchTerms = [
        "react",
        "react.js",
        "react js",
      ];
    }

    if (
      normalizedSkill === "node"
    ) {
      searchTerms = [
        "node",
        "node.js",
        "node js",
      ];
    }

    const exists =
      searchTerms.some(
        (term) =>
          lowerText.includes(term)
      );

    if (exists) {
      found.push(normalizedSkill);
    }
  }

  return [
    ...new Set(found),
  ];
}

// ==================================================
// SKILL MATCH
// ==================================================

function skillsMatch(
  candidateSkill,
  requiredSkill
) {
  const candidate =
    normalizeSkill(candidateSkill);

  const required =
    normalizeSkill(requiredSkill);

  return candidate === required;
}

// ==================================================
// EXPERIENCE
// ==================================================

function extractExperience(text) {
  const experience = [];

  if (!text) {
    return experience;
  }

  // =================================================
  // FORMATS:
  //
  // 01/2023 - 12/2024
  // 01/01/2023 - 01/01/2024
  // 2023 - 2024
  // Jan 2023 - Dec 2024
  // =================================================

  const dateRegex =
    /(?:(\d{1,2})[\/.-](\d{4})|(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})|((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4})|(\d{4}))\s*(?:-|–|—|to)\s*(?:(\d{1,2})[\/.-](\d{4})|(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})|((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4})|(\d{4}|present|current|now))/gi;

  const matches = [
    ...text.matchAll(dateRegex),
  ];

  for (
    let i = 0;
    i < matches.length;
    i++
  ) {
    const current =
      matches[i];

    const start =
      Math.max(
        0,
        current.index - 200
      );

    const nearbyText =
      text
        .substring(
          start,
          current.index
        )
        .trim();

    const lines =
      nearbyText
        .split("\n")
        .map((line) =>
          cleanValue(line)
        )
        .filter(Boolean);

    let role =
      "Not specified";

    let company =
      "Not specified";

    if (lines.length >= 1) {
      role =
        lines[lines.length - 1];
    }

    if (lines.length >= 2) {
      company =
        lines[lines.length - 2];
    }

    experience.push({
      role,
      company,
      duration: current[0],
    });
  }

  return experience;
}

// ==================================================
// DATE TO MONTH
// ==================================================

function dateToMonth(value) {
  if (!value) {
    return null;
  }

  const text =
    String(value)
      .trim()
      .toLowerCase();

  if (
    text === "present" ||
    text === "current" ||
    text === "now"
  ) {
    const now = new Date();

    return (
      now.getFullYear() * 12 +
      now.getMonth()
    );
  }

  // DD/MM/YYYY

  let match = text.match(
    /^\d{1,2}[\/.-](\d{1,2})[\/.-](\d{4})$/
  );

  if (match) {
    return (
      Number(match[2]) * 12 +
      Number(match[1]) - 1
    );
  }

  // MM/YYYY

  match = text.match(
    /^(\d{1,2})[\/.-](\d{4})$/
  );

  if (match) {
    return (
      Number(match[2]) * 12 +
      Number(match[1]) - 1
    );
  }

  // YYYY

  match = text.match(
    /^(\d{4})$/
  );

  if (match) {
    return (
      Number(match[1]) * 12
    );
  }

  // MONTH YYYY

  const parsedDate =
    new Date(`1 ${text}`);

  if (
    !Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return (
      parsedDate.getFullYear() *
        12 +
      parsedDate.getMonth()
    );
  }

  return null;
}

// ==================================================
// CALCULATE EXPERIENCE YEARS
// ==================================================

function calculateExperienceYears(
  experience
) {
  if (
    !Array.isArray(experience) ||
    experience.length === 0
  ) {
    return 0;
  }

  let totalMonths = 0;

  for (const item of experience) {
    const duration =
      item.duration || "";

    const parts =
      duration.split(
        /\s*(?:-|–|—|to)\s*/i
      );

    if (parts.length < 2) {
      continue;
    }

    const startMonth =
      dateToMonth(parts[0]);

    const endMonth =
      dateToMonth(parts[1]);

    if (
      startMonth === null ||
      endMonth === null
    ) {
      continue;
    }

    const months =
      endMonth - startMonth;

    if (months > 0) {
      totalMonths += months;
    }
  }

  return (
    Math.round(
      (totalMonths / 12) * 10
    ) / 10
  );
}

// ==================================================
// EDUCATION
// ==================================================

function extractEducation(text) {
  const education = [];

  if (!text) {
    return education;
  }

  const lowerText =
    text.toLowerCase();

  const degrees = [
    {
      degree: "PhD",
      keywords: [
        "phd",
        "ph.d",
        "doctor of philosophy",
      ],
    },

    {
      degree: "Master",
      keywords: [
        "master",
        "msc",
        "m.sc",
        "ma ",
        "mba",
      ],
    },

    {
      degree: "Bachelor",
      keywords: [
        "bachelor",
        "bsc",
        "b.sc",
        "undergraduate",
      ],
    },

    {
      degree: "High School",
      keywords: [
        "high school",
        "secondary school",
      ],
    },
  ];

  for (const item of degrees) {
    const exists =
      item.keywords.some(
        (keyword) =>
          lowerText.includes(keyword)
      );

    if (exists) {
      education.push({
        degree: item.degree,

        institution:
          "Not specified",

        duration:
          "Not specified",
      });
    }
  }

  return education;
}

// ==================================================
// EDUCATION LEVEL
// ==================================================

function getEducationLevel(
  education
) {
  if (
    !Array.isArray(education)
  ) {
    return 0;
  }

  let highest = 0;

  for (const item of education) {
    const degree =
      String(
        item.degree || ""
      ).toLowerCase();

    if (
      degree.includes("phd") ||
      degree.includes("doctor")
    ) {
      highest = Math.max(
        highest,
        4
      );
    } else if (
      degree.includes("master")
    ) {
      highest = Math.max(
        highest,
        3
      );
    } else if (
      degree.includes("bachelor")
    ) {
      highest = Math.max(
        highest,
        2
      );
    } else if (
      degree.includes("high school")
    ) {
      highest = Math.max(
        highest,
        1
      );
    }
  }

  return highest;
}

// ==================================================
// EDUCATION MATCH
// ==================================================

function educationMatches(
  candidateEducation,
  requiredEducation
) {
  if (
    !requiredEducation ||
    String(requiredEducation)
      .toLowerCase()
      .trim() === "none"
  ) {
    return true;
  }

  const required =
    String(requiredEducation)
      .toLowerCase()
      .trim();

  const candidateLevel =
    getEducationLevel(
      candidateEducation
    );

  if (
    required.includes("phd") ||
    required.includes("doctor")
  ) {
    return candidateLevel >= 4;
  }

  if (
    required.includes("master")
  ) {
    return candidateLevel >= 3;
  }

  if (
    required.includes("bachelor")
  ) {
    return candidateLevel >= 2;
  }

  if (
    required.includes("high school")
  ) {
    return candidateLevel >= 1;
  }

  return true;
}

// ==================================================
// CERTIFICATIONS
// ==================================================

function extractCertifications(text) {
  const certificationsDatabase = [
    "AWS Certified",
    "AWS",
    "Cisco Certified",
    "Cisco",
    "Microsoft Certified",
    "Google Certified",
    "Microsoft Azure",
    "Azure Fundamentals",
    "Azure",
    "Oracle",
    "CompTIA",
    "CCNA",
    "CCNP",
    "PMP",
    "Scrum Master",
    "Google Cloud",
  ];

  const lowerText =
    String(text || "").toLowerCase();

  const found = [];

  for (
    const certification of
    certificationsDatabase
  ) {
    if (
      lowerText.includes(
        certification.toLowerCase()
      )
    ) {
      found.push(
        certification
      );
    }
  }

  return [
    ...new Set(found),
  ];
}

// ==================================================
// CERTIFICATION MATCH
// ==================================================

function certificationMatches(
  candidateCertification,
  requiredCertification
) {
  const candidate =
    String(candidateCertification || "")
      .toLowerCase()
      .trim();

  const required =
    String(requiredCertification || "")
      .toLowerCase()
      .trim();

  if (!candidate || !required) {
    return false;
  }

  return (
    candidate.includes(required) ||
    required.includes(candidate)
  );
}

// ==================================================
// INDUSTRY MATCHING
// ==================================================

function checkIndustryMatch(
  candidateText,
  industry
) {
  if (
    !industry ||
    String(industry)
      .toLowerCase()
      .trim() === "none"
  ) {
    return true;
  }

  const text =
    String(
      candidateText || ""
    ).toLowerCase();

  const industryWords =
    String(industry)
      .toLowerCase()
      .split(/[,;/\s]+/)
      .map((word) =>
        word.trim()
      )
      .filter(
        (word) =>
          word.length > 2
      );

  if (
    industryWords.length === 0
  ) {
    return true;
  }

  return industryWords.some(
    (word) =>
      text.includes(word)
  );
}

// ==================================================
// EVALUATE CANDIDATE
// ==================================================

function evaluateCandidate(candidate) {
  const criteria =
    activeJobCriteria;

  const requiredSkills =
    normalizeArray(
      criteria.requiredSkills
    );

  const candidateSkills =
    normalizeArray(
      candidate.skills
    );

  // =================================================
  // SKILLS
  // =================================================

  const matchedSkills =
    requiredSkills.filter(
      (requiredSkill) =>
        candidateSkills.some(
          (candidateSkill) =>
            skillsMatch(
              candidateSkill,
              requiredSkill
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

  let skillsScore = 10;

  if (
    requiredSkills.length > 0
  ) {
    skillsScore =
      (matchedSkills.length /
        requiredSkills.length) *
      10;
  }

  // =================================================
  // EXPERIENCE
  // =================================================

  const experienceYears =
    calculateExperienceYears(
      candidate.experience
    );

  const minimumExperience =
    Number(
      criteria.minimumExperience
    ) || 0;

  let experienceScore = 10;

  if (
    minimumExperience > 0
  ) {
    experienceScore =
      Math.min(
        10,
        (experienceYears /
          minimumExperience) *
          10
      );
  }

  // =================================================
  // EDUCATION
  // =================================================

  const hasEducation =
    educationMatches(
      candidate.education,
      criteria.minimumEducation
    );

  const educationScore =
    hasEducation ? 10 : 0;

  // =================================================
  // CERTIFICATIONS
  // =================================================

  const mandatoryCertifications =
    normalizeArray(
      criteria.mandatoryCertifications
    );

  const candidateCertifications =
    normalizeArray(
      candidate.certifications
    );

  const matchedCertifications =
    mandatoryCertifications.filter(
      (requiredCertification) =>
        candidateCertifications.some(
          (candidateCertification) =>
            certificationMatches(
              candidateCertification,
              requiredCertification
            )
        )
    );

  const missingCertifications =
    mandatoryCertifications.filter(
      (requiredCertification) =>
        !matchedCertifications.includes(
          requiredCertification
        )
    );

  let certificationScore = 10;

  if (
    mandatoryCertifications.length > 0
  ) {
    certificationScore =
      (matchedCertifications.length /
        mandatoryCertifications.length) *
      10;
  }

  // =================================================
  // INDUSTRY
  // =================================================

  const industryMatch =
    checkIndustryMatch(
      candidate.cvText,
      criteria.industryBackground
    );

  const industryScore =
    industryMatch ? 10 : 0;

  // =================================================
  // TOTAL SCORE
  //
  // Skills          40%
  // Experience      25%
  // Education       15%
  // Certifications  10%
  // Industry        10%
  // =================================================

  const totalScore =
    skillsScore * 4 +
    experienceScore * 2.5 +
    educationScore * 1.5 +
    certificationScore +
    industryScore;

  let matchScore =
    Math.round(totalScore);

  matchScore = Math.max(
    0,
    Math.min(
      100,
      matchScore
    )
  );

  // =================================================
  // ELIMINATION RULES
  // =================================================

  const eliminationReasons = [];

  if (
    mandatoryCertifications.length > 0 &&
    missingCertifications.length > 0
  ) {
    eliminationReasons.push(
      `Missing mandatory certification(s): ${missingCertifications.join(
        ", "
      )}`
    );
  }

  // =================================================
  // CATEGORY
  // =================================================

  let category;

  if (
    eliminationReasons.length > 0
  ) {
    category = "Tier 3";
  } else if (
    matchScore >= 85
  ) {
    category = "Tier 1";
  } else if (
    matchScore >= 65
  ) {
    category = "Tier 2";
  } else {
    category = "Tier 3";
  }

  // =================================================
  // EVALUATION MATRIX
  // =================================================

  const evaluationMatrix = {
    Skills: Number(
      skillsScore.toFixed(1)
    ),

    Experience: Number(
      experienceScore.toFixed(1)
    ),

    Education: Number(
      educationScore.toFixed(1)
    ),

    Certifications: Number(
      certificationScore.toFixed(1)
    ),

    Industry: Number(
      industryScore.toFixed(1)
    ),
  };

  // =================================================
  // JUSTIFICATION
  // =================================================

  const strengths = [];
  const gaps = [];

  if (
    matchedSkills.length > 0
  ) {
    strengths.push(
      `matches ${matchedSkills.length} of ${requiredSkills.length} required skills`
    );
  }

  if (
    missingSkills.length > 0
  ) {
    gaps.push(
      `missing skills: ${missingSkills.join(
        ", "
      )}`
    );
  }

  if (
    minimumExperience > 0
  ) {
    if (
      experienceYears >=
      minimumExperience
    ) {
      strengths.push(
        `meets experience requirement with approximately ${experienceYears} year(s)`
      );
    } else {
      gaps.push(
        `approximately ${experienceYears} year(s) of experience, required ${minimumExperience}`
      );
    }
  }

  if (
    criteria.minimumEducation &&
    String(
      criteria.minimumEducation
    ).toLowerCase() !== "none"
  ) {
    if (hasEducation) {
      strengths.push(
        "meets education requirement"
      );
    } else {
      gaps.push(
        "does not meet education requirement"
      );
    }
  }

  if (
    mandatoryCertifications.length > 0
  ) {
    if (
      missingCertifications.length === 0
    ) {
      strengths.push(
        "has all mandatory certifications"
      );
    } else {
      gaps.push(
        `missing certifications: ${missingCertifications.join(
          ", "
        )}`
      );
    }
  }

  if (
    criteria.industryBackground
  ) {
    if (industryMatch) {
      strengths.push(
        "has relevant industry background"
      );
    } else {
      gaps.push(
        "no clear matching industry background"
      );
    }
  }

  let justification =
    `The candidate was evaluated for the ${
      criteria.jobTitle ||
      "selected"
    } position. `;

  if (
    strengths.length > 0
  ) {
    justification +=
      `Strengths: ${strengths.join(
        "; "
      )}. `;
  }

  if (
    gaps.length > 0
  ) {
    justification +=
      `Gaps: ${gaps.join(
        "; "
      )}. `;
  }

  if (
    eliminationReasons.length > 0
  ) {
    justification +=
      "The candidate was placed in Tier 3 because a mandatory requirement was not met.";
  } else if (
    category === "Tier 1"
  ) {
    justification +=
      "Overall, the candidate is a strong match.";
  } else if (
    category === "Tier 2"
  ) {
    justification +=
      "Overall, the candidate is a potential match.";
  } else {
    justification +=
      "Overall, the candidate is currently a weak match.";
  }

  console.log(
    "Candidate evaluation:",
    {
      name:
        candidate.name,

      score:
        matchScore,

      category,

      experienceYears,

      matchedSkills,

      missingSkills,

      eliminationReasons,
    }
  );

  return {
    matchScore,

    category,

    evaluationMatrix,

    matchedSkills,

    missingSkills,

    matchedCertifications,

    missingCertifications,

    eliminationReasons,

    justification,

    experienceYears,
  };
}

// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {
  res.json({
    message:
      "AI CV Screening API is running",
  });
});

// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",
      message:
        "Server is running",
    });
  }
);

// ==================================================
// GET CURRENT JOB
// ==================================================

app.get(
  "/api/jobs/current",
  (req, res) => {
    res.json({
      job:
        activeJobCriteria,
    });
  }
);

// ==================================================
// CREATE JOB
// ==================================================

app.post(
  "/api/jobs",
  (req, res) => {
    try {
      const {
        jobTitle,
        requiredSkills,
        minimumExperience,
        minimumEducation,
        industryBackground,
        mandatoryCertifications,
      } = req.body;

      if (
        !jobTitle ||
        !String(jobTitle).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Job title is required.",
          });
      }

      activeJobCriteria = {
        jobTitle:
          String(jobTitle).trim(),

        requiredSkills:
          normalizeArray(
            requiredSkills
          ),

        minimumExperience:
          Math.max(
            0,
            Number(
              minimumExperience
            ) || 0
          ),

        minimumEducation:
          !minimumEducation ||
          String(
            minimumEducation
          )
            .trim()
            .toLowerCase() === "none"
            ? "None"
            : String(
                minimumEducation
              ).trim(),

        industryBackground:
          String(
            industryBackground || ""
          ).trim(),

        mandatoryCertifications:
          normalizeArray(
            mandatoryCertifications
          ).filter(
            (certification) =>
              certification
                .toLowerCase() !==
              "none"
          ),
      };

      // =============================================
      // RE-EVALUATE EXISTING CANDIDATES
      // =============================================

      for (
        const candidate of candidates
      ) {
        candidate.evaluation =
          evaluateCandidate(
            candidate
          );
      }

      console.log(
        "Job created:",
        activeJobCriteria
      );

      res.status(201).json({
        message:
          "Job criteria saved successfully.",

        job:
          activeJobCriteria,
      });
    } catch (error) {
      console.error(
        "Create job error:",
        error
      );

      res.status(500).json({
        message:
          "Could not create job.",
      });
    }
  }
);

// ==================================================
// UPLOAD CV
// ==================================================

app.post(
  "/api/candidates/upload",

  upload.single("cv"),

  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            message:
              "No CV file was uploaded.",
          });
      }

      console.log(
        "Processing:",
        req.file.originalname
      );

      // =============================================
      // EXTRACT TEXT
      // =============================================

      const cvText =
        await extractCVText(
          req.file.path,
          req.file.originalname
        );

      const normalizedCVText =
        normalizeText(cvText);

      if (!normalizedCVText) {
        return res
          .status(400)
          .json({
            message:
              "Could not extract text from this CV.",
          });
      }

      // =============================================
      // EXTRACT DATA
      // =============================================

      const name =
        extractName(
          normalizedCVText,
          req.file.originalname
        );

      const email =
        extractEmail(
          normalizedCVText
        );

      const phone =
        extractPhone(
          normalizedCVText
        );

      const linkedin =
        extractLinkedIn(
          normalizedCVText
        );

      const skills =
        extractSkills(
          normalizedCVText
        );

      const experience =
        extractExperience(
          normalizedCVText
        );

      const education =
        extractEducation(
          normalizedCVText
        );

      const certifications =
        extractCertifications(
          normalizedCVText
        );

      // =============================================
      // CREATE CANDIDATE
      // =============================================

      const candidate = {
        candidateId:
          `candidate-${Date.now()}-${Math.floor(
            Math.random() * 10000
          )}`,

        name,

        email,

        phone,

        linkedin,

        skills,

        experience,

        education,

        certifications,

        originalFile:
          req.file.filename,

        originalName:
          req.file.originalname,

        cvText:
          normalizedCVText,

        evaluation:
          null,

        createdAt:
          new Date().toISOString(),
      };

      // =============================================
      // AUTO EVALUATE
      // =============================================

      if (
        activeJobCriteria.jobTitle
      ) {
        candidate.evaluation =
          evaluateCandidate(
            candidate
          );
      }

      candidates.push(candidate);

      console.log(
        "Candidate created:",
        candidate.candidateId
      );

      res.status(201).json({
        message:
          "CV uploaded and processed successfully.",

        candidate,
      });
    } catch (error) {
      console.error(
        "CV upload error:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Could not process CV.",
      });
    }
  }
);

// ==================================================
// GET ALL CANDIDATES
// ==================================================

app.get(
  "/api/candidates",
  (req, res) => {
    const sortedCandidates =
      [...candidates].sort(
        (a, b) => {
          const scoreA =
            Number(
              a.evaluation
                ?.matchScore
            ) || 0;

          const scoreB =
            Number(
              b.evaluation
                ?.matchScore
            ) || 0;

          return scoreB - scoreA;
        }
      );

    res.json({
      candidates:
        sortedCandidates,
    });
  }
);

// ==================================================
// GET ONE CANDIDATE
// ==================================================

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
      return res
        .status(404)
        .json({
          message:
            "Candidate not found.",
        });
    }

    res.json({
      candidate,
    });
  }
);

// ==================================================
// EVALUATE ONE CANDIDATE
// ==================================================

app.post(
  "/api/candidates/:id/evaluate",

  (req, res) => {
    try {
      if (
        !activeJobCriteria.jobTitle
      ) {
        return res
          .status(400)
          .json({
            message:
              "Create a job before evaluating candidates.",
          });
      }

      const candidate =
        candidates.find(
          (item) =>
            item.candidateId ===
            req.params.id
        );

      if (!candidate) {
        return res
          .status(404)
          .json({
            message:
              "Candidate not found.",
          });
      }

      candidate.evaluation =
        evaluateCandidate(
          candidate
        );

      res.json({
        message:
          "Candidate evaluated successfully.",

        candidate,

        evaluation:
          candidate.evaluation,
      });
    } catch (error) {
      console.error(
        "Evaluation error:",
        error
      );

      res.status(500).json({
        message:
          "Could not evaluate candidate.",
      });
    }
  }
);

// ==================================================
// EVALUATE ALL CANDIDATES
// ==================================================

app.post(
  "/api/candidates/evaluate-all",

  (req, res) => {
    try {
      if (
        !activeJobCriteria.jobTitle
      ) {
        return res
          .status(400)
          .json({
            message:
              "Create a job before evaluating candidates.",
          });
      }

      const evaluated =
        candidates.map(
          (candidate) => {
            candidate.evaluation =
              evaluateCandidate(
                candidate
              );

            return candidate;
          }
        );

      res.json({
        message:
          `${evaluated.length} candidate(s) evaluated successfully.`,

        candidates:
          evaluated,
      });
    } catch (error) {
      console.error(
        "Evaluate all error:",
        error
      );

      res.status(500).json({
        message:
          "Could not evaluate candidates.",
      });
    }
  }
);

// ==================================================
// EVALUATE CANDIDATE FROM REQUEST BODY
// ==================================================

app.post(
  "/api/candidates/evaluate",

  (req, res) => {
    try {
      if (
        !activeJobCriteria.jobTitle
      ) {
        return res
          .status(400)
          .json({
            message:
              "Create a job before evaluating candidates.",
          });
      }

      const candidate =
        req.body;

      if (
        !candidate ||
        Object.keys(candidate).length === 0
      ) {
        return res
          .status(400)
          .json({
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

        evaluation,
      });
    } catch (error) {
      console.error(
        "Evaluation error:",
        error
      );

      res.status(500).json({
        message:
          "Could not evaluate candidate.",
      });
    }
  }
);

// ==================================================
// DELETE ALL CANDIDATES
// ==================================================

app.delete(
  "/api/candidates",
  (req, res) => {
    try {
      candidates.length = 0;

      res.json({
        message:
          "All candidates deleted successfully.",
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Could not delete candidates.",
      });
    }
  }
);

// ==================================================
// DELETE ONE CANDIDATE
// ==================================================

app.delete(
  "/api/candidates/:id",

  (req, res) => {
    const index =
      candidates.findIndex(
        (candidate) =>
          candidate.candidateId ===
          req.params.id
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
          message:
            "Candidate not found.",
        });
    }

    const deleted =
      candidates.splice(
        index,
        1
      );

    res.json({
      message:
        "Candidate deleted successfully.",

      candidate:
        deleted[0],
    });
  }
);

// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Server error:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      return res
        .status(400)
        .json({
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

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);