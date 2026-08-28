import { useEffect, useState } from "react";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/dashboard`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load dashboard stats");
        }

        setStats(data);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-500">AI CV Screening Dashboard</p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total Candidates</p>
          <p className="mt-2 text-3xl font-bold">
            {stats ? stats.totalCandidates : 0}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Strong Matches</p>
          <p className="mt-2 text-3xl font-bold">
            {stats ? stats.strongMatches : 0}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Potential Matches</p>
          <p className="mt-2 text-3xl font-bold">
            {stats ? stats.potentialMatches : 0}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="mt-2 text-3xl font-bold">
            {stats && stats.avgScore ? stats.avgScore.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Candidates</h2>
        <p className="mt-2 text-gray-500">
          Candidates will appear here after CV upload and evaluation.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
