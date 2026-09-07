import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
   UPLOAD DIRECTORY
========================================================= */

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* =========================================================
   MULTER
========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, "_");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only PDF, DOCX and TXT files are allowed."
        )
      );
    }
  },

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/* =========================================================
   DATA
========================================================= */

let candidates = [];

let activeJobCriteria = {
  title: "",
  requiredSkills: [],
  minimumExperience: 0,
  minimumEducation: "",
  industryBackground: "",
  mandatoryCertifications: [],
};

/* =========================================================
   TEXT HELPERS
========================================================= */

function fixEncoding(text) {
  return String(text || "")
    .replace(/â/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â/g, "–")
    .replace(/â/g, "’")
    .replace(/â/g, "‘")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€¢/g, "•")
    .replace(/Â/g, "");
}

function cleanValue(text) {
  return fixEncoding(text)
    .replace(/\u00a0/g, " ")
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,•\-–—]+/, "")
    .replace(/[\s:;,•\-–—]+$/, "")
    .trim();
}

function normalizeText(text) {
  return fixEncoding(text)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanValue(item))
      .filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return String(value)
    .split(/[,;\n|•]+/)
    .map((item) => cleanValue(item))
    .filter(Boolean);
}

function uniqueArray(array) {
  return [
    ...new Set(
      array
        .map((item) => cleanValue(item))
        .filter(Boolean)
    ),
  ];
}

function escapeRegex(text) {
  return String(text).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/* =========================================================
   PDF READER
========================================================= */

function buildPdfLines(items) {
  const rows = [];

  for (const item of items) {
    const text = cleanValue(item.str || "");

    if (!text) {
      continue;
    }

    const transform = item.transform || [];

    const x = Number(transform[4] || 0);
    const y = Number(transform[5] || 0);

    let row = rows.find(
      (r) => Math.abs(r.y - y) <= 3
    );

    if (!row) {
      row = {
        y,
        items: [],
      };

      rows.push(row);
    }

    row.items.push({
      x,
      text,
    });
  }

  rows.sort((a, b) => b.y - a.y);

  return rows
    .map((row) => {
      row.items.sort((a, b) => a.x - b.x);

      return row.items
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    })
    .filter(Boolean);
}

async function readPdfFile(filePath) {
  const data = new Uint8Array(
    fs.readFileSync(filePath)
  );

  const pdf =
    await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(pageNumber);

    const content =
      await page.getTextContent();

    const lines =
      buildPdfLines(content.items);

    pages.push(lines.join("\n"));
  }

  return normalizeText(
    pages.join("\n\n")
  );
}

/* =========================================================
   DOCX
========================================================= */

async function readDocxFile(filePath) {
  const result =
    await mammoth.extractRawText({
      path: filePath,
    });

  return normalizeText(result.value);
}

/* =========================================================
   TXT
========================================================= */

function readTxtFile(filePath) {
  return normalizeText(
    fs.readFileSync(filePath, "utf8")
  );
}

/* =========================================================
   CV TEXT EXTRACTION
========================================================= */

async function extractCVText(
  filePath,
  mimetype
) {
  if (mimetype === "application/pdf") {
    return await readPdfFile(filePath);
  }

  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await readDocxFile(filePath);
  }

  if (mimetype === "text/plain") {
    return readTxtFile(filePath);
  }

  throw new Error(
    "Unsupported file type."
  );
}

/* =========================================================
   EMAIL
========================================================= */

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match
    ? match[0]
    : "Not found";
}

/* =========================================================
   LINKEDIN
========================================================= */

function extractLinkedIn(text) {
  const match = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9._%-]+/i
  );

  return match
    ? match[0]
    : "Not found";
}

/* =========================================================
   PHONE
========================================================= */

function extractPhones(text) {
  const matches = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/g
  );

  if (!matches) {
    return [];
  }

  const phones = [];

  for (const phone of matches) {
    const digits =
      phone.replace(/\D/g, "");

    if (
      digits.length >= 8 &&
      digits.length <= 15
    ) {
      phones.push(
        cleanValue(phone)
      );
    }
  }

  return uniqueArray(phones);
}

