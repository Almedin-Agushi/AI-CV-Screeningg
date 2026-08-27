function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Dashboard
      </h1>

      <p className="mt-2 text-gray-500">
        AI CV Screening Dashboard
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Candidates
          </p>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Strong Matches
          </p>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Potential Matches
          </p>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Average Score
          </p>
          <p className="mt-2 text-3xl font-bold">—</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          Candidates
        </h2>

        <p className="mt-2 text-gray-500">
          Candidates will appear here after CV upload and evaluation.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;