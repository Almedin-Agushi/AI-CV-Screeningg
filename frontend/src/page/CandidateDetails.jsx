import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function CandidateDetails() {
  const { candidateId } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD CANDIDATE
  // =====================================================

  useEffect(() => {
    const loadCandidate = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/candidates`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load candidates"
          );
        }

        const candidateList = Array.isArray(data)
          ? data
          : data.candidates || [];

        const foundCandidate = candidateList.find(
          (item) =>
            item.candidateId === candidateId ||
            item.id === candidateId
        );

        if (!foundCandidate) {
          setError("Candidate not found.");
          return;
        }

        setCandidate(foundCandidate);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCandidate();
  }, [candidateId]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

            <p className="mt-4 text-sm text-gray-500">
              Loading candidate...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          <Link
            to="/candidates"
            className="inline-block text-sm font-medium text-gray-600 transition hover:text-black"
          >
            ← Back to Candidates
          </Link>

          <div className="mt-5 rounded-xl bg-white p-8 text-center shadow-sm sm:mt-6 sm:p-10">
            <h2 className="break-words text-lg font-semibold text-gray-900 sm:text-xl">
              {error || "Candidate not found"}
            </h2>
          </div>

        </div>
      </div>
    );
  }

  // =====================================================
  // EVALUATION
  // =====================================================

  const evaluation =
    candidate.evaluation || null;

  // =====================================================
  // SCORE STYLE
  // =====================================================

  const getScoreStyle = (score) => {
    if (score >= 85) {
      return "text-green-600";
    }

    if (score >= 65) {
      return "text-yellow-600";
    }

    return "text-red-600";
  };

  // =====================================================
  // CATEGORY STYLE
  // =====================================================

  const getCategoryStyle = (category) => {
    if (category === "Tier 1") {
      return "bg-green-100 text-green-700";
    }

    if (category === "Tier 2") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (category === "Tier 3") {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  // =====================================================
  // EDUCATION
  // =====================================================

  const renderEducation = () => {
    if (
      !candidate.education ||
      candidate.education.length === 0
    ) {
      return (
        <p className="text-sm text-gray-500">
          No education found.
        </p>
      );
    }

    return candidate.education.map(
      (education, index) => (
        <div
          key={index}
          className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
        >
          <p className="break-words font-semibold text-gray-900">
            {education.degree || "Not specified"}
          </p>

          <p className="mt-1 break-words text-sm text-gray-600">
            {education.institution || "Not specified"}
          </p>

          <p className="mt-1 break-words text-xs text-gray-400">
            {education.duration || "Not specified"}
          </p>
        </div>
      )
    );
  };

  // =====================================================
  // EXPERIENCE
  // =====================================================

  const renderExperience = () => {
    if (
      !candidate.experience ||
      candidate.experience.length === 0
    ) {
      return (
        <p className="text-sm text-gray-500">
          No experience found.
        </p>
      );
    }

    return candidate.experience.map(
      (experience, index) => (
        <div
          key={index}
          className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
        >
          <p className="break-words font-semibold text-gray-900">
            {experience.role || "Not specified"}
          </p>

          <p className="mt-1 break-words text-sm text-gray-600">
            {experience.company || "Not specified"}
          </p>

          <p className="mt-1 break-words text-xs text-gray-400">
            {experience.duration || "Not specified"}
          </p>
        </div>
      )
    );
  };

  // =====================================================
  // CERTIFICATIONS
  // =====================================================

  const renderCertifications = () => {
    if (
      !candidate.certifications ||
      candidate.certifications.length === 0
    ) {
      return (
        <p className="text-sm text-gray-500">
          No certifications found.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {candidate.certifications.map(
          (certification, index) => (
            <span
              key={index}
              className="max-w-full break-words rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-700 sm:text-sm"
            >
              {typeof certification === "string"
                ? certification
                : certification.name || "Certification"}
            </span>
          )
        )}
      </div>
    );
  };

  // =====================================================
  // SCORE
  // =====================================================

  const score =
    evaluation?.matchScore ??
    candidate.score ??
    null;

  const category =
    evaluation?.category ??
    candidate.tier ??
    "Not evaluated";

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-100 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto w-full max-w-7xl">

        {/* =================================================
            BACK
        ================================================= */}

        <Link
          to="/candidates"
          className="inline-block text-sm font-medium text-gray-600 transition hover:text-black"
        >
          ← Back to Candidates
        </Link>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mt-5 rounded-xl bg-white p-5 shadow-sm sm:mt-6 sm:p-6 lg:p-8">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            {/* Candidate info */}

            <div className="min-w-0 flex-1">

              <p className="text-sm text-gray-500">
                Candidate
              </p>

              <h1 className="mt-1 break-words text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
                {candidate.name || "Unknown Candidate"}
              </h1>

              <div className="mt-4 space-y-2 text-sm text-gray-600">

                <p className="break-words">
                  <strong>Email:</strong>{" "}
                  {candidate.email || "Not found"}
                </p>

                <p className="break-words">
                  <strong>Phone:</strong>{" "}
                  {candidate.phone || "Not found"}
                </p>

                <p className="flex flex-wrap gap-1">
                  <strong>LinkedIn:</strong>

                  {candidate.linkedin ? (
                    <a
                      href={candidate.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-full break-all underline hover:text-black"
                    >
                      View LinkedIn
                    </a>
                  ) : (
                    <span>Not found</span>
                  )}
                </p>

              </div>

            </div>

            {/* =================================================
                SCORE
            ================================================= */}

            {evaluation && (

              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">

                {/* Score */}

                <div className="w-full rounded-xl bg-gray-100 px-5 py-4 text-center sm:w-auto sm:min-w-[150px] sm:px-8 sm:py-5">

                  <p className="text-xs text-gray-500">
                    Match Score
                  </p>

                  <p
                    className={`mt-1 text-3xl font-bold sm:text-4xl ${getScoreStyle(
                      score
                    )}`}
                  >
                    {score}

                    <span className="text-base text-gray-400 sm:text-lg">
                      /100
                    </span>
                  </p>

                </div>

                {/* Category */}

                <div className="w-full sm:w-auto sm:min-w-[120px]">

                  <p className="text-xs text-gray-500">
                    Category
                  </p>

                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${getCategoryStyle(
                      category
                    )}`}
                  >
                    {category}
                  </span>

                </div>

              </div>

            )}

          </div>

        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* =================================================
              SKILLS
          ================================================= */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <h2 className="text-lg font-semibold text-gray-900">
              Skills
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">

              {candidate.skills?.length > 0 ? (

                candidate.skills.map((skill) => (

                  <span
                    key={skill}
                    className="max-w-full break-words rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-700 sm:text-sm"
                  >
                    {skill}
                  </span>

                ))

              ) : (

                <p className="text-sm text-gray-500">
                  No skills found.
                </p>

              )}

            </div>

          </div>

          {/* =================================================
              EXPERIENCE
          ================================================= */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <h2 className="text-lg font-semibold text-gray-900">
              Experience
            </h2>

            <div className="mt-4 space-y-4">
              {renderExperience()}
            </div>

          </div>

          {/* =================================================
              EDUCATION
          ================================================= */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <h2 className="text-lg font-semibold text-gray-900">
              Education
            </h2>

            <div className="mt-4 space-y-4">
              {renderEducation()}
            </div>

          </div>

          {/* =================================================
              CERTIFICATIONS
          ================================================= */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <h2 className="text-lg font-semibold text-gray-900">
              Certifications
            </h2>

            <div className="mt-4">
              {renderCertifications()}
            </div>

          </div>

        </div>

        {/* =================================================
            EVALUATION
        ================================================= */}

        {evaluation && (

          <div className="mt-6 rounded-xl bg-white p-5 shadow-sm sm:p-6 lg:p-8">

            <h2 className="text-lg font-semibold text-gray-900">
              Evaluation
            </h2>

            {/* =================================================
                MATRIX
            ================================================= */}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">

              {Object.entries(
                evaluation.evaluationMatrix || {}
              ).map(([key, value]) => (

                <div
                  key={key}
                  className="rounded-lg border border-gray-200 p-4"
                >

                  <p className="break-words text-xs capitalize text-gray-500">
                    {key}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {value}
                  </p>

                </div>

              ))}

            </div>

            {/* =================================================
                MATCHED / MISSING
            ================================================= */}

            <div className="mt-6 grid gap-6 md:grid-cols-2">

              {/* Matched */}

              <div className="min-w-0">

                <h3 className="font-medium text-gray-900">
                  Matched Skills
                </h3>

                <div className="mt-2">

                  {evaluation.matchedSkills?.length ? (

                    <div className="flex flex-wrap gap-2">

                      {evaluation.matchedSkills.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="max-w-full break-words rounded-full bg-green-100 px-3 py-1.5 text-xs text-green-700 sm:text-sm"
                          >
                            {skill}
                          </span>
                        )
                      )}

                    </div>

                  ) : (

                    <p className="text-sm text-gray-600">
                      No matched skills
                    </p>

                  )}

                </div>

              </div>

              {/* Missing */}

              <div className="min-w-0">

                <h3 className="font-medium text-gray-900">
                  Missing Skills
                </h3>

                <div className="mt-2">

                  {evaluation.missingSkills?.length ? (

                    <div className="flex flex-wrap gap-2">

                      {evaluation.missingSkills.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="max-w-full break-words rounded-full bg-red-100 px-3 py-1.5 text-xs text-red-700 sm:text-sm"
                          >
                            {skill}
                          </span>
                        )
                      )}

                    </div>

                  ) : (

                    <p className="text-sm text-gray-600">
                      No missing skills
                    </p>

                  )}

                </div>

              </div>

            </div>

            {/* =================================================
                ELIMINATION
            ================================================= */}

            {evaluation.eliminationReasons?.length > 0 && (

              <div className="mt-6 rounded-lg bg-gray-50 p-4 sm:p-5">

                <h3 className="font-medium text-gray-900">
                  Elimination Reasons
                </h3>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-600">

                  {evaluation.eliminationReasons.map(
                    (reason) => (
                      <li
                        key={reason}
                        className="break-words"
                      >
                        {reason}
                      </li>
                    )
                  )}

                </ul>

              </div>

            )}

            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="mt-6 rounded-lg bg-gray-50 p-4 sm:p-5">

              <h3 className="font-medium text-gray-900">
                Evaluation Summary
              </h3>

              <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                {evaluation.justification ||
                  evaluation.evaluationSummary ||
                  "No evaluation summary available."}
              </p>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default CandidateDetails;