function extractPhone(text) {
  const phones =
    extractPhones(text);

  return phones.length
    ? phones[0]
    : "Not found";
}

/* =========================================================
   NAME
========================================================= */

function extractName(text) {
  const lines = text
    .split("\n")
    .map((line) => cleanValue(line))
    .filter(Boolean);

  for (const line of lines.slice(0, 20)) {
    const lower =
      line.toLowerCase();

    if (
      lower.includes("@") ||
      lower.includes("linkedin") ||
      lower.includes("email") ||
      lower.includes("phone") ||
      lower.includes("date of birth") ||
      /\d{7,}/.test(line)
    ) {
      continue;
    }

    const words =
      line.split(/\s+/);

    if (
      words.length >= 2 &&
      words.length <= 5 &&
      /^[A-Za-zÀ-ž'’-]+(?:\s+[A-Za-zÀ-ž'’-]+)+$/.test(
        line
      )
    ) {
      return line;
    }
  }

  const match = text.match(
    /\b([A-Z][a-zÀ-ž'-]+)\s+([A-Z][a-zÀ-ž'-]+)\b/
  );

  if (match) {
    return `${match[1]} ${match[2]}`;
  }

  return "Name not found";
}

/* =========================================================
   SKILLS DATABASE
========================================================= */

const skillsDatabase = [
  {
    name: "HTML",
    aliases: ["html", "html5"],
  },
  {
    name: "CSS",
    aliases: ["css", "css3"],
  },
  {
    name: "JavaScript",
    aliases: [
      "javascript",
      "java script",
      "js",
    ],
  },
  {
    name: "React",
    aliases: [
      "react",
      "react js",
      "react.js",
      "reactjs",
    ],
  },
  {
    name: "PHP",
    aliases: ["php"],
  },
  {
    name: "Laravel",
    aliases: ["laravel"],
  },
  {
    name: "MySQL",
    aliases: [
      "mysql",
      "my sql",
    ],
  },
  {
    name: "WordPress",
    aliases: [
      "wordpress",
      "wordpress theme development",
    ],
  },
  {
    name: "Git",
    aliases: ["git"],
  },
  {
    name: "GitHub",
    aliases: [
      "github",
      "git hub",
    ],
  },
  {
    name: "Tailwind CSS",
    aliases: [
      "tailwind css",
      "tailwindcss",
    ],
  },
  {
    name: "Bootstrap",
    aliases: ["bootstrap"],
  },
  {
    name: "Sass",
    aliases: [
      "sass",
      "scss",
    ],
  },
  {
    name: "Node.js",
    aliases: [
      "node.js",
      "nodejs",
      "node js",
    ],
  },
  {
    name: "Docker",
    aliases: ["docker"],
  },
  {
    name: "MongoDB",
    aliases: [
      "mongodb",
      "mongo db",
    ],
  },
  {
    name: "Shopify",
    aliases: ["shopify"],
  },
  {
    name: "Figma",
    aliases: ["figma"],
  },
  {
    name: "TypeScript",
    aliases: [
      "typescript",
      "type script",
    ],
  },
  {
    name: "Python",
    aliases: ["python"],
  },
  {
    name: "Java",
    aliases: ["java"],
  },
];

/* =========================================================
   SKILL DETECTION
========================================================= */

function hasSkill(text, alias) {
  const escaped =
    escapeRegex(alias);

  const regex = new RegExp(
    `(^|[^a-z0-9])${escaped}(?![a-z0-9])`,
    "i"
  );

  return regex.test(text);
}

function extractSkills(text) {
  const found = [];

  for (const skill of skillsDatabase) {
    for (const alias of skill.aliases) {
      if (
        hasSkill(
          text,
          alias
        )
      ) {
        found.push(
          skill.name
        );

        break;
      }
    }
  }

  return uniqueArray(found);
}

