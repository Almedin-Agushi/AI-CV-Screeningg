import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Dashboard from "./page/Dashboard";
import CreateJob from "./page/CreateJob";
import UploadCV from "./page/UploadCV";
import Candidates from "./page/Candidates";
import CandidateDetails from "./page/CandidateDetails";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">

        <Sidebar
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
        />

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-4 md:hidden">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="rounded-lg p-2 text-2xl text-gray-800 hover:bg-gray-100"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="ml-3">
            <h1 className="text-base font-bold text-gray-900">
              AI CV Screening
            </h1>

            <p className="text-xs text-gray-500">
              Candidate evaluation system
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-screen md:ml-64">
          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/jobs/create"
              element={<CreateJob />}
            />

            <Route
              path="/upload-cv"
              element={<UploadCV />}
            />

            <Route
              path="/candidates"
              element={<Candidates />}
            />

            <Route
              path="/candidates/:candidateId"
              element={<CandidateDetails />}
            />

          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;