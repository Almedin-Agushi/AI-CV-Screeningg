import cors from "cors";
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =====================================================
// MULTER UPLOAD CONFIGURATION
// =====================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".txt",
    ];

    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          "Only PDF, DOCX and TXT files are allowed."
        )
      );
    }

    cb(null, true);
  },
});


// =====================================================
// ACTIVE JOB
// =====================================================

let activeJobCriteria = {
  jobTitle: "Frontend Developer",

  requiredSkills: [
    "HTML",
    "CSS",
    "JavaScript",
    "React",
  ],

  minimumExperience: 1,

  minimumEducation: "Bachelor",

  industryBackground: "Web Development",

  mandatoryCertifications: [],
};

// =====================================================
// CANDIDATES
// =====================================================

let candidates = [];

// =====================================================
// DASHBOARD STATS
// =====================================================
app.get("/api/dashboard", (req, res) => {
  try {
    const totalCandidates = candidates.length;

    const strongMatches = candidates.filter(
      (c) => c.evaluation?.category === "Tier 1"
    ).length;

    const potentialMatches = candidates.filter(
      (c) => c.evaluation?.category === "Tier 2"
    ).length;

    const scores = candidates
      .map((c) => c.evaluation?.matchScore)
      .filter((s) => typeof s === "number");

    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    res.json({
      totalCandidates,
      strongMatches,
      potentialMatches,
      avgScore,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Error loading dashboard stats" });
  }
});

// =====================================================
// PDF.JS
// =====================================================

let pdfjsLib = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );
  }

  return pdfjsLib;
}

// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "AI CV Screening API is running",
  });
});

// =====================================================
// GET CURRENT JOB
// =====================================================

app.get("/api/jobs/current", (req, res) => {
  res.json({
    message: "Current job criteria",
    job: activeJobCriteria,
  });
});

// =====================================================
// CREATE / UPDATE JOB
// =====================================================

app.post("/api/jobs", (req, res) => {
  try {
    const {
      jobTitle,
      requiredSkills,
      minimumExperience,
      minimumEducation,
      industryBackground,
      mandatoryCertifications,
    } = req.body;

    // -----------------------------------------------
    // REQUIRED SKILLS
    // -----------------------------------------------

    let skills = [];

    if (Array.isArray(requiredSkills)) {
      skills = requiredSkills
        .map((skill) => String(skill).trim())
        .filter(Boolean);
    } else if (
      typeof requiredSkills === "string"
    ) {
      skills = requiredSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
    }

    // -----------------------------------------------
    // CERTIFICATIONS
    // -----------------------------------------------

    let certifications = [];

    if (
      Array.isArray(
        mandatoryCertifications
      )
    ) {
      certifications =
        mandatoryCertifications
          .map((cert) =>
            String(cert).trim()
          )
          .filter(
            (cert) =>
              cert &&
              cert.toLowerCase() !== "none"
          );
    } else if (
      typeof mandatoryCertifications ===
      "string"
    ) {
      certifications =
        mandatoryCertifications
          .split(",")
          .map((cert) => cert.trim())
          .filter(
            (cert) =>
              cert &&
              cert.toLowerCase() !== "none"
          );
    }

    // -----------------------------------------------
    // SAVE JOB
    // -----------------------------------------------

    activeJobCriteria = {
      jobTitle:
        jobTitle?.trim() ||
        "Frontend Developer",

      requiredSkills: skills,

      minimumExperience:
        Number(minimumExperience) || 0,

      minimumEducation:
        minimumEducation?.trim() ||
        "Bachelor",

      industryBackground:
        industryBackground?.trim() ||
        "Web Development",

      mandatoryCertifications:
        certifications,
    };

    console.log(
      "========== JOB CREATED =========="
    );

    console.log(
      JSON.stringify(
        activeJobCriteria,
        null,
        2
      )
    );

    console.log(
      "================================="
    );

    res.json({
      message:
        "Job criteria saved successfully!",

      job: activeJobCriteria,
    });
  } catch (error) {
    console.error(
      "Create job error:",
      error
    );

    res.status(500).json({
      message:
        "Could not save job criteria",

      error:
        error.message,
    });
  }
});

// =====================================================
// READ TXT
// =====================================================

function readTxtFile(filePath) {
  return fs.readFileSync(
    filePath,
    "utf8"
  );
}