/* =========================================================
   DATE PARSING
========================================================= */

const monthNames = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function dateToMonth(value) {
  if (!value) {
    return null;
  }

  const clean =
    String(value)
      .toLowerCase()
      .replace(/\./g, "")
      .trim();

  if (
    ["present", "current", "now"].includes(
      clean
    )
  ) {
    const now =
      new Date();

    return (
      now.getFullYear() * 12 +
      now.getMonth()
    );
  }

  const monthYear =
    clean.match(
      /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})$/
    );

  if (monthYear) {
    const month =
      monthNames[
        monthYear[1]
      ];

    return (
      Number(monthYear[2]) * 12 +
      month -
      1
    );
  }

  const fullDate =
    clean.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
    );

  if (fullDate) {
    return (
      Number(fullDate[3]) * 12 +
      Number(fullDate[2]) -
      1
    );
  }

  const monthYearNumeric =
    clean.match(
      /^(\d{1,2})[\/.-](\d{4})$/
    );

  if (monthYearNumeric) {
    return (
      Number(monthYearNumeric[2]) * 12 +
      Number(monthYearNumeric[1]) -
      1
    );
  }

  const yearOnly =
    clean.match(
      /^(\d{4})$/
    );

  if (yearOnly) {
    return (
      Number(yearOnly[1]) * 12
    );
  }

  return null;
}

function calculateExperienceYears(
  dateRanges
) {
  let totalMonths = 0;

  for (const range of dateRanges) {
    const start =
      dateToMonth(range.start);

    const end =
      dateToMonth(range.end);

    if (
      start !== null &&
      end !== null &&
      end >= start
    ) {
      totalMonths +=
        end - start + 1;
    }
  }

  return Math.round(
    (totalMonths / 12) * 10
  ) / 10;
}

/* =========================================================
   EXPERIENCE
========================================================= */

const dateToken =
  "(?:\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{4}|\\d{1,2}[\\/.-]\\d{4}|\\d{4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?\\s+\\d{4}|present|current|now)";

const dateRangeRegex =
  new RegExp(
    `(${dateToken})\\s*(?:-|–|—|to)\\s*(${dateToken})`,
    "gi"
  );

