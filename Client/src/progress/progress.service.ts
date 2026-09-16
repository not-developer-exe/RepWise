import { supabase } from "../lib/supabase";

export type ProgressRange = "1W" | "1M" | "3M" | "1Y";

export type ProgressSet = {
  weight: number | null;
  reps: number | null;
  is_completed: boolean;
};

export type ProgressPoint = {
  date: string;
  volume: number;
};

export type RecentWorkout = {
  id: number;
  date: string;
  exerciseCount: number;
  volume: number;
};

export type ProgressData = {
  workouts: number;
  totalVolume: number;
  strengthGain: number | null;
  volumePoints: ProgressPoint[];
  recentWorkouts: RecentWorkout[];
  muscleFocus: Record<string, number>;
};

export function calculateEstimatedOneRepMax(
  weight: number,
  reps: number,
): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function calculateWorkoutVolume(sets: ProgressSet[]): number {
  return sets.reduce((total, set) => {
    if (!set.is_completed || set.weight == null || set.reps == null) {
      return total;
    }

    return total + Math.max(0, set.weight) * Math.max(0, set.reps);
  }, 0);
}

export function getDateRangeStart(
  range: ProgressRange,
  endDate: string,
): string {
  const date = new Date(`${endDate}T00:00:00Z`);

  if (range === "1W") date.setUTCDate(date.getUTCDate() - 6);
  if (range === "1M") date.setUTCDate(date.getUTCDate() - 29);
  if (range === "3M") date.setUTCMonth(date.getUTCMonth() - 3);
  if (range === "1Y") date.setUTCFullYear(date.getUTCFullYear() - 1);

  return date.toISOString().slice(0, 10);
}

export function formatProgressDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export async function getProgressData(
  clientId: string,
  range: ProgressRange,
): Promise<{ data: ProgressData | null; error: Error | null }> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = getDateRangeStart(range, endDate);

  const { data: workouts, error: workoutError } = await supabase
    .from("workouts")
    .select("id, completed_at, scheduled_for")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .gte("completed_at", `${startDate}T00:00:00.000Z`)
    .lte("completed_at", `${endDate}T23:59:59.999Z`)
    .order("completed_at", { ascending: false })
    .limit(100);

  if (workoutError) return { data: null, error: workoutError };

  if (!workouts?.length) {
    return {
      data: {
        workouts: 0,
        totalVolume: 0,
        strengthGain: null,
        volumePoints: [],
        recentWorkouts: [],
        muscleFocus: {},
      },
      error: null,
    };
  }

  const workoutIds = workouts.map((workout) => workout.id);

  const { data: workoutExercises, error: exerciseError } = await supabase
    .from("workout_exercises")
    .select("id, workout_id, exercise_id")
    .in("workout_id", workoutIds);

  if (exerciseError) return { data: null, error: exerciseError };

  const workoutExerciseIds = (workoutExercises ?? []).map(
    (item) => item.id,
  );

  const { data: sets, error: setError } = workoutExerciseIds.length
    ? await supabase
        .from("workout_sets")
        .select("workout_exercise_id, weight, reps, is_completed")
        .in("workout_exercise_id", workoutExerciseIds)
    : { data: [], error: null };

  if (setError) return { data: null, error: setError };

  const exerciseIds = [
    ...new Set(
      (workoutExercises ?? []).map((item) => item.exercise_id),
    ),
  ];

  const { data: library, error: libraryError } = exerciseIds.length
    ? await supabase
        .from("exercises")
        .select("id, primary_muscles")
        .in("id", exerciseIds)
    : { data: [], error: null };

  if (libraryError) return { data: null, error: libraryError };

  const exerciseByWorkoutExercise = new Map(
    (workoutExercises ?? []).map((item) => [item.id, item]),
  );

  const musclesByExercise = new Map(
    (library ?? []).map((item) => [
      item.id,
      item.primary_muscles ?? [],
    ]),
  );

  const setsByWorkoutExercise = new Map<number, ProgressSet[]>();

  for (const set of sets ?? []) {
    const current =
      setsByWorkoutExercise.get(set.workout_exercise_id) ?? [];

    current.push(set);
    setsByWorkoutExercise.set(set.workout_exercise_id, current);
  }

  const volumeByWorkout = new Map<number, number>();
  const muscleFocus: Record<string, number> = {};

  for (const [workoutExerciseId, exerciseSets] of setsByWorkoutExercise) {
    const workoutExercise =
      exerciseByWorkoutExercise.get(workoutExerciseId);

    if (!workoutExercise) continue;

    const volume = calculateWorkoutVolume(exerciseSets);

    volumeByWorkout.set(
      workoutExercise.workout_id,
      (volumeByWorkout.get(workoutExercise.workout_id) ?? 0) + volume,
    );

    const completedSets = exerciseSets.filter(
      (set) => set.is_completed,
    ).length;

    for (const muscle of musclesByExercise.get(
      workoutExercise.exercise_id,
    ) ?? []) {
      muscleFocus[muscle] =
        (muscleFocus[muscle] ?? 0) + completedSets;
    }
  }

  const volumePoints = workouts
    .map((workout) => ({
      date: (
        workout.completed_at ??
        workout.scheduled_for ??
        ""
      ).slice(0, 10),
      volume: Math.round(volumeByWorkout.get(workout.id) ?? 0),
    }))
    .filter((point) => point.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const recentWorkouts = workouts.slice(0, 8).map((workout) => ({
    id: workout.id,
    date: (
      workout.completed_at ??
      workout.scheduled_for ??
      ""
    ).slice(0, 10),
    exerciseCount: (workoutExercises ?? []).filter(
      (item) => item.workout_id === workout.id,
    ).length,
    volume: Math.round(volumeByWorkout.get(workout.id) ?? 0),
  }));

  const positiveVolumes = volumePoints
    .map((point) => point.volume)
    .filter((volume) => volume > 0);

  const firstVolume = positiveVolumes[0] ?? 0;
  const lastVolume =
    positiveVolumes[positiveVolumes.length - 1] ?? 0;

  const strengthGain =
    firstVolume > 0
      ? Math.round(((lastVolume - firstVolume) / firstVolume) * 100)
      : null;

  return {
    data: {
      workouts: workouts.length,
      totalVolume: Math.round(
        volumePoints.reduce(
          (sum, point) => sum + point.volume,
          0,
        ),
      ),
      strengthGain,
      volumePoints,
      recentWorkouts,
      muscleFocus,
    },
    error: null,
  };
}
