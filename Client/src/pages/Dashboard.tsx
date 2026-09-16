import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getActiveWorkout } from "../workouts/workout.service";

export function Dashboard() {
  const { user } = useAuth();
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const userId = user.id;
    let cancelled = false;

    async function load() {
      const result = await getActiveWorkout(userId);

      if (!cancelled) {
        setHasActiveWorkout(Boolean(result.data));
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            Train smarter. Progress together.
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hey there
          </h1>

          <p className="mt-2 text-zinc-400">
            Another step closer to a stronger you.
          </p>
        </div>

        <div className="hidden h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-lg sm:flex">
          {user?.email?.slice(0, 1).toUpperCase() ?? "R"}
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
        <p className="max-w-md text-2xl font-semibold leading-tight sm:text-3xl">
          Discipline today,
          <br />
          results tomorrow.
        </p>

        <div className="mt-5 h-1 w-10 rounded-full bg-lime-400" />
      </div>

      <div className="mt-7 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
            Training
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Today’s Workout
          </h2>
        </div>

        <NavLink
          to="/workout"
          className="text-sm font-medium text-lime-400 transition hover:text-lime-300"
        >
          {hasActiveWorkout ? "Continue" : "View workout"} →
        </NavLink>
      </div>

      <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-xl">
                ↕
              </span>

              <div>
                <h3 className="font-semibold">
                  {hasActiveWorkout
                    ? "Workout in progress"
                    : "Ready to train?"}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {hasActiveWorkout
                    ? "Pick up exactly where you left off."
                    : "Start a session and log your sets."}
                </p>
              </div>
            </div>
          </div>

          <NavLink
            to="/workout"
            className="rounded-2xl bg-lime-400 px-6 py-3.5 text-center font-semibold text-zinc-950 transition hover:bg-lime-300"
          >
            {loading
              ? "Loading..."
              : hasActiveWorkout
                ? "Continue Workout →"
                : "Start Workout →"}
          </NavLink>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat value="—" label="Workouts this week" />
        <Stat value="—" label="Total volume" />
        <Stat value="—" label="Day streak" />
      </div>

      <div className="mt-7">
        <h2 className="text-xl font-semibold">Quick Actions</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            to="/workout"
            icon="+"
            label="Log Workout"
          />

          <QuickAction
            to="/progress"
            icon="↗"
            label="View Progress"
          />

          <QuickAction
            to="/workout"
            icon="↕"
            label="Exercises"
          />

          <QuickAction
            to="/nutrition"
            icon="⌁"
            label="Nutrition"
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <p className="text-xl font-semibold">{value}</p>

      <p className="mt-1 text-xs leading-4 text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: string;
  icon: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700 hover:bg-zinc-800"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-lg text-lime-400">
        {icon}
      </span>

      <p className="mt-4 text-sm font-medium">{label}</p>
    </NavLink>
  );
}