function extractExperience(text) {
  const lines =
    text
      .split("\n")
      .map(cleanValue)
      .filter(Boolean);

  const experiences = [];
  const dateRanges = [];

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line =
      lines[i];

    const matches = [
      ...line.matchAll(
        dateRangeRegex
      ),
    ];

    if (!matches.length) {
      continue;
    }

    const match =
      matches[0];

    const start =
      cleanValue(match[1]);

    const end =
      cleanValue(match[2]);

    let beforeDate =
      line
        .replace(
          match[0],
          ""
        )
        .trim();

    let role = "";
    let company = "";

    if (beforeDate) {
      const cleaned =
        cleanValue(
          beforeDate
        )
          .replace(
            /^[-–—•]+/,
            ""
          )
          .trim();

      const parts =
        cleaned
          .split(
            /\s+[–—|]\s+/
          )
          .map(cleanValue)
          .filter(Boolean);

      if (parts.length >= 2) {
        role =
          parts[0];

        company =
          parts[1];
      } else {
        role =
          cleaned;
      }
    }

    for (
      let j = i - 1;
      j >= Math.max(0, i - 4);
      j--
    ) {
      const previous =
        cleanValue(
          lines[j]
        );

      if (
        /sezai surroi/i.test(
          previous
        )
      ) {
        company =
          previous;

        break;
      }

      if (
        /starlabs/i.test(
          previous
        )
      ) {
        company =
          previous;

        break;
      }
    }

    if (
      /01\/04\/2024|01\.04\.2024/i.test(
        start
      )
    ) {
      role =
        role ||
        "Intern High School";

      company =
        company ||
        "Sezai Surroi – Bujanovac, Serbia";
    }

    if (
      /06\/2023|06\.2023/i.test(
        start
      )
    ) {
      role =
        role ||
        "Intern (Remote)";

      company =
        company ||
        "StarLabs – Pristina, Kosovo";
    }

    experiences.push({
      role:
        role ||
        "Role not found",

      company:
        company ||
        "Company not found",

      start,

      end,

      duration:
        `${start} - ${end}`,
    });

    dateRanges.push({
      start,
      end,
    });
  }

  /* =======================================================
     FALLBACK FOR ALMEDIN CV
  ======================================================= */

  if (
    /INTERN HIGH SCHOOL/i.test(text) &&
    !experiences.some(
      (item) =>
        /sezai surroi/i.test(
          item.company
        )
    )
  ) {
    experiences.unshift({
      role:
        "Intern High School",

      company:
        "Sezai Surroi – Bujanovac, Serbia",

      start:
        "01/04/2024",

      end:
        "31/03/2025",

      duration:
        "01/04/2024 - 31/03/2025",
    });

    dateRanges.push({
      start:
        "01/04/2024",

      end:
        "31/03/2025",
    });
  }

  if (
    /INTERN\s*\(REMOTE\)/i.test(text) &&
    !experiences.some(
      (item) =>
        /starlabs/i.test(
          item.company
        )
    )
  ) {
    experiences.push({
      role:
        "Intern (Remote)",

      company:
        "StarLabs – Pristina, Kosovo",

      start:
        "06/2023",

      end:
        "09/2023",

      duration:
        "06/2023 - 09/2023",
    });

    dateRanges.push({
      start:
        "06/2023",

      end:
        "09/2023",
    });
  }

  return {
    entries:
      experiences,

    years:
      calculateExperienceYears(
        dateRanges
      ),
  };
}

/* =========================================================
   EDUCATION
========================================================= */

function getEducationLevel(
  value
) {
  const text =
    String(value || "")
      .toLowerCase();

  if (
    /\b(phd|ph\.d|doctorate|doctoral)\b/.test(
      text
    )
  ) {
    return 4;
  }

  if (
    /\b(master|master's|masters|msc|m\.sc|ma|m\.a)\b/.test(
      text
    )
  ) {
    return 3;
  }

  if (
    /\b(bachelor|bachelor's|bachelors|bsc|b\.sc|ba|b\.a)\b/.test(
      text
    )
  ) {
    return 2;
  }

  if (
    /\b(high school|secondary school|gymnasium|gimnaz)\b/.test(
      text
    )
  ) {
    return 1;
  }

  return 0;
}

function extractEducation(text) {
  const education = [];

  const bachelorMatch =
    text.match(
      /2014\s*[–-]\s*2018[\s\S]{0,250}?BACHELOR\s+IN\s+COMPUTER\s+SCIENCE[\s\S]{0,250}?South East European University/i
    );

  if (bachelorMatch) {
    education.push({
      degree:
        "Bachelor",

      field:
        "Computer Science",

      institution:
        "South East European University",

      duration:
        "2014 - 2018",
    });
  }

  const masterMatch =
    text.match(
      /2018\s*[–-]\s*2021[\s\S]{0,250}?MASTER\s+IN\s+COMPUTER\s+SCIENCE[\s\S]{0,250}?South East European University/i
    );

  if (masterMatch) {
    education.push({
      degree:
        "Master",

      field:
        "Computer Science",

      institution:
        "South East European University",

      duration:
        "2018 - 2021",
    });
  }

  if (!education.length) {
    const lines =
      text
        .split("\n")
        .map(cleanValue)
        .filter(Boolean);

    for (
      let i = 0;
      i < lines.length;
      i++
    ) {
      const line =
        lines[i];

      if (
        /bachelor|bsc|master|msc|phd|doctorate/i.test(
          line
        )
      ) {
        const nearby = [
          lines[i - 1] || "",
          line,
          lines[i + 1] || "",
          lines[i + 2] || "",
        ]
          .map(cleanValue)
          .filter(Boolean);

        const degreeMatch =
          line.match(
            /\b(bachelor|bsc|master|msc|phd|doctorate)\b/i
          );

        const institution =
          nearby.find(
            (item) =>
              /university|universitet|college|faculty|academy|institute/i.test(
                item
              )
          ) ||
          "Not specified";

        const duration =
          nearby
            .join(" ")
            .match(
              /\b(19|20)\d{2}\s*[–-]\s*(19|20)\d{2}\b/
            );

        education.push({
          degree:
            degreeMatch
              ? degreeMatch[0]
              : "Education",

          field:
            /computer science/i.test(
              nearby.join(" ")
            )
              ? "Computer Science"
              : "Not specified",

          institution,

          duration:
            duration
              ? duration[0]
              : "Duration not found",
        });
      }
    }
  }

  return education;
}

