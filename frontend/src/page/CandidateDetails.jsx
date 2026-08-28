import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function CandidateDetails() {
  const { candidateId } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const foundCandidate = data.candidates.find(
          (item) =>
            item.candidateId === candidateId
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          Loading candidate...
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <Link
          to="/candidates"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Back to Candidates
        </Link>

        <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {error || "Candidate not found"}
          </h2>
        </div>
      </div>
    );
  }

  const evaluation = candidate.evaluation;

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* Back */}
      <Link
        to="/candidates"
        className="text-sm font-medium text-gray-600 hover:text-black"
      >
        ← Back to Candidates
      </Link>

      {/* Header */}
      <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">

        <div className="flex flex-col justify-between gap-6 md:flex-row">

          <div>
            <p className="text-sm text-gray-500">
              Candidate
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              {candidate.name}
            </h1>

            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>
                <strong>Email:</strong>{" "}
                {candidate.email || "Not found"}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {candidate.phone || "Not found"}
              </p>

              <p>
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

          {/* Score */}
          {evaluation && (
            <div className="flex h-fit items-center gap-5">

              <div className="rounded-xl bg-gray-100 px-8 py-5 text-center">
                <p className="text-xs text-gray-500">
                  Match Score
                </p>

                <p className="mt-1 text-4xl font-bold text-gray-900">
                  {evaluation.matchScore}
                  <span className="text-lg text-gray-400">
                    /100
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Category
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {evaluation.category}
                </p>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* Skills */}
        <div className="rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Skills
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">

            {candidate.skills?.length > 0 ? (
              candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-700"
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

        {/* Experience */}
        <div className="rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Experience
          </h2>

          <div className="mt-4 space-y-4">

            {candidate.experience?.length > 0 ? (
              candidate.experience.map(
                (experience, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <p className="font-semibold text-gray-900">
                      {experience.role}
                    </p>

                    <p className="text-sm text-gray-600">
                      {experience.company}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {experience.duration}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-gray-500">
                No experience found.
              </p>
            )}

          </div>
        </div>

        {/* Education */}
        <div className="rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Education
          </h2>

          <div className="mt-4 space-y-4">

            {candidate.education?.length > 0 ? (
              candidate.education.map(
                (education, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <p className="font-semibold text-gray-900">
                      {education.degree}
                    </p>

                    <p className="text-sm text-gray-600">
                      {education.institution}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {education.duration}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-gray-500">
                No education found.
              </p>
            )}

          </div>
        </div>

        {/* Certifications */}
        <div className="rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Certifications
          </h2>

          <div className="mt-4">

            {candidate.certifications?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {candidate.certifications.map(
                  (certification) => (
                    <span
                      key={certification}
                      className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-700"
                    >
                      {certification}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No certifications found.
              </p>
            )}

          </div>
        </div>

      </div>

      {/* Evaluation */}
      {evaluation && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Evaluation
          </h2>

          {/* Matrix */}
          <div className="mt-5 grid gap-4 md:grid-cols-5">

            {Object.entries(
              evaluation.evaluationMatrix || {}
            ).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-xs capitalize text-gray-500">
                  {key}
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {value}
                </p>
              </div>
            ))}

          </div>

          {/* Matched / Missing */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">

            <div>
              <h3 className="font-medium text-gray-900">
                Matched Skills
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                {evaluation.matchedSkills?.length
                  ? evaluation.matchedSkills.join(", ")
                  : "No matched skills"}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">
                Missing Skills
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                {evaluation.missingSkills?.length
                  ? evaluation.missingSkills.join(", ")
                  : "No missing skills"}
              </p>
            </div>

          </div>

          {/* Elimination */}
          {evaluation.eliminationReasons?.length > 0 && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">

              <h3 className="font-medium text-gray-900">
                Elimination Reasons
              </h3>

              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                {evaluation.eliminationReasons.map(
                  (reason) => (
                    <li key={reason}>
                      {reason}
                    </li>
                  )
                )}
              </ul>

            </div>
          )}

          {/* Justification */}
          <div className="mt-6 rounded-lg bg-gray-50 p-5">

            <h3 className="font-medium text-gray-900">
              Evaluation Summary
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {evaluation.justification}
            </p>

          </div>

        </div>
      )}

    </div>
  );
}

export default CandidateDetails;