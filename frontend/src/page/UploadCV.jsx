import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-cv-screening-backend.onrender.com";

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

  const getResponseData = async (response) => {
    const text = await response.text();

    if (!text) {
      throw new Error(
        `Backend returned an empty response. Status: ${response.status}`
      );
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("Invalid backend response:", text);

      throw new Error(
        `Backend returned invalid response: ${text.substring(0, 200)}`
      );
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please choose a CV first.");
      return;
    }

    const extension = selectedFile.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!["pdf", "docx", "txt"].includes(extension)) {
      setMessage("Only PDF, DOCX and TXT files are supported.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Uploading and processing CV...");
      setCandidate(null);
      setEvaluation(null);

      // ================================
      // 1. UPLOAD CV
      // ================================

      const formData = new FormData();
      formData.append("cv", selectedFile);

      console.log(
        "Uploading to:",
        `${API_URL}/api/candidates/upload`
      );

      console.log("Selected file:", selectedFile.name);

      const uploadResponse = await fetch(
        `${API_URL}/api/candidates/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await getResponseData(uploadResponse);

      console.log("Upload response:", uploadData);

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.message ||
            `Upload failed with status ${uploadResponse.status}`
        );
      }

      if (!uploadData.candidate) {
        throw new Error(
          "Backend did not return candidate information."
        );
      }

      const uploadedCandidate = uploadData.candidate;

      setCandidate(uploadedCandidate);

      setMessage(
        "CV uploaded successfully. Evaluating candidate..."
      );

      // ================================
      // 2. EVALUATE
      // ================================

      if (!uploadedCandidate.candidateId) {
        throw new Error(
          "Candidate ID was not returned by the backend."
        );
      }

      console.log(
        "Evaluating:",
        uploadedCandidate.candidateId
      );

      const evaluationResponse = await fetch(
        `${API_URL}/api/candidates/${uploadedCandidate.candidateId}/evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const evaluationData =
        await getResponseData(evaluationResponse);

      console.log(
        "Evaluation response:",
        evaluationData
      );

      if (!evaluationResponse.ok) {
        throw new Error(
          evaluationData.message ||
            `Evaluation failed with status ${evaluationResponse.status}`
        );
      }

      if (!evaluationData.evaluation) {
        throw new Error(
          "Backend did not return evaluation information."
        );
      }

      setEvaluation(evaluationData.evaluation);

      if (evaluationData.candidate) {
        setCandidate(evaluationData.candidate);
      }

      setMessage(
        "CV uploaded and evaluated successfully!"
      );
    } catch (error) {
      console.error("Upload/Evaluation error:", error);

      setMessage(
        `Upload failed: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-5 md:p-6 lg:p-8">
      
      {/* HEADER */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Upload CV
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          Upload a candidate CV for automatic screening and evaluation.
        </p>
      </div>

      {/* UPLOAD CARD */}
      <div className="w-full max-w-5xl rounded-xl bg-white p-4 shadow-sm sm:p-6 md:p-7 lg:p-8">
        
        <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
          Candidate CV
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Supported formats: PDF, DOCX and TXT.
        </p>

        {/* FILE + BUTTON */}
        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:gap-4 md:flex-row md:items-center">
          
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={loading}
            className="w-full min-w-0 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700 outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            className="w-full rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:shrink-0 md:whitespace-nowrap"
          >
            {loading ? "Processing..." : "Upload & Evaluate"}
          </button>

        </div>

        {/* SELECTED FILE */}
        {selectedFile && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 sm:p-4">
            
            <p className="text-sm font-medium text-gray-700">
              Selected file
            </p>

            <p className="mt-1 break-all text-sm text-gray-500">
              {selectedFile.name}
            </p>

          </div>
        )}

        {/* MESSAGE */}
        {message && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 sm:p-4">
            
            <p className="break-words text-sm font-medium leading-6 text-gray-700">
              {message}
            </p>

          </div>
        )}

      </div>

      {/* RESULT */}
      {candidate && (
        <div className="mt-6 w-full max-w-5xl rounded-xl bg-white p-4 shadow-sm sm:mt-8 sm:p-6 md:p-7 lg:p-8">

          {/* CANDIDATE HEADER */}
          <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">

            <div className="min-w-0 flex-1">

              <p className="text-sm text-gray-500">
                Candidate
              </p>

              <h2 className="mt-1 break-words text-xl font-bold text-gray-900 sm:text-2xl">
                {candidate.name || "Unknown Candidate"}
              </h2>

              <div className="mt-3 space-y-1">

                <p className="break-all text-sm text-gray-600">
                  <strong>Email:</strong>{" "}
                  {candidate.email || "Not found"}
                </p>

                <p className="break-words text-sm text-gray-600">
                  <strong>Phone:</strong>{" "}
                  {candidate.phone || "Not found"}
                </p>

                <p className="break-all text-sm text-gray-600">
                  <strong>LinkedIn:</strong>{" "}
                  {candidate.linkedin ? (
                    <a
                      href={candidate.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View LinkedIn
                    </a>
                  ) : (
                    "Not found"
                  )}
                </p>

              </div>

            </div>

            {/* SCORE */}
            {evaluation && (
              <div className="w-full rounded-xl bg-gray-100 px-5 py-4 text-center sm:px-6 lg:w-auto lg:min-w-[150px]">

                <p className="text-xs text-gray-500">
                  Match Score
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {evaluation.matchScore}
                  <span className="text-base text-gray-400">
                    /100
                  </span>
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {evaluation.category}
                </p>

              </div>
            )}

          </div>

          {/* SKILLS */}
          <div className="mt-7 sm:mt-8">

            <h3 className="text-lg font-semibold text-gray-900">
              Skills
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">

              {Array.isArray(candidate.skills) &&
              candidate.skills.length > 0 ? (

                candidate.skills.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="max-w-full break-words rounded-full bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
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

          {/* EXPERIENCE */}
          <div className="mt-7 sm:mt-8">

            <h3 className="text-lg font-semibold text-gray-900">
              Experience
            </h3>

            <div className="mt-3 space-y-4">

              {Array.isArray(candidate.experience) &&
              candidate.experience.length > 0 ? (

                candidate.experience.map((experience, index) => (

                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 p-4 sm:p-5"
                  >

                    <p className="break-words font-semibold text-gray-900">
                      {experience.role || "Role not found"}
                    </p>

                    <p className="mt-1 break-words text-sm text-gray-600">
                      {experience.company || "Company not found"}
                    </p>

                    <p className="mt-1 break-words text-xs text-gray-400">
                      {experience.duration || "Duration not found"}
                    </p>

                  </div>

                ))

              ) : (

                <p className="text-sm text-gray-500">
                  No experience found.
                </p>

              )}

            </div>

          </div>

          {/* EDUCATION */}
          <div className="mt-7 sm:mt-8">

            <h3 className="text-lg font-semibold text-gray-900">
              Education
            </h3>

            <div className="mt-3 space-y-4">

              {Array.isArray(candidate.education) &&
              candidate.education.length > 0 ? (

                candidate.education.map((education, index) => (

                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 p-4 sm:p-5"
                  >

                    <p className="break-words font-semibold text-gray-900">
                      {education.degree || "Degree not found"}
                    </p>

                    <p className="mt-1 break-words text-sm text-gray-600">
                      {education.institution || "Institution not found"}
                    </p>

                    <p className="mt-1 break-words text-xs text-gray-400">
                      {education.duration || "Duration not found"}
                    </p>

                  </div>

                ))

              ) : (

                <p className="text-sm text-gray-500">
                  No education found.
                </p>

              )}

            </div>

          </div>

          {/* CERTIFICATIONS */}
          <div className="mt-7 sm:mt-8">

            <h3 className="text-lg font-semibold text-gray-900">
              Certifications
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">

              {Array.isArray(candidate.certifications) &&
              candidate.certifications.length > 0 ? (

                candidate.certifications.map(
                  (certification, index) => (
                    <span
                      key={`${certification}-${index}`}
                      className="max-w-full break-words rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-700"
                    >
                      {certification}
                    </span>
                  )
                )

              ) : (

                <p className="text-sm text-gray-500">
                  No certifications found.
                </p>

              )}

            </div>

          </div>

          {/* EVALUATION */}
          {evaluation && (
            <div className="mt-7 border-t border-gray-200 pt-7 sm:mt-8 sm:pt-8">

              <h3 className="text-lg font-semibold text-gray-900">
                Evaluation
              </h3>

              {/* MATRIX */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

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
                      {value}/10
                    </p>

                  </div>

                ))}

              </div>

              {/* MATCHED SKILLS */}
              <div className="mt-6">

                <h4 className="font-medium text-gray-900">
                  Matched Skills
                </h4>

                <div className="mt-2 flex flex-wrap gap-2">

                  {evaluation.matchedSkills?.length > 0 ? (

                    evaluation.matchedSkills.map(
                      (skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="max-w-full break-words rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                        >
                          {skill}
                        </span>
                      )
                    )

                  ) : (

                    <p className="text-sm text-gray-500">
                      No matched skills
                    </p>

                  )}

                </div>

              </div>

              {/* MISSING SKILLS */}
              <div className="mt-6">

                <h4 className="font-medium text-gray-900">
                  Missing Skills
                </h4>

                <div className="mt-2 flex flex-wrap gap-2">

                  {evaluation.missingSkills?.length > 0 ? (

                    evaluation.missingSkills.map(
                      (skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="max-w-full break-words rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                        >
                          {skill}
                        </span>
                      )
                    )

                  ) : (

                    <p className="text-sm text-gray-500">
                      No missing skills
                    </p>

                  )}

                </div>

              </div>

              {/* ELIMINATION */}
              {evaluation.eliminationReasons?.length > 0 && (

                <div className="mt-6 rounded-lg bg-red-50 p-4 sm:p-5">

                  <h4 className="font-medium text-red-700">
                    Elimination Reasons
                  </h4>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-red-600">
                    {evaluation.eliminationReasons.map(
                      (reason, index) => (
                        <li
                          key={index}
                          className="break-words"
                        >
                          {reason}
                        </li>
                      )
                    )}
                  </ul>

                </div>

              )}

              {/* SUMMARY */}
              <div className="mt-6 rounded-lg bg-gray-50 p-4 sm:p-5">

                <h4 className="font-medium text-gray-900">
                  Evaluation Summary
                </h4>

                <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                  {evaluation.justification ||
                    "No evaluation summary available."}
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