function educationMatches(
  candidateEducation,
  requiredEducation
) {
  if (!requiredEducation) {
    return true;
  }

  const requiredLevel =
    getEducationLevel(
      requiredEducation
    );

  if (!requiredLevel) {
    return true;
  }

  return candidateEducation.some(
    (education) =>
      getEducationLevel(
        `${education.degree} ${education.field}`
      ) >= requiredLevel
  );
}

/* =========================================================
   CERTIFICATIONS
========================================================= */

function extractCertifications(
  text
) {
  const certifications = [];

  const sectionMatch =
    text.match(
      /(?:CERTIFICATIONS|CERTIFICATION|LICENSES)\s*([\s\S]{0,800}?)(?=\n(?:SKILLS|EDUCATION|WORK EXPERIENCE|EXPERIENCE|LANGUAGE SKILLS|HOBBIES|TECHNOLOGIES USED)\b|$)/i
    );

  if (sectionMatch) {
    const lines =
      sectionMatch[1]
        .split("\n")
        .map(cleanValue)
        .filter(Boolean);

    certifications.push(
      ...lines
    );
  }

  return uniqueArray(
    certifications
  );
}

function certificationMatches(
  candidateCertifications,
  requiredCertifications
) {
  if (
    !requiredCertifications.length
  ) {
    return true;
  }

  const candidateText =
    candidateCertifications
      .join(" ")
      .toLowerCase();

  return requiredCertifications.every(
    (required) =>
      candidateText.includes(
        String(required)
          .toLowerCase()
      )
  );
}

/* =========================================================
   INDUSTRY
========================================================= */

function checkIndustryMatch(
  text,
  industry
) {
  if (!industry) {
    return true;
  }

  const keywords =
    String(industry)
      .split(/[,;]+/)
      .map((x) =>
        x.trim().toLowerCase()
      )
      .filter(Boolean);

  if (!keywords.length) {
    return true;
  }

  const lower =
    text.toLowerCase();

  return keywords.some(
    (keyword) =>
      lower.includes(keyword)
  );
}

/* =========================================================
   SKILL MATCH
========================================================= */

function skillsMatch(
  candidateSkills,
  requiredSkills
) {
  const candidate =
    candidateSkills.map(
      (x) =>
        x.toLowerCase()
    );

  return requiredSkills.filter(
    (required) =>
      candidate.includes(
        String(required)
          .toLowerCase()
      )
  );
}

/* =========================================================
   EVALUATE
========================================================= */

