import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navigation = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Workout", to: "/workout" },
  { label: "Progress", to: "/progress" },
  { label: "Nutrition", to: "/nutrition" },
];

export function AppLayout() {
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <NavLink
            to="/dashboard"
            className="text-lg font-bold tracking-tight"
          >
            Rep<span className="text-lime-400">Wise</span>
          </NavLink>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-500 sm:block">
              {user?.email}
            </span>

            <button
              onClick={handleSignOut}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-56 border-r border-zinc-900 p-4 md:block">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 pb-24 md:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed right-0 bottom-0 left-0 border-t border-zinc-900 bg-zinc-950/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="flex justify-around">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 text-xs ${
                  isActive ? "text-lime-400" : "text-zinc-500"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}