import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/candidates"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load candidates"
        );
      }

      setCandidates(data.candidates || []);
    } catch (error) {
      console.error("Candidates error:", error);

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const getScore = (candidate) => {
    return candidate.evaluation?.matchScore ?? "-";
  };

  const getCategory = (candidate) => {
    return candidate.evaluation?.category ?? "Not evaluated";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Candidates
        </h1>

        <p className="mt-2 text-gray-500">
          View and evaluate all uploaded candidates.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-5 md:grid-cols-3">

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Candidates
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {candidates.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Tier 1
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {
              candidates.filter(
                (candidate) =>
                  candidate.evaluation?.category ===
                  "Tier 1"
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Tier 2
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {
              candidates.filter(
                (candidate) =>
                  candidate.evaluation?.category ===
                  "Tier 2"
              ).length
            }
          </p>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-gray-500">
            Loading candidates...
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">

          <h2 className="text-xl font-semibold text-gray-900">
            No candidates yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Upload a CV to add a candidate.
          </p>

          <Link
            to="/upload-cv"
            className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Upload CV
          </Link>

        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          {/* Table */}
          <div className="overflow-x-auto">

            <table className="w-full text-left">

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

                {candidates.map((candidate) => (

                  <tr
                    key={candidate.candidateId}
                    className="hover:bg-gray-50"
                  >

                    {/* Candidate */}
                    <td className="px-6 py-5">

                      <p className="font-semibold text-gray-900">
                        {candidate.name ||
                          "Unknown Candidate"}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {candidate.candidateId}
                      </p>

                    </td>

                    {/* Email */}
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {candidate.email || "No email"}
                    </td>

                    {/* Skills */}
                    <td className="px-6 py-5">

                      <div className="flex max-w-xs flex-wrap gap-1">

                        {candidate.skills?.length > 0 ? (
                          candidate.skills
                            .slice(0, 4)
                            .map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
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

                    </td>

                    {/* Score */}
                    <td className="px-6 py-5">

                      <span className="font-bold text-gray-900">
                        {getScore(candidate)}
                      </span>

                      {getScore(candidate) !== "-" && (
                        <span className="text-gray-400">
                          /100
                        </span>
                      )}

                    </td>

                    {/* Category */}
                    <td className="px-6 py-5">

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {getCategory(candidate)}
                      </span>

                    </td>

                    {/* Action */}
                    <td className="px-6 py-5">

                      <Link
                        to={`/candidates/${candidate.candidateId}`}
                        className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
                      >
                        View Details
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

    </div>
  );
}

export default Candidates;