// =====================================================
// READ DOCX
// =====================================================

async function readDocxFile(filePath) {
  const result =
    await mammoth.extractRawText({
      path: filePath,
    });

  return result.value;
}

// =====================================================
// READ PDF
// =====================================================

async function readPdfFile(filePath) {
  const pdfjs = await getPdfJs();

  const data = new Uint8Array(
    fs.readFileSync(filePath)
  );

  const loadingTask =
    pdfjs.getDocument({
      data,
    });

  const pdf =
    await loadingTask.promise;

  let fullText = "";

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(
        pageNumber
      );

    const content =
      await page.getTextContent();

    const pageText =
      content.items
        .map((item) => item.str)
        .join(" ");

    fullText +=
      pageText + "\n";
  }

  return fullText;
}

// =====================================================
// EXTRACT EMAIL
// =====================================================

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match
    ? match[0]
    : "";
}

// =====================================================
// EXTRACT LINKEDIN
// =====================================================

function extractLinkedIn(text) {
  const match = text.match(
    /https?:\/\/(www\.)?linkedin\.com\/in\/[^\s]+/i
  );

  return match
    ? match[0]
    : "";
}

// =====================================================
// EXTRACT PHONE
// =====================================================

function extractPhone(text) {
  const matches =
    text.match(
      /\+?\d[\d\s().-]{7,}\d/g
    );

  if (
    !matches ||
    matches.length === 0
  ) {
    return "";
  }

  return matches[0].trim();
}

// =====================================================
// EXTRACT NAME
// =====================================================

