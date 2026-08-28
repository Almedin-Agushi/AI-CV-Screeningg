import { useState } from "react";

function CreateJob() {
  const [jobTitle, setJobTitle] = useState("Frontend Developer");
  const [skills, setSkills] = useState("HTML, CSS, JavaScript, React");
  const [minimumExperience, setMinimumExperience] = useState(1);
  const [minimumEducation, setMinimumEducation] = useState("Bachelor");
  const [industryBackground, setIndustryBackground] = useState("Web Development");
  const [certifications, setCertifications] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState(null); // shto state për job-in e krijuar

  const handleCreateJob = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setCreatedJob(null);

    const jobData = {
      jobTitle,
      requiredSkills: skills.split(",").map((skill) => skill.trim()).filter(Boolean),
      minimumExperience: Number(minimumExperience),
      minimumEducation,
      industryBackground,
      mandatoryCertifications: certifications.split(",").map((cert) => cert.trim()).filter(Boolean),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create job");
      }

      setMessage("Job created successfully!");
      setCreatedJob(data.job); // ruaj job-in e krijuar
    } catch (error) {
      console.error("Create job error:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Job</h1>
        <p className="mt-2 text-gray-500">
          Define the requirements used to evaluate candidates.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleCreateJob} className="max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        {/* Job title */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Frontend Developer"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>

        {/* Required skills */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Required Skills</label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="HTML, CSS, JavaScript, React"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <p className="mt-2 text-xs text-gray-500">Separate skills with commas.</p>
        </div>

        {/* Experience */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Minimum Experience</label>
          <input
            type="number"
            min="0"
            value={minimumExperience}
            onChange={(e) => setMinimumExperience(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <p className="mt-2 text-xs text-gray-500">Minimum number of experience positions.</p>
        </div>

        {/* Education */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Minimum Education</label>
          <select
            value={minimumEducation}
            onChange={(e) => setMinimumEducation(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          >
            <option value="None">None</option>
            <option value="High School">High School</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Master">Master</option>
            <option value="PhD">PhD</option>
          </select>
        </div>

        {/* Industry */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Industry Background</label>
          <input
            type="text"
            value={industryBackground}
            onChange={(e) => setIndustryBackground(e.target.value)}
            placeholder="Web Development"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>

        {/* Certifications */}
        <div className="mb-8">
          <label className="mb-2 block text-sm font-medium text-gray-700">Mandatory Certifications</label>
          <input
            type="text"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            placeholder="None"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <p className="mt-2 text-xs text-gray-500">
            Leave empty if certifications are not required.
          </p>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating Job..." : "Create Job"}
        </button>

        {/* Message */}
        {message && (
          <div className="mt-5 rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700">
            {message}
          </div>
        )}
      </form>

      {/* Created Job Details */}
      {createdJob && (
        <div className="mt-8 max-w-4xl rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Created Job</h2>
          <p className="mt-2 text-gray-700"><strong>Title:</strong> {createdJob.jobTitle}</p>
          <p className="mt-2 text-gray-700"><strong>Skills:</strong> {createdJob.requiredSkills.join(", ")}</p>
          <p className="mt-2 text-gray-700"><strong>Experience:</strong> {createdJob.minimumExperience}</p>
          <p className="mt-2 text-gray-700"><strong>Education:</strong> {createdJob.minimumEducation}</p>
          <p className="mt-2 text-gray-700"><strong>Industry:</strong> {createdJob.industryBackground}</p>
          <p className="mt-2 text-gray-700"><strong>Certifications:</strong> 
            {createdJob.mandatoryCertifications.length > 0 
              ? createdJob.mandatoryCertifications.join(", ") 
              : "None"}
          </p>
        </div>
      )}
    </div>
  );
}

export default CreateJob;
