import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-cv-screening-backend.onrender.com";

function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD CANDIDATES
  // =====================================================

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/candidates`
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Backend returned invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load candidates."
        );
      }

      setCandidates(
        Array.isArray(data.candidates)
          ? data.candidates
          : []
      );
    } catch (error) {
      console.error(
        "Could not load candidates:",
        error
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD CURRENT JOB
  // =====================================================

  const loadJob = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/jobs/current`
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error(
          "Invalid job response:",
          text
        );

        return;
      }

      if (response.ok) {
        setJob(data.job || null);
      }
    } catch (error) {
      console.error(
        "Could not load current job:",
        error
      );
    }
  };

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    loadCandidates();
    loadJob();
  }, []);

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalCandidates =
    candidates.length;

  const strongMatches =
    candidates.filter(
      (candidate) =>
        candidate.evaluation?.category ===
        "Tier 1"
    ).length;

  const potentialMatches =
    candidates.filter(
      (candidate) =>
        candidate.evaluation?.category ===
        "Tier 2"
    ).length;

  const weakMatches =
    candidates.filter(
      (candidate) =>
        candidate.evaluation?.category ===
        "Tier 3"
    ).length;

  const evaluatedCandidates =
    candidates.filter(
      (candidate) =>
        candidate.evaluation
    );

  const averageScore =
    evaluatedCandidates.length > 0
      ? Math.round(
          evaluatedCandidates.reduce(
            (total, candidate) =>
              total +
              Number(
                candidate.evaluation
                  ?.matchScore || 0
              ),
            0
          ) /
            evaluatedCandidates.length
        )
      : null;

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    await loadCandidates();
    await loadJob();
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-5 lg:p-8">

      {/* HEADER */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          AI CV Screening Dashboard
        </p>
      </div>

      {/* CURRENT JOB */}
      {job && (
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Active Job
              </p>

              <h2 className="mt-1 break-words text-lg font-semibold text-gray-900 sm:text-xl">
                {job.jobTitle}
              </h2>
            </div>

            <div className="text-sm text-gray-500 sm:max-w-md">
              <span className="font-medium text-gray-700">
                Required Skills:
              </span>{" "}
              <span className="break-words">
                {job.requiredSkills?.length
                  ? job.requiredSkills.join(", ")
                  : "None"}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-600 sm:mb-6">
          {error}
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">

        {/* TOTAL */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs text-gray-500 sm:text-sm">
            Total Candidates
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {totalCandidates}
          </p>
        </div>

        {/* TIER 1 */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs text-gray-500 sm:text-sm">
            Strong Matches
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600 sm:text-3xl">
            {strongMatches}
          </p>
        </div>

        {/* TIER 2 */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs text-gray-500 sm:text-sm">
            Potential Matches
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600 sm:text-3xl">
            {potentialMatches}
          </p>
        </div>

        {/* TIER 3 */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs text-gray-500 sm:text-sm">
            Weak Matches
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600 sm:text-3xl">
            {weakMatches}
          </p>
        </div>

        {/* AVERAGE */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs text-gray-500 sm:text-sm">
            Average Score
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-600 sm:text-3xl">
            {averageScore !== null
              ? `${averageScore}%`
              : "—"}
          </p>
        </div>

      </div>

      {/* CANDIDATES */}
      <div className="mt-5 rounded-xl bg-white p-4 shadow-sm sm:mt-6 sm:p-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Candidates
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Candidates will appear here after CV upload and evaluation.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

        </div>

        {/* LOADING */}
        {loading ? (
          <div className="mt-8 py-8 text-center">
            <p className="text-gray-500">
              Loading candidates...
            </p>
          </div>
        ) : candidates.length === 0 ? (

          /* EMPTY */
          <div className="mt-6 rounded-lg bg-gray-50 px-4 py-10 text-center sm:mt-8">
            <h3 className="text-lg font-semibold text-gray-900">
              No candidates yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Upload a CV to add a candidate.
            </p>
          </div>

        ) : (

          /* TABLE */
          <div className="mt-5 overflow-x-auto sm:mt-6">
            <table className="w-full min-w-[700px] text-left">

              <thead>
                <tr className="border-b bg-gray-50 text-sm text-gray-500">

                  <th className="px-4 py-3">
                    Name
                  </th>

                  <th className="px-4 py-3">
                    Email
                  </th>

                  <th className="px-4 py-3">
                    Skills
                  </th>

                  <th className="px-4 py-3">
                    Score
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                </tr>
              </thead>

              <tbody>

                {candidates.map(
                  (candidate) => (
                    <tr
                      key={
                        candidate.candidateId
                      }
                      className="border-b last:border-0 hover:bg-gray-50"
                    >

                      <td className="px-4 py-4 font-medium text-gray-900">
                        {candidate.name ||
                          "Unknown Candidate"}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {candidate.email ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">

                        <div className="flex max-w-xs flex-wrap gap-1">

                          {candidate.skills?.length ? (
                            candidate.skills
                              .slice(0, 5)
                              .map(
                                (skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                                  >
                                    {skill}
                                  </span>
                                )
                              )
                          ) : (
                            <span className="text-sm text-gray-400">
                              No skills
                            </span>
                          )}

                        </div>

                      </td>

                      <td className="px-4 py-4 font-semibold">

                        {candidate.evaluation
                          ? `${candidate.evaluation.matchScore}%`
                          : "Not evaluated"}

                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {candidate.evaluation
                            ?.category ||
                            "Not evaluated"}
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;