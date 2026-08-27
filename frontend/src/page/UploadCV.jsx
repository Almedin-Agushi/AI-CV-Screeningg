import { useState } from "react";

function UploadCV() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setSelectedFile(file);
    setCandidate(null);
    setEvaluation(null);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please choose a CV first.");
      return;
    }

    const formData = new FormData();
    formData.append("cv", selectedFile);

    try {
      setLoading(true);
      setMessage("Uploading and processing CV...");

      const response = await fetch(
        "http://localhost:5000/api/candidates/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Upload failed"
        );
      }

      setCandidate(data.candidate);
      setMessage("CV uploaded successfully!");

      // Evaluate candidate automatically
      const evaluationResponse = await fetch(
        "http://localhost:5000/api/candidates/evaluate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate: data.candidate,
          }),
        }
      );

      const evaluationData =
        await evaluationResponse.json();

      if (evaluationResponse.ok) {
        setEvaluation(
          evaluationData.evaluation
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        `Upload failed: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Upload CV
        </h1>

        <p className="mt-2 text-gray-500">
          Upload a candidate CV for automatic screening and evaluation.
        </p>
      </div>

      {/* Upload Card */}
      <div className="max-w-4xl rounded-xl bg-white p-8 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Candidate CV
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Supported formats: PDF, DOCX and TXT.
        </p>

        <div className="mt-6 flex flex-col gap-4 md:flex-row">

          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : "Upload & Evaluate"}
          </button>

        </div>

        {selectedFile && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Selected file
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {selectedFile.name}
            </p>
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm font-medium text-gray-700">
            {message}
          </div>
        )}

      </div>

      {/* Candidate Result */}
      {candidate && (
        <div className="mt-8 max-w-4xl rounded-xl bg-white p-8 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Candidate
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                {candidate.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {candidate.email || "No email found"}
              </p>
            </div>

            {evaluation && (
              <div className="rounded-xl bg-gray-100 px-5 py-4 text-center">
                <p className="text-xs text-gray-500">
                  Match Score
                </p>

                <p className="text-3xl font-bold text-gray-900">
                  {evaluation.matchScore}
                </p>

                <p className="text-xs text-gray-500">
                  {evaluation.category}
                </p>
              </div>
            )}

          </div>

          {/* Skills */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold">
              Skills
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.skills?.length > 0 ? (
                candidate.skills.map(
                  (skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {skill}
                    </span>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  No skills found
                </p>
              )}
            </div>
          </div>

          {/* Evaluation */}
          {evaluation && (
            <div className="mt-8">

              <h3 className="text-lg font-semibold">
                Evaluation
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-5">

                {Object.entries(
                  evaluation.evaluationMatrix || {}
                ).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <p className="text-xs capitalize text-gray-500">
                        {key}
                      </p>

                      <p className="mt-2 text-xl font-bold">
                        {value}
                      </p>
                    </div>
                  )
                )}

              </div>

              {/* Matched Skills */}
              <div className="mt-6">

                <h4 className="font-medium">
                  Matched Skills
                </h4>

                <p className="mt-2 text-sm text-gray-600">
                  {evaluation.matchedSkills?.length
                    ? evaluation.matchedSkills.join(", ")
                    : "No matched skills"}
                </p>

              </div>

              {/* Missing Skills */}
              <div className="mt-5">

                <h4 className="font-medium">
                  Missing Skills
                </h4>

                <p className="mt-2 text-sm text-gray-600">
                  {evaluation.missingSkills?.length
                    ? evaluation.missingSkills.join(", ")
                    : "No missing skills"}
                </p>

              </div>

              {/* Justification */}
              <div className="mt-6 rounded-lg bg-gray-50 p-5">

                <h4 className="font-medium">
                  Evaluation Summary
                </h4>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {evaluation.justification}
                </p>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default UploadCV;