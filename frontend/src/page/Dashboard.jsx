import { useEffect, useState } from "react";

const API_URL = "https://ai-cv-screening-backend.onrender.com";

function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCandidates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/candidates`);
      const data = await response.json();

      setCandidates(data.candidates || []);
    } catch (error) {
      console.error("Could not load candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const totalCandidates = candidates.length;

  const strongMatches = candidates.filter(
    (candidate) =>
      candidate.evaluation?.category === "Tier 1"
  ).length;

  const potentialMatches = candidates.filter(
    (candidate) =>
      candidate.evaluation?.category === "Tier 2"
  ).length;

  const evaluatedCandidates = candidates.filter(
    (candidate) => candidate.evaluation
  );

  const averageScore =
    evaluatedCandidates.length > 0
      ? Math.round(
          evaluatedCandidates.reduce(
            (total, candidate) =>
              total + (candidate.evaluation?.matchScore || 0),
            0
          ) / evaluatedCandidates.length
        )
      : null;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        Dashboard
      </h1>

      <p className="mt-2 text-sm sm:text-base text-gray-500">
        AI CV Screening Dashboard
      </p>

      {/* STATISTICS */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Candidates
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalCandidates}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Strong Matches
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {strongMatches}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Potential Matches
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {potentialMatches}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Average Score
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {averageScore !== null
              ? `${averageScore}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* CANDIDATES */}
      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Candidates
          </h2>

          <button
            onClick={loadCandidates}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-gray-500">
            Loading candidates...
          </p>
        ) : candidates.length === 0 ? (
          <p className="mt-6 text-gray-500">
            Candidates will appear here after CV upload and evaluation.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Category</th>
                </tr>
              </thead>

              <tbody>
                {candidates.map((candidate) => (
                  <tr
                    key={candidate.candidateId}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {candidate.name}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {candidate.email || "—"}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {candidate.evaluation
                        ? `${candidate.evaluation.matchScore}%`
                        : "Not evaluated"}
                    </td>

                    <td className="px-4 py-4">
                      {candidate.evaluation?.category || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;