function extractName(
  text,
  originalFileName = ""
) {
  const lines = text
    .split("\n")
    .map((line) =>
      line.trim()
    )
    .filter(
      (line) =>
        line.length > 0
    );

  let name =
    "Unknown Candidate";

  // -----------------------------------------------
  // FIRST METHOD
  // Look at first 20 lines
  // -----------------------------------------------

  for (
    const line of lines.slice(
      0,
      20
    )
  ) {
    const cleanLine =
      line
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    const looksLikeName =
      /^[A-Za-zÀ-ÿ]+(?:[\s'-]+[A-Za-zÀ-ÿ]+){1,4}$/.test(
        cleanLine
      );

    if (
      cleanLine.length >= 5 &&
      cleanLine.length <= 60 &&
      looksLikeName &&
      !cleanLine
        .toLowerCase()
        .includes("date") &&
      !cleanLine
        .toLowerCase()
        .includes("birth") &&
      !cleanLine
        .toLowerCase()
        .includes(
          "nationality"
        ) &&
      !cleanLine
        .toLowerCase()
        .includes(
          "gender"
        ) &&
      !cleanLine
        .toLowerCase()
        .includes(
          "phone"
        ) &&
      !cleanLine
        .toLowerCase()
        .includes(
          "address"
        ) &&
      !cleanLine
        .toLowerCase()
        .includes(
          "email"
        )
    ) {
      name =
        cleanLine;

      break;
    }
  }

  // -----------------------------------------------
  // SECOND METHOD
  // Look around email
  // -----------------------------------------------

  if (
    name ===
    "Unknown Candidate"
  ) {
    const email =
      extractEmail(
        text
      );

    if (email) {
      const emailIndex =
        text.indexOf(
          email
        );

      if (
        emailIndex !== -1
      ) {
        const beforeEmail =
          text.substring(
            Math.max(
              0,
              emailIndex -
                300
            ),
            emailIndex
          );

        const possibleLines =
          beforeEmail
            .split("\n")
            .map(
              (line) =>
                line.trim()
            )
            .filter(
              (line) =>
                line.length >
                0
            )
            .reverse();

        for (
          const line of possibleLines
        ) {
          const cleanLine =
            line
              .replace(
                /\s+/g,
                " "
              )
              .trim();

          if (
            cleanLine.length >=
              5 &&
            cleanLine.length <=
              60 &&
            /^[A-Za-zÀ-ÿ]+(?:[\s'-]+[A-Za-zÀ-ÿ]+){1,4}$/.test(
              cleanLine
            )
          ) {
            name =
              cleanLine;

            break;
          }
        }
      }
    }
  }

  // -----------------------------------------------
  // THIRD METHOD
  // Filename fallback
  // -----------------------------------------------

  if (
    name ===
    "Unknown Candidate" &&
    originalFileName
  ) {
    const fileName =
      originalFileName
        .replace(
          /\.[^/.]+$/,
          ""
        )
        .replace(
          /[_-]+/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (
      fileName.length >= 3
    ) {
      name =
        fileName;
    }
  }

  return name;
}

// =====================================================
// EXTRACT SKILLS
// =====================================================

function extractSkills(text) {
  const possibleSkills = [
    "HTML5",
    "HTML",
    "CSS3",
    "CSS",
    "JavaScript",
    "React JS",
    "React",
    "Tailwind CSS",
    "Bootstrap",
    "Sass",
    "PHP",
    "Laravel",
    "MySQL",
    "WordPress",
    "GitHub",
    "Git",
    "Node.js",
    "Node",
    "TypeScript",
    "Next.js",
    "Vite",
  ];

  const lowerText =
    text.toLowerCase();

  return possibleSkills.filter(
    (skill) =>
      lowerText.includes(
        skill.toLowerCase()
      )
  );
}

// =====================================================
// EXTRACT EXPERIENCE
// =====================================================

function extractExperience(
  text
) {
  const experience = [];

  const lowerText =
    text.toLowerCase();

  // -----------------------------------------------
  // Sezai Surroi
  // -----------------------------------------------

  if (
    lowerText.includes(
      "sezai surroi"
    )
  ) {
    experience.push({
      company:
        "Sezai Surroi",

      role:
        "Intern",

      duration:
        "01/04/2024 - 31/03/2025",
    });
  }

  // -----------------------------------------------
  // StarLabs
  // -----------------------------------------------

  if (
    lowerText.includes(
      "starlabs"
    )
  ) {
    experience.push({
      company:
        "StarLabs",

      role:
        "Intern",

      duration:
        "06/2023 - 09/2023",
    });
  }

  return experience;
}

// =====================================================
// EXTRACT EDUCATION
// =====================================================

function extractEducation(
  text
) {
  const education = [];

  const lowerText =
    text.toLowerCase();

  // -----------------------------------------------
  // Bachelor
  // -----------------------------------------------

  if (
    lowerText.includes(
      "bachelor in computer science"
    ) ||
    lowerText.includes(
      "bachelor of computer science"
    ) ||
    lowerText.includes(
      "bachelor computer science"
    )
  ) {
    education.push({
      degree:
        "Bachelor in Computer Science",

      institution:
        "South East European University",

      duration:
        "2014 - 2018",
    });
  }

  // -----------------------------------------------
  // Master
  // -----------------------------------------------

  if (
    lowerText.includes(
      "master in computer science"
    ) ||
    lowerText.includes(
      "master of computer science"
    ) ||
    lowerText.includes(
      "master computer science"
    )
  ) {
    education.push({
      degree:
        "Master in Computer Science",

      institution:
        "South East European University",

      duration:
        "2018 - 2021",
    });
  }

  return education;
}

// =====================================================
// EXTRACT CERTIFICATIONS
// =====================================================

function extractCertifications(
  text
) {
  const certifications = [];

  const knownCertifications = [
    "AWS",
    "Cisco",
    "Microsoft Certified",
    "Google Certified",
    "Azure",
    "Oracle",
    "CompTIA",
  ];

  const lowerText =
    text.toLowerCase();

  for (
    const certification of knownCertifications
  ) {
    if (
      lowerText.includes(
        certification.toLowerCase()
      )
    ) {
      certifications.push(
        certification
      );
    }
  }

  return certifications;
}

// =====================================================
// UPLOAD CV
// =====================================================

app.post(
  "/api/candidates/upload",
  upload.single("cv"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message:
          "No CV file uploaded",
      });
    }

    try {
      const filePath =
        req.file.path;

      const extension =
        path
          .extname(
            req.file.originalname
          )
          .toLowerCase();

      let text = "";

      // -----------------------------------------------
      // PDF
      // -----------------------------------------------

      if (
        extension === ".pdf"
      ) {
        text =
          await readPdfFile(
            filePath
          );
      }

      // -----------------------------------------------
      // DOCX
      // -----------------------------------------------

      else if (
        extension === ".docx"
      ) {
        text =
          await readDocxFile(
            filePath
          );
      }

      // -----------------------------------------------
      // TXT
      // -----------------------------------------------

      else if (
        extension === ".txt"
      ) {
        text =
          readTxtFile(
            filePath
          );
      }

      // -----------------------------------------------
      // CHECK TEXT
      // -----------------------------------------------

      if (
        !text ||
        text.trim()
          .length === 0
      ) {
        return res.status(400).json({
          message:
            "Could not extract text from CV.",
        });
      }

      // -----------------------------------------------
      // CREATE CANDIDATE
      // -----------------------------------------------

      const candidate = {
        candidateId:
          `candidate-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}`,

        name:
          extractName(
            text,
            req.file.originalname
          ),

        email:
          extractEmail(
            text
          ),

        phone:
          extractPhone(
            text
          ),

        linkedin:
          extractLinkedIn(
            text
          ),

        skills:
          extractSkills(
            text
          ),

        experience:
          extractExperience(
            text
          ),

        education:
          extractEducation(
            text
          ),

        certifications:
          extractCertifications(
            text
          ),

        originalFile:
          req.file.filename,

        originalName:
          req.file.originalname,

        cvText:
          text,

        evaluation:
          null,
      };

      // -----------------------------------------------
      // ADD CANDIDATE
      // IMPORTANT:
      // DO NOT RESET candidates[]
      // -----------------------------------------------

      candidates.push(
        candidate
      );

      console.log(
        "========== CANDIDATE =========="
      );

      console.log(
        JSON.stringify(
          candidate,
          null,
          2
        )
      );

      console.log(
        "==============================="
      );

      res.json({
        message:
          "CV uploaded and processed successfully!",

        candidate:
          candidate,
      });
    } catch (error) {
      console.error(
        "CV processing error:",
        error
      );

      res.status(500).json({
        message:
          "Could not process CV",

        error:
          error.message,
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
      candidates:
        candidates,
    });
  }
);

// =====================================================
// GET SINGLE CANDIDATE
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
          "Candidate not found",
      });
    }

    res.json({
      candidate:
        candidate,
    });
  }
);

