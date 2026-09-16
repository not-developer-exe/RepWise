import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  formatProgressDate,
  getProgressData,
  type ProgressData,
  type ProgressRange,
} from "../progress/progress.service";

const ranges: ProgressRange[] = ["1W", "1M", "3M", "1Y"];

function formatVolume(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }

  return value.toLocaleString();
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value}%`;
}

export function Progress() {
  const { user } = useAuth();
  const [range, setRange] = useState<ProgressRange>("1M");
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const result = await getProgressData(userId, range);

      if (cancelled) return;

      if (result.error) {
        setError(result.error.message);
        setData(null);
      } else {
        setData(result.data);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, range]);

  const maxVolume = useMemo(
    () =>
      Math.max(
        ...(data?.volumePoints.map((point) => point.volume) ?? [1]),
        1,
      ),
    [data],
  );

  const muscleEntries = useMemo(() => {
    if (!data) return [];

    return Object.entries(data.muscleFocus)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [data]);

  const totalMuscleSets = muscleEntries.reduce(
    (sum, [, count]) => sum + count,
    0,
  );

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl">
        <p className="text-sm text-zinc-500">Track. Improve. Repeat.</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Progress
        </h1>

        <div className="mt-8 h-72 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/70" />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div>
        <p className="text-sm text-zinc-500">Track. Improve. Repeat.</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Progress
        </h1>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-4 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-1.5">
        {ranges.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setRange(item)}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              range === item
                ? "bg-lime-400 text-zinc-950"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Workouts"
          value={String(data?.workouts ?? 0)}
        />

        <Metric
          label="Total Volume"
          value={`${formatVolume(data?.totalVolume ?? 0)} kg`}
        />

        <Metric
          label="Strength Gain"
          value={formatPercent(data?.strengthGain ?? null)}
          accent
        />
      </div>

      <div className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Total Volume</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Completed training volume
            </p>
          </div>

          <span className="text-sm font-semibold text-lime-400">
            {formatPercent(data?.strengthGain ?? null)}
          </span>
        </div>

        {data?.volumePoints.length ? (
          <div className="mt-7">
            <div className="flex h-48 items-end gap-1.5 sm:gap-2">
              {data.volumePoints.map((point) => (
                <div
                  key={`${point.date}-${point.volume}`}
                  className="group flex min-w-0 flex-1 items-end"
                  title={`${formatProgressDate(point.date)} · ${point.volume.toLocaleString()} kg`}
                >
                  <div
                    className="w-full rounded-t-md bg-lime-400/80 transition group-hover:bg-lime-300"
                    style={{
                      height: `${Math.max(
                        5,
                        (point.volume / maxVolume) * 100,
                      )}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between text-[11px] text-zinc-600">
              <span>
                {formatProgressDate(data.volumePoints[0].date)}
              </span>

              <span>
                {formatProgressDate(
                  data.volumePoints[data.volumePoints.length - 1].date,
                )}
              </span>
            </div>
          </div>
        ) : (
          <EmptyState message="Complete a workout to start building your volume history." />
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Muscle Focus</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Completed sets by primary muscle
          </p>

          {muscleEntries.length ? (
            <div className="mt-6 space-y-4">
              {muscleEntries.map(([muscle, count]) => {
                const percentage = totalMuscleSets
                  ? Math.round((count / totalMuscleSets) * 100)
                  : 0;

                return (
                  <div key={muscle}>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300">{muscle}</span>

                      <span className="text-zinc-500">
                        {percentage}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-lime-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="Your muscle breakdown will appear after completed sets." />
          )}
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Recent Workouts
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Your latest completed sessions
              </p>
            </div>
          </div>

          {data?.recentWorkouts.length ? (
            <div className="mt-5 divide-y divide-zinc-800">
              {data.recentWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-lg">
                      ↕
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        Workout
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatProgressDate(workout.date)} ·{" "}
                        {workout.exerciseCount} exercises
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-sm text-zinc-400">
                    {formatVolume(workout.volume)} kg
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No completed workouts in this period yet." />
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p
        className={`mt-1 text-sm ${
          accent ? "text-lime-400" : "text-zinc-500"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-5 py-8 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}