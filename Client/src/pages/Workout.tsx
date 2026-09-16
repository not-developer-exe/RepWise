import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  addWorkoutExercise,
  completeWorkout,
  getActiveWorkout,
  getExercises,
  getWorkoutExercises,
  getWorkoutSets,
  saveWorkoutSet,
  startWorkout,
  updateWorkoutSet,
} from "../workouts/workout.service";

type Exercise = {
  id: number;
  name: string;
  primary_muscles: string[];
};

type WorkoutExercise = {
  id: number;
  exercise_id: number;
  order_index: number;
};

type WorkoutSet = {
  id: number;
  set_index: number;
  set_type: "warmup" | "working" | "dropset" | "failure" | "amrap";
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rir: number | null;
  rpe: number | null;
  is_completed: boolean;
  notes: string | null;
};

type SetDraft = {
  weight: string;
  reps: string;
  rir: string;
  rpe: string;
};

function numberOrNull(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildSetDraft(workoutSet: WorkoutSet): SetDraft {
  return {
    weight:
      workoutSet.weight != null ? String(workoutSet.weight) : "",
    reps: workoutSet.reps != null ? String(workoutSet.reps) : "",
    rir: workoutSet.rir != null ? String(workoutSet.rir) : "",
    rpe: workoutSet.rpe != null ? String(workoutSet.rpe) : "",
  };
}

export function Workout() {
  const { user } = useAuth();

  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<
    WorkoutExercise[]
  >([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<Record<number, WorkoutSet[]>>({});
  const [drafts, setDrafts] = useState<Record<number, SetDraft>>({});
  const [savingSetId, setSavingSetId] = useState<number | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkout() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    const [activeResult, exercisesResult] = await Promise.all([
      getActiveWorkout(user.id),
      getExercises(),
    ]);

    if (activeResult.error) {
      setError(activeResult.error.message);
      setLoading(false);
      return;
    }

    if (exercisesResult.error) {
      setError(exercisesResult.error.message);
      setLoading(false);
      return;
    }

    setExercises(exercisesResult.data ?? []);

    if (!activeResult.data) {
      setWorkoutId(null);
      setWorkoutExercises([]);
      setSets({});
      setDrafts({});
      setLoading(false);
      return;
    }

    const activeWorkoutId = activeResult.data.id;

    setWorkoutId(activeWorkoutId);

    const workoutExercisesResult =
      await getWorkoutExercises(activeWorkoutId);

    if (workoutExercisesResult.error) {
      setError(workoutExercisesResult.error.message);
      setLoading(false);
      return;
    }

    const loadedWorkoutExercises =
      workoutExercisesResult.data ?? [];

    setWorkoutExercises(loadedWorkoutExercises);

    const setResults = await Promise.all(
      loadedWorkoutExercises.map(async (workoutExercise) => {
        const result = await getWorkoutSets(workoutExercise.id);

        return {
          workoutExerciseId: workoutExercise.id,
          data: result.data ?? [],
          error: result.error,
        };
      }),
    );

    const nextSets: Record<number, WorkoutSet[]> = {};
    const nextDrafts: Record<number, SetDraft> = {};

    for (const result of setResults) {
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      nextSets[result.workoutExerciseId] = result.data;

      for (const workoutSet of result.data) {
        nextDrafts[workoutSet.id] = buildSetDraft(workoutSet);
      }
    }

    setSets(nextSets);
    setDrafts(nextDrafts);
    setLoading(false);
  }

  useEffect(() => {
    void loadWorkout();
  }, [user]);

  async function handleStartWorkout() {
    if (!user) {
      return;
    }

    setStarting(true);
    setError("");

    const { data, error: startError } = await startWorkout({
      clientId: user.id,
      scheduledFor: new Date().toISOString().slice(0, 10),
    });

    if (startError) {
      setError(startError.message);
      setStarting(false);
      return;
    }

    if (!data) {
      setError("Workout could not be created.");
      setStarting(false);
      return;
    }

    setWorkoutId(data.id);
    setWorkoutExercises([]);
    setSets({});
    setDrafts({});
    setStarting(false);
  }

  async function handleAddExercise(exerciseId: number) {
    if (!workoutId) {
      return;
    }

    setError("");

    const { data, error: addError } = await addWorkoutExercise({
      workoutId,
      exerciseId,
      orderIndex: workoutExercises.length,
    });

    if (addError) {
      setError(addError.message);
      return;
    }

    if (!data) {
      setError("Exercise could not be added.");
      return;
    }

    setWorkoutExercises((current) => [...current, data]);

    setSets((current) => ({
      ...current,
      [data.id]: [],
    }));

    setShowExercisePicker(false);
  }

  async function handleAddSet(workoutExerciseId: number) {
    const currentSets = sets[workoutExerciseId] ?? [];
    const nextIndex = currentSets.length;

    const { data, error: saveError } = await saveWorkoutSet({
      workoutExerciseId,
      setIndex: nextIndex,
      setType: "working",
      weight: null,
      reps: null,
      durationSeconds: null,
      rir: null,
      rpe: null,
      isCompleted: false,
      notes: null,
    });

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (!data) {
      setError("Set could not be created.");
      return;
    }

    setSets((current) => ({
      ...current,
      [workoutExerciseId]: [
        ...(current[workoutExerciseId] ?? []),
        data,
      ],
    }));

    setDrafts((current) => ({
      ...current,
      [data.id]: buildSetDraft(data),
    }));
  }

  function updateDraft(
    workoutSetId: number,
    field: keyof SetDraft,
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [workoutSetId]: {
        ...(current[workoutSetId] ?? {
          weight: "",
          reps: "",
          rir: "",
          rpe: "",
        }),
        [field]: value,
      },
    }));
  }

  async function handleSaveSet(workoutSet: WorkoutSet) {
    const draft = drafts[workoutSet.id];

    if (!draft) {
      return;
    }

    setSavingSetId(workoutSet.id);
    setError("");

    const { data, error: updateError } = await updateWorkoutSet(
      workoutSet.id,
      {
        setType: workoutSet.set_type,
        weight: numberOrNull(draft.weight),
        reps: numberOrNull(draft.reps),
        durationSeconds: workoutSet.duration_seconds,
        rir: numberOrNull(draft.rir),
        rpe: numberOrNull(draft.rpe),
        isCompleted: workoutSet.is_completed,
        notes: workoutSet.notes,
      },
    );

    if (updateError) {
      setError(updateError.message);
      setSavingSetId(null);
      return;
    }

    if (!data) {
      setError("Set could not be updated.");
      setSavingSetId(null);
      return;
    }

    setSets((current) => {
      const next = { ...current };

      for (const [workoutExerciseId, exerciseSets] of Object.entries(
        next,
      )) {
        next[Number(workoutExerciseId)] = exerciseSets.map((set) =>
          set.id === workoutSet.id ? data : set,
        );
      }

      return next;
    });

    setDrafts((current) => ({
      ...current,
      [workoutSet.id]: buildSetDraft(data),
    }));

    setSavingSetId(null);
  }

  async function handleToggleSet(workoutSet: WorkoutSet) {
    const draft = drafts[workoutSet.id];

    if (!draft) {
      return;
    }

    setSavingSetId(workoutSet.id);
    setError("");

    const { data, error: updateError } = await updateWorkoutSet(
      workoutSet.id,
      {
        setType: workoutSet.set_type,
        weight: numberOrNull(draft.weight),
        reps: numberOrNull(draft.reps),
        durationSeconds: workoutSet.duration_seconds,
        rir: numberOrNull(draft.rir),
        rpe: numberOrNull(draft.rpe),
        isCompleted: !workoutSet.is_completed,
        notes: workoutSet.notes,
      },
    );

    if (updateError) {
      setError(updateError.message);
      setSavingSetId(null);
      return;
    }

    if (!data) {
      setError("Set could not be updated.");
      setSavingSetId(null);
      return;
    }

    setSets((current) => {
      const next = { ...current };

      for (const [workoutExerciseId, exerciseSets] of Object.entries(
        next,
      )) {
        next[Number(workoutExerciseId)] = exerciseSets.map((set) =>
          set.id === workoutSet.id ? data : set,
        );
      }

      return next;
    });

    setDrafts((current) => ({
      ...current,
      [workoutSet.id]: buildSetDraft(data),
    }));

    setSavingSetId(null);
  }

  async function handleFinishWorkout() {
    if (!workoutId) {
      return;
    }

    setFinishing(true);
    setError("");

    const { error: finishError } = await completeWorkout(workoutId);

    if (finishError) {
      setError(finishError.message);
      setFinishing(false);
      return;
    }

    setWorkoutId(null);
    setWorkoutExercises([]);
    setSets({});
    setDrafts({});
    setFinishing(false);
  }

  function getExercise(exerciseId: number) {
    return exercises.find((exercise) => exercise.id === exerciseId);
  }

  if (loading) {
    return (
      <section>
        <p className="text-sm text-zinc-500">RepWise</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Workout
        </h1>

        <p className="mt-8 text-zinc-500">
          Loading workout...
        </p>
      </section>
    );
  }

  if (!workoutId) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-sm text-zinc-500">RepWise</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Ready to train?
        </h1>

        <p className="mt-3 text-zinc-400">
          Start a workout and build it exercise by exercise.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleStartWorkout}
          disabled={starting}
          className="mt-8 w-full rounded-2xl bg-lime-400 px-5 py-4 font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
        >
          {starting ? "Starting workout..." : "Start Workout"}
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-lime-400">In progress</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Today’s Workout
          </h1>
        </div>

        <button
          type="button"
          onClick={handleFinishWorkout}
          disabled={finishing}
          className="rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
        >
          {finishing ? "Finishing..." : "Finish"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-5">
        {workoutExercises.map((workoutExercise) => {
          const exercise = getExercise(
            workoutExercise.exercise_id,
          );

          const exerciseSets =
            sets[workoutExercise.id] ?? [];

          return (
            <article
              key={workoutExercise.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div>
                <h2 className="text-lg font-semibold">
                  {exercise?.name ?? "Exercise"}
                </h2>

                {exercise?.primary_muscles?.length ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    {exercise.primary_muscles.join(" · ")}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr_64px] gap-2 px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>RIR</span>
                    <span>RPE</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {exerciseSets.map((set) => {
                      const draft = drafts[set.id] ?? {
                        weight: "",
                        reps: "",
                        rir: "",
                        rpe: "",
                      };

                      const saving = savingSetId === set.id;

                      return (
                        <div
                          key={set.id}
                          className={`grid grid-cols-[48px_1fr_1fr_1fr_1fr_64px] items-center gap-2 rounded-xl border p-2 transition ${
                            set.is_completed
                              ? "border-lime-400/30 bg-lime-400/10"
                              : "border-zinc-800 bg-zinc-950"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              void handleToggleSet(set)
                            }
                            disabled={saving}
                            aria-label={`Mark set ${
                              set.set_index + 1
                            } ${
                              set.is_completed
                                ? "incomplete"
                                : "complete"
                            }`}
                            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition ${
                              set.is_completed
                                ? "bg-lime-400 text-zinc-950"
                                : "bg-zinc-900 text-zinc-500 hover:text-white"
                            }`}
                          >
                            {set.set_index + 1}
                          </button>

                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.25"
                            value={draft.weight}
                            onChange={(event) =>
                              updateDraft(
                                set.id,
                                "weight",
                                event.target.value,
                              )
                            }
                            placeholder="kg"
                            aria-label={`Set ${
                              set.set_index + 1
                            } weight`}
                            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
                          />

                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={draft.reps}
                            onChange={(event) =>
                              updateDraft(
                                set.id,
                                "reps",
                                event.target.value,
                              )
                            }
                            placeholder="reps"
                            aria-label={`Set ${
                              set.set_index + 1
                            } reps`}
                            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
                          />

                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="10"
                            step="0.5"
                            value={draft.rir}
                            onChange={(event) =>
                              updateDraft(
                                set.id,
                                "rir",
                                event.target.value,
                              )
                            }
                            placeholder="—"
                            aria-label={`Set ${
                              set.set_index + 1
                            } RIR`}
                            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
                          />

                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="10"
                            step="0.5"
                            value={draft.rpe}
                            onChange={(event) =>
                              updateDraft(
                                set.id,
                                "rpe",
                                event.target.value,
                              )
                            }
                            placeholder="—"
                            aria-label={`Set ${
                              set.set_index + 1
                            } RPE`}
                            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              void handleSaveSet(set)
                            }
                            disabled={saving}
                            className="h-10 rounded-lg px-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                          >
                            {saving ? "Saving" : "Save"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleAddSet(workoutExercise.id)
                }
                className="mt-4 w-full rounded-xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
              >
                + Add Set
              </button>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowExercisePicker(true)}
        className="mt-5 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 font-medium transition hover:border-zinc-700 hover:bg-zinc-800"
      >
        + Add Exercise
      </button>

      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 md:items-center">
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div>
                <h2 className="font-semibold">
                  Add Exercise
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Choose from your exercise library.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowExercisePicker(false)
                }
                className="text-zinc-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() =>
                    void handleAddExercise(exercise.id)
                  }
                  className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-zinc-800"
                >
                  <p className="font-medium">
                    {exercise.name}
                  </p>

                  {exercise.primary_muscles?.length ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {exercise.primary_muscles.join(" · ")}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}