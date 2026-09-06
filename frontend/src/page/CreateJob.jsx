import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-cv-screening-backend.onrender.com";

function CreateJob() {
  const [jobTitle, setJobTitle] =
    useState("Frontend Developer");

  const [skills, setSkills] =
    useState(
      "HTML, CSS, JavaScript, React"
    );

  const [minimumExperience, setMinimumExperience] =
    useState(1);

  const [minimumEducation, setMinimumEducation] =
    useState("Bachelor");

  const [industryBackground, setIndustryBackground] =
    useState("Web Development");

  const [certifications, setCertifications] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [createdJob, setCreatedJob] =
    useState(null);

  // =====================================================
  // CREATE JOB
  // =====================================================

  const handleCreateJob = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setCreatedJob(null);

    const jobData = {
      jobTitle: jobTitle.trim(),

      requiredSkills: skills
        .split(",")
        .map((skill) =>
          skill.trim()
        )
        .filter(Boolean),

      minimumExperience:
        Number(minimumExperience) || 0,

      minimumEducation:
        minimumEducation.trim(),

      industryBackground:
        industryBackground.trim(),

      mandatoryCertifications:
        certifications
          .split(",")
          .map((cert) =>
            cert.trim()
          )
          .filter(
            (cert) =>
              cert &&
              cert.toLowerCase() !==
                "none"
          ),
    };

    console.log(
      "Sending job:",
      jobData
    );

    try {
      const response = await fetch(
        `${API_URL}/api/jobs`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            jobData
          ),
        }
      );

      const responseText =
        await response.text();

      let data;

      try {
        data =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};
      } catch {
        console.error(
          "Backend response:",
          responseText
        );

        throw new Error(
          "Backend returned invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not create job."
        );
      }

      setCreatedJob(
        data.job
      );

      setMessage(
        "Job created successfully! CVs will now be evaluated using these requirements."
      );

    } catch (error) {
      console.error(
        "Create job error:",
        error
      );

      setMessage(
        `Error: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">

      {/* HEADER */}
      <div className="mb-8">

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Create Job
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Define the requirements used to evaluate candidates.
        </p>

      </div>

      {/* FORM */}
      <form
        onSubmit={
          handleCreateJob
        }
        className="max-w-4xl rounded-xl bg-white p-5 shadow-sm sm:p-8"
      >

        {/* JOB TITLE */}
        <div className="mb-6">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Job Title
          </label>

          <input
            type="text"
            value={jobTitle}
            onChange={(e) =>
              setJobTitle(
                e.target.value
              )
            }
            placeholder="Frontend Developer"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

        </div>

        {/* SKILLS */}
        <div className="mb-6">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Required Skills
          </label>

          <input
            type="text"
            value={skills}
            onChange={(e) =>
              setSkills(
                e.target.value
              )
            }
            placeholder="HTML, CSS, JavaScript, React"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <p className="mt-2 text-xs text-gray-500">
            Separate skills with commas.
          </p>

        </div>

        {/* EXPERIENCE */}
        <div className="mb-6">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Minimum Experience
          </label>

          <input
            type="number"
            min="0"
            value={
              minimumExperience
            }
            onChange={(e) =>
              setMinimumExperience(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <p className="mt-2 text-xs text-gray-500">
            Minimum years of work experience.
          </p>

        </div>

        {/* EDUCATION */}
        <div className="mb-6">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Minimum Education
          </label>

          <select
            value={
              minimumEducation
            }
            onChange={(e) =>
              setMinimumEducation(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          >

            <option value="None">
              None
            </option>

            <option value="High School">
              High School
            </option>

            <option value="Bachelor">
              Bachelor
            </option>

            <option value="Master">
              Master
            </option>

            <option value="PhD">
              PhD
            </option>

          </select>

        </div>

        {/* INDUSTRY */}
        <div className="mb-6">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Industry Background
          </label>

          <input
            type="text"
            value={
              industryBackground
            }
            onChange={(e) =>
              setIndustryBackground(
                e.target.value
              )
            }
            placeholder="Web Development"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

        </div>

        {/* CERTIFICATIONS */}
        <div className="mb-8">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Mandatory Certifications
          </label>

          <input
            type="text"
            value={
              certifications
            }
            onChange={(e) =>
              setCertifications(
                e.target.value
              )
            }
            placeholder="None"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <p className="mt-2 text-xs text-gray-500">
            Leave empty if certifications are not required.
          </p>

        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating Job..."
            : "Create Job"}
        </button>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${
              message.startsWith(
                "Error:"
              )
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

      </form>

      {/* CREATED JOB */}
      {createdJob && (
        <div className="mt-8 max-w-4xl rounded-xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold text-gray-900">
            Active Job
          </h2>

          <p className="mt-4 text-sm text-gray-700">
            <strong>Title:</strong>{" "}
            {createdJob.jobTitle}
          </p>

          <p className="mt-2 text-sm text-gray-700">
            <strong>Skills:</strong>{" "}
            {createdJob.requiredSkills?.join(
              ", "
            ) || "None"}
          </p>

          <p className="mt-2 text-sm text-gray-700">
            <strong>Experience:</strong>{" "}
            {createdJob.minimumExperience}
          </p>

          <p className="mt-2 text-sm text-gray-700">
            <strong>Education:</strong>{" "}
            {createdJob.minimumEducation}
          </p>

          <p className="mt-2 text-sm text-gray-700">
            <strong>Industry:</strong>{" "}
            {createdJob.industryBackground}
          </p>

          <p className="mt-2 text-sm text-gray-700">
            <strong>Certifications:</strong>{" "}
            {createdJob
              .mandatoryCertifications
              ?.length
              ? createdJob.mandatoryCertifications.join(
                  ", "
                )
              : "None"}
          </p>

          <div className="mt-5 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              ✓ These requirements are now active for CV evaluation.
            </p>
          </div>

        </div>
      )}

    </div>
  );
}

export default CreateJob;