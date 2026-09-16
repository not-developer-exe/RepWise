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
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  is_completed: boolean;
};

export function Workout() {
  const { user } = useAuth();

  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    [],
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<Record<number, WorkoutSet[]>>({});
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

    const loadedWorkoutExercises = workoutExercisesResult.data ?? [];

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

    for (const result of setResults) {
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      nextSets[result.workoutExerciseId] = result.data;
    }

    setSets(nextSets);
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
  }

  async function handleToggleSet(
    workoutExerciseId: number,
    workoutSet: WorkoutSet,
  ) {
    const nextCompleted = !workoutSet.is_completed;

    const { data, error: updateError } = await saveWorkoutSet({
      workoutExerciseId,
      setIndex: workoutSet.set_index,
      setType: "working",
      weight: workoutSet.weight,
      reps: workoutSet.reps,
      durationSeconds: null,
      rir: null,
      rpe: workoutSet.rpe,
      isCompleted: nextCompleted,
      notes: null,
    });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (!data) {
      return;
    }

    setSets((current) => ({
      ...current,
      [workoutExerciseId]: (current[workoutExerciseId] ?? []).map((set) =>
        set.id === workoutSet.id ? data : set,
      ),
    }));
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
        <p className="mt-8 text-zinc-500">Loading workout...</p>
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
          const exercise = getExercise(workoutExercise.exercise_id);
          const exerciseSets = sets[workoutExercise.id] ?? [];

          return (
            <article
              key={workoutExercise.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between">
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
              </div>

              <div className="mt-5 space-y-2">
                {exerciseSets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() =>
                      handleToggleSet(workoutExercise.id, set)
                    }
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      set.is_completed
                        ? "border-lime-400/30 bg-lime-400/10"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <span className="text-sm text-zinc-400">
                      Set {set.set_index + 1}
                    </span>

                    <span className="text-sm">
                      {set.weight != null ? `${set.weight} kg` : "—"}{" "}
                      ×{" "}
                      {set.reps != null ? set.reps : "—"}
                    </span>

                    <span
                      className={
                        set.is_completed
                          ? "font-semibold text-lime-400"
                          : "text-zinc-600"
                      }
                    >
                      {set.is_completed ? "✓" : "○"}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddSet(workoutExercise.id)}
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
                <h2 className="font-semibold">Add Exercise</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Choose from your exercise library.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExercisePicker(false)}
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
                  onClick={() => handleAddExercise(exercise.id)}
                  className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-zinc-800"
                >
                  <p className="font-medium">{exercise.name}</p>

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