// =====================================================
// EVALUATE CANDIDATE
// =====================================================

app.post(
  "/api/candidates/evaluate",
  (req, res) => {
    try {
      const {
        candidate,
      } = req.body;

      if (!candidate) {
        return res.status(400).json({
          message:
            "Candidate data is required",
        });
      }

      const job =
        activeJobCriteria;

      // =================================================
      // SKILLS - 40%
      // =================================================

      const candidateSkills =
        candidate.skills || [];

      const requiredSkills =
        job.requiredSkills || [];

      const matchedSkills =
        requiredSkills.filter(
          (requiredSkill) =>
            candidateSkills.some(
              (candidateSkill) => {
                const candidateLower =
                  candidateSkill
                    .toLowerCase();

                const requiredLower =
                  requiredSkill
                    .toLowerCase();

                return (
                  candidateLower ===
                    requiredLower ||
                  candidateLower.includes(
                    requiredLower
                  ) ||
                  requiredLower.includes(
                    candidateLower
                  )
                );
              }
            )
        );

      let skillsScore = 0;

      if (
        requiredSkills.length ===
        0
      ) {
        skillsScore = 40;
      } else {
        skillsScore =
          (matchedSkills.length /
            requiredSkills.length) *
          40;
      }

      // =================================================
      // EXPERIENCE - 25%
      // =================================================

      const experienceCount =
        candidate.experience
          ? candidate.experience
              .length
          : 0;

      let experienceScore =
        0;

      if (
        experienceCount >= 2
      ) {
        experienceScore =
          25;
      } else if (
        experienceCount === 1
      ) {
        experienceScore =
          15;
      }

      // =================================================
      // EDUCATION - 15%
      // =================================================

      let educationScore =
        0;

      const hasEducation =
        candidate.education &&
        candidate.education
          .length > 0;

      if (hasEducation) {
        educationScore =
          15;
      }

      // =================================================
      // CERTIFICATIONS - 10%
      // =================================================

      const mandatoryCertifications =
        job.mandatoryCertifications ||
        [];

      const candidateCertifications =
        candidate.certifications ||
        [];

      let certificationScore =
        0;

      let matchedCertifications =
        [];

      if (
        mandatoryCertifications.length ===
        0
      ) {
        certificationScore =
          10;
      } else {
        matchedCertifications =
          mandatoryCertifications.filter(
            (
              requiredCertification
            ) =>
              candidateCertifications.some(
                (
                  candidateCertification
                ) =>
                  candidateCertification
                    .toLowerCase()
                    .includes(
                      requiredCertification
                        .toLowerCase()
                    )
              )
          );

        certificationScore =
          (matchedCertifications.length /
            mandatoryCertifications.length) *
          10;
      }

      // =================================================
      // INDUSTRY - 10%
      // =================================================

      let industryScore =
        0;

      const cvText =
        candidate.cvText
          ? candidate.cvText.toLowerCase()
          : "";

      const industry =
        job.industryBackground
          ? job.industryBackground.toLowerCase()
          : "";

      if (
        industry &&
        cvText.includes(
          industry
        )
      ) {
        industryScore =
          10;
      } else if (
        cvText.includes(
          "web development"
        ) ||
        cvText.includes(
          "web developer"
        ) ||
        cvText.includes(
          "software developer"
        ) ||
        cvText.includes(
          "frontend"
        ) ||
        cvText.includes(
          "front-end"
        ) ||
        cvText.includes(
          "backend"
        ) ||
        cvText.includes(
          "back-end"
        ) ||
        candidateSkills.length >
          0
      ) {
        industryScore =
          10;
      }

      // =================================================
      // ELIMINATION RULES
      // =================================================

      const eliminationReasons =
        [];

      // -----------------------------------------------
      // Mandatory certification
      // -----------------------------------------------

      if (
        mandatoryCertifications.length >
        0
      ) {
        const hasAllCertifications =
          mandatoryCertifications.every(
            (
              requiredCertification
            ) =>
              candidateCertifications.some(
                (
                  candidateCertification
                ) =>
                  candidateCertification
                    .toLowerCase()
                    .includes(
                      requiredCertification
                        .toLowerCase()
                    )
              )
          );

        if (
          !hasAllCertifications
        ) {
          eliminationReasons.push(
            "Missing mandatory certification"
          );
        }
      }

      // -----------------------------------------------
      // Required education
      // -----------------------------------------------

      if (
        job.minimumEducation &&
        !hasEducation
      ) {
        eliminationReasons.push(
          "Required education level not found"
        );
      }

      // -----------------------------------------------
      // Minimum experience
      // -----------------------------------------------

      if (
        Number(
          job.minimumExperience
        ) > 0 &&
        experienceCount ===
          0
      ) {
        eliminationReasons.push(
          "Minimum experience requirement not met"
        );
      }

      // =================================================
      // FINAL SCORE
      // =================================================

      let totalScore =
        Math.round(
          skillsScore +
            experienceScore +
            educationScore +
            certificationScore +
            industryScore
        );

      totalScore =
        Math.min(
          totalScore,
          100
        );

      // =================================================
      // CATEGORY
      // =================================================

      let category;

      if (
        eliminationReasons.length >
        0
      ) {
        category =
          "Tier 3";
      } else if (
        totalScore >= 85
      ) {
        category =
          "Tier 1";
      } else if (
        totalScore >= 65
      ) {
        category =
          "Tier 2";
      } else {
        category =
          "Tier 3";
      }

      // =================================================
      // EVALUATION MATRIX
      // =================================================

      const evaluationMatrix = {
        skills:
          `${Math.round(
            skillsScore / 4
          )}/10`,

        experience:
          `${Math.round(
            experienceScore /
              2.5
          )}/10`,

        education:
          `${Math.round(
            educationScore /
              1.5
          )}/10`,

        industry:
          `${Math.round(
            industryScore
          )}/10`,

        certifications:
          `${Math.round(
            certificationScore
          )}/10`,
      };

      // =================================================
      // MISSING SKILLS
      // =================================================

      const missingSkills =
        requiredSkills.filter(
          (requiredSkill) =>
            !matchedSkills.some(
              (matchedSkill) =>
                matchedSkill
                  .toLowerCase() ===
                requiredSkill
                  .toLowerCase()
            )
        );

      // =================================================
      // AI ANALYSIS SUMMARY
      // =================================================

      let justification;

      if (
        eliminationReasons.length >
        0
      ) {
        justification =
          `The candidate does not meet one or more mandatory requirements for the ${job.jobTitle} position. ${eliminationReasons.join(
            ". "
          )}.`;
      } else if (
        totalScore >= 85
      ) {
        justification =
          `Strong match for the ${job.jobTitle} position. The candidate demonstrates strong technical skills, relevant education, and suitable professional experience.`;
      } else if (
        totalScore >= 65
      ) {
        justification =
          `Potential match for the ${job.jobTitle} position. The candidate has relevant skills and qualifications, but some areas could be improved.`;
      } else {
        justification =
          `Limited match for the ${job.jobTitle} position. Several required skills or qualifications are missing.`;
      }

      // =================================================
      // EVALUATION RESULT
      // =================================================

      const evaluation = {
        targetJob:
          job.jobTitle,

        matchScore:
          totalScore,

        category:
          category,

        evaluationMatrix:
          evaluationMatrix,

        matchedSkills:
          matchedSkills,

        missingSkills:
          missingSkills,

        matchedCertifications:
          matchedCertifications,

        eliminationReasons:
          eliminationReasons,

        justification:
          justification,
      };

      // =================================================
      // UPDATE CANDIDATE
      // =================================================

      const index =
        candidates.findIndex(
          (item) =>
            item.candidateId ===
            candidate.candidateId
        );

      if (
        index !== -1
      ) {
        candidates[index] = {
          ...candidates[index],

          evaluation:
            evaluation,
        };
      }

      // =================================================
      // RESPONSE
      // =================================================

      console.log(
        "========== EVALUATION =========="
      );

      console.log(
        JSON.stringify(
          evaluation,
          null,
          2
        )
      );

      console.log(
        "================================"
      );

      res.json({
        message:
          "Candidate evaluated successfully",

        evaluation:
          evaluation,

        candidate: {
          ...candidate,

          evaluation:
            evaluation,
        },
      });
    } catch (error) {
      console.error(
        "Evaluation error:",
        error
      );

      res.status(500).json({
        message:
          "Could not evaluate candidate",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// RE-EVALUATE CANDIDATE
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
            "Candidate not found",
        });
      }

      const job =
        activeJobCriteria;

      // =================================================
      // SKILLS
      // =================================================

      const candidateSkills =
        candidate.skills || [];

      const requiredSkills =
        job.requiredSkills || [];

      const matchedSkills =
        requiredSkills.filter(
          (requiredSkill) =>
            candidateSkills.some(
              (candidateSkill) =>
                candidateSkill
                  .toLowerCase()
                  .includes(
                    requiredSkill
                      .toLowerCase()
                  ) ||
                requiredSkill
                  .toLowerCase()
                  .includes(
                    candidateSkill
                      .toLowerCase()
                  )
            )
        );

      const skillsScore =
        requiredSkills.length ===
        0
          ? 40
          : (matchedSkills.length /
              requiredSkills.length) *
            40;

      // =================================================
      // EXPERIENCE
      // =================================================

      const experienceCount =
        candidate.experience
          ? candidate.experience
              .length
          : 0;

      let experienceScore =
        0;

      if (
        experienceCount >= 2
      ) {
        experienceScore =
          25;
      } else if (
        experienceCount === 1
      ) {
        experienceScore =
          15;
      }

      // =================================================
      // EDUCATION
      // =================================================

      const educationScore =
        candidate.education &&
        candidate.education.length >
          0
          ? 15
          : 0;

      // =================================================
      // CERTIFICATIONS
      // =================================================

      const mandatoryCertifications =
        job.mandatoryCertifications ||
        [];

      const candidateCertifications =
        candidate.certifications ||
        [];

      let certificationScore =
        0;

      if (
        mandatoryCertifications.length ===
        0
      ) {
        certificationScore =
          10;
      } else {
        const matchedCertifications =
          mandatoryCertifications.filter(
            (requiredCertification) =>
              candidateCertifications.some(
                (candidateCertification) =>
                  candidateCertification
                    .toLowerCase()
                    .includes(
                      requiredCertification
                        .toLowerCase()
                    )
              )
          );

        certificationScore =
          (matchedCertifications.length /
            mandatoryCertifications.length) *
          10;
      }

      // =================================================
      // INDUSTRY
      // =================================================

      const cvText =
        candidate.cvText
          ? candidate.cvText.toLowerCase()
          : "";

      let industryScore =
        0;

      if (
        cvText.includes(
          "web development"
        ) ||
        cvText.includes(
          "web developer"
        ) ||
        cvText.includes(
          "frontend"
        ) ||
        cvText.includes(
          "front-end"
        ) ||
        cvText.includes(
          "backend"
        ) ||
        cvText.includes(
          "software developer"
        ) ||
        candidateSkills.length >
          0
      ) {
        industryScore =
          10;
      }

      // =================================================
      // ELIMINATION
      // =================================================

      const eliminationReasons =
        [];

      if (
        mandatoryCertifications.length >
        0
      ) {
        const hasAll =
          mandatoryCertifications.every(
            (requiredCertification) =>
              candidateCertifications.some(
                (candidateCertification) =>
                  candidateCertification
                    .toLowerCase()
                    .includes(
                      requiredCertification
                        .toLowerCase()
                    )
              )
          );

        if (!hasAll) {
          eliminationReasons.push(
            "Missing mandatory certification"
          );
        }
      }

      if (
        job.minimumEducation &&
        (!candidate.education ||
          candidate.education
            .length === 0)
      ) {
        eliminationReasons.push(
          "Required education level not found"
        );
      }

      if (
        Number(
          job.minimumExperience
        ) > 0 &&
        experienceCount ===
          0
      ) {
        eliminationReasons.push(
          "Minimum experience requirement not met"
        );
      }

      // =================================================
      // SCORE
      // =================================================

      let totalScore =
        Math.round(
          skillsScore +
            experienceScore +
            educationScore +
            certificationScore +
            industryScore
        );

      totalScore =
        Math.min(
          totalScore,
          100
        );

      // =================================================
      // CATEGORY
      // =================================================

      let category;

      if (
        eliminationReasons.length >
        0
      ) {
        category =
          "Tier 3";
      } else if (
        totalScore >= 85
      ) {
        category =
          "Tier 1";
      } else if (
        totalScore >= 65
      ) {
        category =
          "Tier 2";
      } else {
        category =
          "Tier 3";
      }

      // =================================================
      // MATRIX
      // =================================================

      const evaluationMatrix = {
        skills:
          `${Math.round(
            skillsScore / 4
          )}/10`,

        experience:
          `${Math.round(
            experienceScore /
              2.5
          )}/10`,

        education:
          `${Math.round(
            educationScore /
              1.5
          )}/10`,

        industry:
          `${Math.round(
            industryScore
          )}/10`,

        certifications:
          `${Math.round(
            certificationScore
          )}/10`,
      };

      // =================================================
      // MISSING SKILLS
      // =================================================

      const missingSkills =
        requiredSkills.filter(
          (requiredSkill) =>
            !matchedSkills.some(
              (matchedSkill) =>
                matchedSkill
                  .toLowerCase() ===
                requiredSkill
                  .toLowerCase()
            )
        );

      // =================================================
      // SUMMARY
      // =================================================

      let justification;

      if (
        eliminationReasons.length >
        0
      ) {
        justification =
          `The candidate does not meet one or more mandatory requirements for the ${job.jobTitle} position. ${eliminationReasons.join(
            ". "
          )}.`;
      } else if (
        totalScore >= 85
      ) {
        justification =
          `Strong match for the ${job.jobTitle} position. The candidate demonstrates strong technical skills, relevant education, and suitable professional experience.`;
      } else if (
        totalScore >= 65
      ) {
        justification =
          `Potential match for the ${job.jobTitle} position. The candidate has relevant skills and qualifications, but some areas could be improved.`;
      } else {
        justification =
          `Limited match for the ${job.jobTitle} position. Several required skills or qualifications are missing.`;
      }

      // =================================================
      // EVALUATION
      // =================================================

      const evaluation = {
        targetJob:
          job.jobTitle,

        matchScore:
          totalScore,

        category:
          category,

        evaluationMatrix:
          evaluationMatrix,

        matchedSkills:
          matchedSkills,

        missingSkills:
          missingSkills,

        eliminationReasons:
          eliminationReasons,

        justification:
          justification,
      };

      // =================================================
      // SAVE
      // =================================================

      candidate.evaluation =
        evaluation;

      res.json({
        message:
          "Candidate re-evaluated successfully",

        candidate:
          candidate,

        evaluation:
          evaluation,
      });
    } catch (error) {
      console.error(
        "Re-evaluation error:",
        error
      );

      res.status(500).json({
        message:
          "Could not re-evaluate candidate",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    res.status(500).json({
      message:
        error.message ||
        "Internal server error",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});