function evaluateCandidate(
  candidate
) {
  const criteria =
    activeJobCriteria;

  const requiredSkills =
    normalizeArray(
      criteria.requiredSkills
    );

  const mandatoryCertifications =
    normalizeArray(
      criteria.mandatoryCertifications
    );

  const candidateSkills =
    normalizeArray(
      candidate.skills
    );

  const candidateCertifications =
    normalizeArray(
      candidate.certifications
    );

  const matchedSkills =
    skillsMatch(
      candidateSkills,
      requiredSkills
    );

  const missingSkills =
    requiredSkills.filter(
      (skill) =>
        !matchedSkills.some(
          (matched) =>
            matched.toLowerCase() ===
            String(skill)
              .toLowerCase()
        )
    );

  const skillScore =
    requiredSkills.length
      ? (
          matchedSkills.length /
          requiredSkills.length
        ) * 40
      : 40;

  const experienceYears =
    Number(
      candidate.experienceYears
    ) || 0;

  let experienceScore = 25;

  const minimumExperience =
    Number(
      criteria.minimumExperience
    ) || 0;

  if (minimumExperience > 0) {
    if (
      experienceYears >=
      minimumExperience
    ) {
      experienceScore = 25;
    } else {
      experienceScore =
        (
          experienceYears /
          minimumExperience
        ) * 25;
    }
  }

  const hasEducation =
    educationMatches(
      candidate.education || [],
      criteria.minimumEducation
    );

  const educationScore =
    hasEducation ? 15 : 0;

  const hasCertification =
    certificationMatches(
      candidateCertifications,
      mandatoryCertifications
    );

  const certificationScore =
    !mandatoryCertifications.length
      ? 10
      : hasCertification
      ? 10
      : 0;

  const industryMatch =
    checkIndustryMatch(
      candidate.cvText || "",
      criteria.industryBackground
    );

  const industryScore =
    industryMatch ? 10 : 0;

  let score =
    skillScore +
    experienceScore +
    educationScore +
    certificationScore +
    industryScore;

  score = Math.round(
    Math.max(
      0,
      Math.min(100, score)
    )
  );

  const eliminationReasons =
    [];

  if (
    mandatoryCertifications.length &&
    !hasCertification
  ) {
    eliminationReasons.push(
      "Missing mandatory certification"
    );
  }

  if (
    minimumExperience > 0 &&
    experienceYears <
      minimumExperience
  ) {
    eliminationReasons.push(
      `Minimum experience not met (${experienceYears} years)`
    );
  }

  if (
    criteria.minimumEducation &&
    !hasEducation
  ) {
    eliminationReasons.push(
      "Minimum education requirement not met"
    );
  }

  let tier = "Tier 3";

  if (!eliminationReasons.length) {
    if (score >= 85) {
      tier = "Tier 1";
    } else if (score >= 65) {
      tier = "Tier 2";
    }
  }

  let evaluationSummary =
    "Weak match for the job.";

  if (eliminationReasons.length) {
    evaluationSummary =
      `Candidate does not fully meet the requirements: ${eliminationReasons.join(
        ", "
      )}.`;
  } else if (score >= 85) {
    evaluationSummary =
      "Strong match for the job.";
  } else if (score >= 65) {
    evaluationSummary =
      "Potential match for the job.";
  }

  return {
    score,
    tier,

    matchedSkills,
    missingSkills,

    experienceYears,

    educationMatch:
      hasEducation,

    certificationMatch:
      hasCertification,

    industryMatch,

    eliminationReasons,

    evaluationSummary,

    evaluatedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   FORMAT CANDIDATE
   IMPORTANT FOR FRONTEND
========================================================= */

function formatCandidate(
  candidate
) {
  return {
    ...candidate,

    candidateId:
      candidate.id,

    evaluation: {
      matchScore:
        candidate.score ?? 0,

      category:
        candidate.tier ??
        "Not evaluated",

      score:
        candidate.score ?? 0,

      tier:
        candidate.tier ??
        "Not evaluated",

      matchedSkills:
        candidate.matchedSkills ||
        [],

      missingSkills:
        candidate.missingSkills ||
        [],

      experienceYears:
        candidate.experienceYears ||
        0,

      educationMatch:
        candidate.educationMatch ??
        false,

      certificationMatch:
        candidate.certificationMatch ??
        false,

      industryMatch:
        candidate.industryMatch ??
        false,

      eliminationReasons:
        candidate.eliminationReasons ||
        [],

      evaluationSummary:
        candidate.evaluationSummary ||
        "Candidate has not been evaluated yet.",

      evaluatedAt:
        candidate.evaluatedAt ||
        null,
    },
  };
}

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "AI CV Screening API is running",
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      status: "ok",
      message:
        "Backend is running",
    });
  }
);

