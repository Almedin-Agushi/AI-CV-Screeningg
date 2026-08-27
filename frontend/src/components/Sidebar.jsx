import { NavLink } from "react-router-dom";

function Sidebar() {
  const links = [
    { name: "Dashboard", path: "/" },
    { name: "Create Job", path: "/jobs/create" },
    { name: "Upload CV", path: "/upload-cv" },
    { name: "Candidates", path: "/candidates" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-white p-5">
      <h1 className="text-xl font-bold text-gray-900">
        AI CV Screening
      </h1>

      <p className="mt-1 text-xs text-gray-500">
        Candidate evaluation system
      </p>

      <nav className="mt-8 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
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
  );
}

export default Sidebar;