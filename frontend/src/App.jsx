import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Dashboard from "./page/Dashboard";
import CreateJob from "./page/CreateJob";
import UploadCV from "./page/UploadCV";
import Candidates from "./page/Candidates";
import CandidateDetails from "./page/CandidateDetails";
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">

        <Sidebar />

        <main className="ml-64 min-h-screen">
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