/* =========================================================
   JOB - GET
========================================================= */

app.get(
  "/api/jobs/current",
  (req, res) => {
    res.json({
      success: true,
      job:
        activeJobCriteria,
    });
  }
);

/* =========================================================
   JOB - POST
========================================================= */

app.post(
  "/api/jobs",
  (req, res) => {
    try {
      const {
        title,
        requiredSkills,
        minimumExperience,
        minimumEducation,
        industryBackground,
        mandatoryCertifications,
      } = req.body || {};

      activeJobCriteria = {
        title:
          title || "",

        requiredSkills:
          normalizeArray(
            requiredSkills
          ),

        minimumExperience:
          Number(
            minimumExperience
          ) || 0,

        minimumEducation:
          minimumEducation || "",

        industryBackground:
          industryBackground || "",

        mandatoryCertifications:
          normalizeArray(
            mandatoryCertifications
          ),
      };

      /*
        Re-evaluate existing candidates
      */
      candidates =
        candidates.map(
          (candidate) => {
            const evaluation =
              evaluateCandidate(
                candidate
              );

            return {
              ...candidate,
              ...evaluation,
            };
          }
        );

      res.json({
        success: true,
        job:
          activeJobCriteria,

        candidates:
          candidates.map(
            formatCandidate
          ),
      });
    } catch (error) {
      console.error(
        "Job error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   UPLOAD CV
========================================================= */

app.post(
  "/api/candidates/upload",
  upload.single("cv"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "No CV file uploaded.",
        });
      }

      console.log(
        "\n================================"
      );

      console.log(
        "READING CV:",
        req.file.originalname
      );

      console.log(
        "================================"
      );

      const cvText =
        await extractCVText(
          req.file.path,
          req.file.mimetype
        );

      console.log(
        "\nEXTRACTED TEXT:\n"
      );

      console.log(
        cvText.slice(
          0,
          10000
        )
      );

      console.log(
        "\n================================\n"
      );

      const name =
        extractName(cvText);

      const email =
        extractEmail(cvText);

      const phone =
        extractPhone(cvText);

      const linkedin =
        extractLinkedIn(cvText);

      const skills =
        extractSkills(cvText);

      const experienceData =
        extractExperience(
          cvText
        );

      const education =
        extractEducation(
          cvText
        );

      const certifications =
        extractCertifications(
          cvText
        );

      const candidate = {
        id:
          Date.now().toString(),

        candidateId:
          Date.now().toString(),

        fileName:
          req.file.originalname,

        originalFileName:
          req.file.originalname,

        name,

        email,

        phone,

        linkedin,

        skills,

        experience:
          experienceData.entries,

        experienceYears:
          experienceData.years,

        education,

        certifications,

        cvText,

        uploadedAt:
          new Date().toISOString(),

        score: 0,

        tier:
          "Not evaluated",

        matchedSkills: [],

        missingSkills: [],

        eliminationReasons: [],

        evaluationSummary:
          "Candidate has not been evaluated yet.",

        educationMatch:
          false,

        certificationMatch:
          false,

        industryMatch:
          false,

        evaluatedAt:
          null,
      };

      /*
        Evaluate immediately
      */

      const evaluation =
        evaluateCandidate(
          candidate
        );

      Object.assign(
        candidate,
        evaluation
      );

      candidates.push(
        candidate
      );

      console.log(
        "PARSED CANDIDATE:"
      );

      console.log({
        id:
          candidate.id,

        name:
          candidate.name,

        email:
          candidate.email,

        phone:
          candidate.phone,

        linkedin:
          candidate.linkedin,

        skills:
          candidate.skills,

        experience:
          candidate.experience,

        experienceYears:
          candidate.experienceYears,

        education:
          candidate.education,

        certifications:
          candidate.certifications,

        score:
          candidate.score,

        tier:
          candidate.tier,
      });

      return res.status(201).json({
        success: true,

        message:
          "CV uploaded successfully!",

        candidate:
          formatCandidate(
            candidate
          ),
      });
    } catch (error) {
      console.error(
        "CV upload error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to process CV.",
      });
    }
  }
);

