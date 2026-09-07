import { NavLink } from "react-router-dom";

function Sidebar({ isOpen, setIsOpen }) {
  const links = [
    { name: "Dashboard", path: "/" },
    { name: "Create Job", path: "/jobs/create" },
    { name: "Upload CV", path: "/upload-cv" },
    { name: "Candidates", path: "/candidates" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen w-64
          border-r bg-white p-5
          transition-transform duration-300
          md:translate-x-0
          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              AI CV Screening
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Candidate evaluation system
            </p>
          </div>

          {/* Close button - mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="text-2xl text-gray-600 md:hidden"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;