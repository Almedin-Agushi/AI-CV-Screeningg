import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // API URL
  // =====================================================

  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  // =====================================================
  // LOAD CANDIDATES
  // =====================================================

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Candidates API URL:", API_URL);

      const response = await fetch(`${API_URL}/api/candidates`);

      const responseText = await response.text();

      console.log("Candidates response status:", response.status);
      console.log("Candidates response:", responseText);

      // =================================================
      // EMPTY RESPONSE
      // =================================================

      if (!responseText || responseText.trim() === "") {
        throw new Error(
          `Backend returned an empty response. Status: ${response.status}`
        );
      }

      // =================================================
      // PARSE JSON
      // =================================================

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);

        throw new Error(
          `Backend returned invalid JSON. Check API URL: ${API_URL}`
        );
      }

      // =================================================
      // HTTP ERROR
      // =================================================

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Could not load candidates. Status: ${response.status}`
        );
      }

      // =================================================
      // SAVE CANDIDATES
      // =================================================

      const candidateList = Array.isArray(data)
        ? data
        : Array.isArray(data.candidates)
        ? data.candidates
        : [];

      setCandidates(candidateList);
    } catch (error) {
      console.error("Candidates error:", error);

      setError(
        error.message || "Could not load candidates"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD ON PAGE OPEN
  // =====================================================

  useEffect(() => {
    loadCandidates();
  }, []);

  // =====================================================
  // GET CANDIDATE ID
  // =====================================================

  const getCandidateId = (candidate) => {
    return candidate.candidateId || candidate.id;
  };

  // =====================================================
  // GET SCORE
  // =====================================================

  const getScore = (candidate) => {
    if (
      typeof candidate.evaluation?.matchScore === "number"
    ) {
      return candidate.evaluation.matchScore;
    }

    if (typeof candidate.score === "number") {
      return candidate.score;
    }

    return "-";
  };

  // =====================================================
  // GET CATEGORY
  // =====================================================

  const getCategory = (candidate) => {
    return (
      candidate.evaluation?.category ||
      candidate.tier ||
      "Not evaluated"
    );
  };

  // =====================================================
  // TIER 1 COUNT
  // =====================================================

  const tier1Count = candidates.filter(
    (candidate) => getCategory(candidate) === "Tier 1"
  ).length;

  // =====================================================
  // TIER 2 COUNT
  // =====================================================

  const tier2Count = candidates.filter(
    (candidate) => getCategory(candidate) === "Tier 2"
  ).length;

  // =====================================================
  // TIER 3 COUNT
  // =====================================================

  const tier3Count = candidates.filter(
    (candidate) => getCategory(candidate) === "Tier 3"
  ).length;

  // =====================================================
  // AVERAGE SCORE
  // =====================================================

  const evaluatedCandidates = candidates.filter(
    (candidate) => typeof getScore(candidate) === "number"
  );

  const averageScore =
    evaluatedCandidates.length > 0
      ? Math.round(
          evaluatedCandidates.reduce(
            (total, candidate) =>
              total + getScore(candidate),
            0
          ) / evaluatedCandidates.length
        )
      : 0;

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
  // SCORE STYLE
  // =====================================================

  const getScoreStyle = (score) => {
    if (score === "-") {
      return "text-gray-400";
    }

    if (score >= 85) {
      return "text-green-600";
    }

    if (score >= 65) {
      return "text-yellow-600";
    }

    return "text-red-600";
  };

  // =====================================================
  // EXPERIENCE
  // =====================================================

  const renderExperience = (candidate) => {
    if (
      !Array.isArray(candidate.experience) ||
      candidate.experience.length === 0
    ) {
      return (
        <p className="text-sm text-gray-500">
          No experience found.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {candidate.experience.map((experience, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4"
          >
            <p className="break-words font-semibold text-gray-900">
              {experience.role || "Not specified"}
            </p>

            <p className="mt-1 break-words text-sm text-gray-600">
              {experience.company || "Not specified"}
            </p>

            <p className="mt-1 break-words text-xs text-gray-400">
              {experience.duration || "Duration not found"}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // =====================================================
  // EDUCATION
  // =====================================================

  const renderEducation = (candidate) => {
    if (Array.isArray(candidate.education)) {
      if (candidate.education.length === 0) {
        return (
          <p className="text-sm text-gray-500">
            No education found.
          </p>
        );
      }

      return (
        <div className="space-y-3">
          {candidate.education.map((education, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4"
            >
              <p className="break-words text-sm text-gray-700">
                {typeof education === "string"
                  ? education
                  : education.degree ||
                    education.title ||
                    "Not specified"}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <p className="break-words text-sm text-gray-600">
        {candidate.education || "No education found."}
      </p>
    );
  };

  // =====================================================
  // CERTIFICATIONS
  // =====================================================

  const renderCertifications = (candidate) => {
    if (
      !Array.isArray(candidate.certifications) ||
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
              className="max-w-full break-words rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
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
  // UI
  // =====================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-100 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto w-full max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 sm:mb-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="min-w-0">

              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Candidates
              </h1>

              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                View and evaluate all uploaded candidates.
              </p>

            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

              <button
                onClick={loadCandidates}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <Link
                to="/upload-cv"
                className="w-full rounded-lg bg-black px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-gray-800 sm:w-auto"
              >
                Upload CV
              </Link>

            </div>

          </div>

        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Total */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm text-gray-500">
              Total Candidates
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {candidates.length}
            </p>

          </div>

          {/* Tier 1 */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm text-gray-500">
              Tier 1
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {tier1Count}
            </p>

          </div>

          {/* Tier 2 */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm text-gray-500">
              Tier 2
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {tier2Count}
            </p>

          </div>

          {/* Average */}

          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

            <p className="text-sm text-gray-500">
              Average Score
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">

              {averageScore}

              <span className="ml-1 text-base font-normal text-gray-400">
                /100
              </span>

            </p>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="break-words text-sm font-medium text-red-700">
              {error}
            </p>

            <p className="mt-2 break-all text-xs text-red-500">
              API URL: {API_URL}
            </p>

            <button
              onClick={loadCandidates}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700"
            >
              Try Again
            </button>

          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="rounded-xl bg-white p-10 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

            <p className="mt-4 text-sm text-gray-500">
              Loading candidates...
            </p>

          </div>

        ) : candidates.length === 0 ? (

          /* =================================================
             NO CANDIDATES
          ================================================= */

          <div className="rounded-xl bg-white p-8 text-center shadow-sm sm:p-12">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">

              <span className="text-xl">
                CV
              </span>

            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              No candidates yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Upload a CV to add a candidate.
            </p>

            <Link
              to="/upload-cv"
              className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Upload CV
            </Link>

          </div>

        ) : (

          /* =================================================
             CANDIDATES
          ================================================= */

          <div className="rounded-xl bg-white shadow-sm">

            {/* =================================================
                DESKTOP TABLE
            ================================================= */}

            <div className="hidden overflow-x-auto lg:block">

              <table className="w-full min-w-[900px] text-left">

                <thead className="border-b bg-gray-50">

                  <tr>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Candidate
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Email
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Skills
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Score
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Category
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {candidates.map((candidate) => {

                    const score = getScore(candidate);
                    const category = getCategory(candidate);
                    const candidateId = getCandidateId(candidate);

                    return (
                      <tr
                        key={candidateId}
                        className="transition hover:bg-gray-50"
                      >

                        {/* Candidate */}

                        <td className="max-w-[220px] px-6 py-5">

                          <p className="break-words font-semibold text-gray-900">
                            {candidate.name || "Unknown Candidate"}
                          </p>

                          <p className="mt-1 break-all text-xs text-gray-400">
                            {candidateId}
                          </p>

                        </td>

                        {/* Email */}

                        <td className="max-w-[240px] px-6 py-5">

                          <p className="break-all text-sm text-gray-600">
                            {candidate.email || "No email"}
                          </p>

                        </td>

                        {/* Skills */}

                        <td className="px-6 py-5">

                          <div className="flex max-w-[240px] flex-wrap gap-1">

                            {candidate.skills?.length > 0 ? (

                              <>
                                {candidate.skills
                                  .slice(0, 4)
                                  .map((skill) => (

                                    <span
                                      key={skill}
                                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                                    >
                                      {skill}
                                    </span>

                                  ))}

                                {candidate.skills.length > 4 && (

                                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                                    +{candidate.skills.length - 4}
                                  </span>

                                )}
                              </>

                            ) : (

                              <span className="text-sm text-gray-400">
                                No skills
                              </span>

                            )}

                          </div>

                        </td>

                        {/* Score */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span
                            className={`font-bold ${getScoreStyle(score)}`}
                          >
                            {score}
                          </span>

                          {score !== "-" && (
                            <span className="text-gray-400">
                              /100
                            </span>
                          )}

                        </td>

                        {/* Category */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getCategoryStyle(
                              category
                            )}`}
                          >
                            {category}
                          </span>

                        </td>

                        {/* Action */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <Link
                            to={`/candidates/${candidateId}`}
                            className="inline-block rounded-lg bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            View Details
                          </Link>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

            {/* =================================================
                TABLET + MOBILE
            ================================================= */}

            <div className="divide-y lg:hidden">

              {candidates.map((candidate) => {

                const score = getScore(candidate);
                const category = getCategory(candidate);
                const candidateId = getCandidateId(candidate);

                return (
                  <div
                    key={candidateId}
                    className="p-5 sm:p-6"
                  >

                    {/* Candidate */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <h3 className="break-words text-lg font-semibold text-gray-900 sm:text-xl">
                          {candidate.name || "Unknown Candidate"}
                        </h3>

                        <p className="mt-1 break-all text-sm text-gray-500">
                          {candidate.email || "No email"}
                        </p>

                      </div>

                      {/* Score */}

                      <div className="flex items-center gap-2 sm:shrink-0">

                        <span
                          className={`text-2xl font-bold ${getScoreStyle(
                            score
                          )}`}
                        >
                          {score}
                        </span>

                        {score !== "-" && (
                          <span className="text-sm text-gray-400">
                            /100
                          </span>
                        )}

                      </div>

                    </div>

                    {/* Category */}

                    <div className="mt-4">

                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getCategoryStyle(
                          category
                        )}`}
                      >
                        {category}
                      </span>

                    </div>

                    {/* Skills */}

                    <div className="mt-5">

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Skills
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">

                        {candidate.skills?.length > 0 ? (

                          candidate.skills.map((skill) => (

                            <span
                              key={skill}
                              className="max-w-full break-words rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            >
                              {skill}
                            </span>

                          ))

                        ) : (

                          <span className="text-sm text-gray-400">
                            No skills
                          </span>

                        )}

                      </div>

                    </div>

                    {/* Experience */}

                    <div className="mt-6">

                      <h3 className="text-lg font-semibold text-gray-900">
                        Experience
                      </h3>

                      <div className="mt-3">
                        {renderExperience(candidate)}
                      </div>

                    </div>

                    {/* Education */}

                    <div className="mt-6">

                      <h3 className="text-lg font-semibold text-gray-900">
                        Education
                      </h3>

                      <div className="mt-3">
                        {renderEducation(candidate)}
                      </div>

                    </div>

                    {/* Certifications */}

                    <div className="mt-6">

                      <h3 className="text-lg font-semibold text-gray-900">
                        Certifications
                      </h3>

                      <div className="mt-3">
                        {renderCertifications(candidate)}
                      </div>

                    </div>

                    {/* Action */}

                    <div className="mt-6">

                      <Link
                        to={`/candidates/${candidateId}`}
                        className="block w-full rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        View Details
                      </Link>

                    </div>

                  </div>
                );
              })}

            </div>

          </div>

        )}

        {/* =================================================
            TIER 3 INFO
        ================================================= */}

        {!loading &&
          candidates.length > 0 &&
          tier3Count > 0 && (

            <div className="mt-6 rounded-xl bg-white p-5 shadow-sm sm:p-6">

              <p className="text-sm text-gray-500">
                Tier 3 Candidates
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                {tier3Count}
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Candidates with weaker matches or unmet mandatory requirements.
              </p>

            </div>

          )}

      </div>
    </div>
  );
}

export default Candidates;