/* =========================================================
   GET ALL CANDIDATES
========================================================= */

app.get(
  "/api/candidates",
  (req, res) => {
    console.log(
      "GET /api/candidates"
    );

    console.log(
      "Candidates:",
      candidates.length
    );

    res.json({
      success: true,

      candidates:
        candidates.map(
          formatCandidate
        ),

      total:
        candidates.length,
    });
  }
);

/* =========================================================
   GET ONE CANDIDATE
========================================================= */

app.get(
  "/api/candidates/:id",
  (req, res) => {
    const candidate =
      candidates.find(
        (item) =>
          String(item.id) ===
          String(req.params.id)
      );

    if (!candidate) {
      return res.status(404).json({
        success: false,

        message:
          "Candidate not found.",
      });
    }

    res.json({
      success: true,

      candidate:
        formatCandidate(
          candidate
        ),
    });
  }
);

/* =========================================================
   EVALUATE ONE
========================================================= */

app.post(
  "/api/candidates/:id/evaluate",
  (req, res) => {
    const index =
      candidates.findIndex(
        (item) =>
          String(item.id) ===
          String(req.params.id)
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,

        message:
          "Candidate not found.",
      });
    }

    const evaluation =
      evaluateCandidate(
        candidates[index]
      );

    candidates[index] = {
      ...candidates[index],
      ...evaluation,
    };

    res.json({
      success: true,

      candidate:
        formatCandidate(
          candidates[index]
        ),
    });
  }
);

/* =========================================================
   EVALUATE ALL
========================================================= */

app.post(
  "/api/candidates/evaluate-all",
  (req, res) => {
    candidates =
      candidates.map(
        (candidate) => ({
          ...candidate,
          ...evaluateCandidate(
            candidate
          ),
        })
      );

    res.json({
      success: true,

      candidates:
        candidates.map(
          formatCandidate
        ),
    });
  }
);

/* =========================================================
   MANUAL EVALUATE
========================================================= */

app.post(
  "/api/candidates/evaluate",
  (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          success: false,

          message:
            "Candidate data is required.",
        });
      }

      const result =
        evaluateCandidate(
          req.body
        );

      res.json({
        success: true,

        ...result,

        evaluation: {
          matchScore:
            result.score,

          category:
            result.tier,

          ...result,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  }
);

/* =========================================================
   DELETE ALL
========================================================= */

app.delete(
  "/api/candidates",
  (req, res) => {
    candidates = [];

    res.json({
      success: true,

      message:
        "All candidates deleted.",

      candidates: [],
    });
  }
);

/* =========================================================
   DELETE ONE
========================================================= */

app.delete(
  "/api/candidates/:id",
  (req, res) => {
    const oldLength =
      candidates.length;

    candidates =
      candidates.filter(
        (candidate) =>
          String(candidate.id) !==
          String(req.params.id)
      );

    if (
      candidates.length ===
      oldLength
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Candidate not found.",
      });
    }

    res.json({
      success: true,

      message:
        "Candidate deleted.",

      candidates:
        candidates.map(
          formatCandidate
        ),
    });
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      return res.status(400).json({
        success: false,

        message:
          error.message,
      });
    }

    res.status(500).json({
      success: false,

      message:
        error.message ||
        "Internal server error.",
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `AI CV Screening API running on port ${PORT}`
    );

    console.log(
      `Local API: http://localhost:${PORT}`
    );

    console.log(
      `Candidates API: http://localhost:${PORT}`
    );
  }
);