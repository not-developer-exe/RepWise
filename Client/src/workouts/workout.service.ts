import type { Database } from "../lib/database.types";
import { supabase } from "../lib/supabase";

export type WorkoutSetInput = {
  workoutExerciseId: number;
  setIndex: number;
  setType: Database["public"]["Enums"]["set_type"];
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  rir: number | null;
  rpe: number | null;
  isCompleted: boolean;
  notes: string | null;
};

export type WorkoutSetUpdateInput = {
  setType: Database["public"]["Enums"]["set_type"];
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  rir: number | null;
  rpe: number | null;
  isCompleted: boolean;
  notes: string | null;
};

export type StartWorkoutInput = {
  clientId: string;
  programDayId?: number | null;
  scheduledFor?: string | null;
};

export type AddExerciseInput = {
  workoutId: number;
  exerciseId: number;
  variationId?: number | null;
  orderIndex: number;
};

export function buildWorkoutSetPayload(input: WorkoutSetInput) {
  return {
    workout_exercise_id: input.workoutExerciseId,
    set_index: input.setIndex,
    set_type: input.setType,
    reps: input.reps,
    weight: input.weight,
    duration_seconds: input.durationSeconds,
    rir: input.rir,
    rpe: input.rpe,
    is_completed: input.isCompleted,
    notes: input.notes,
  };
}

export function buildWorkoutSetUpdatePayload(
  input: WorkoutSetUpdateInput,
) {
  return {
    set_type: input.setType,
    reps: input.reps,
    weight: input.weight,
    duration_seconds: input.durationSeconds,
    rir: input.rir,
    rpe: input.rpe,
    is_completed: input.isCompleted,
    notes: input.notes,
  };
}

export function buildWorkoutStartPayload(input: StartWorkoutInput) {
  return {
    client_id: input.clientId,
    program_day_id: input.programDayId ?? null,
    scheduled_for: input.scheduledFor ?? null,
    status: "in_progress" as const,
    started_at: new Date().toISOString(),
  };
}

export function buildWorkoutCompletionPayload() {
  return {
    status: "completed" as const,
    completed_at: new Date().toISOString(),
  };
}

export function buildAddExercisePayload(input: AddExerciseInput) {
  return {
    workout_id: input.workoutId,
    exercise_id: input.exerciseId,
    variation_id: input.variationId ?? null,
    order_index: input.orderIndex,
  };
}

export async function startWorkout(input: StartWorkoutInput) {
  const { data, error } = await supabase
    .from("workouts")
    .insert(buildWorkoutStartPayload(input))
    .select()
    .single();

  return {
    data,
    error,
  };
}

export async function getActiveWorkout(clientId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data,
    error,
  };
}

export async function addWorkoutExercise(input: AddExerciseInput) {
  const { data, error } = await supabase
    .from("workout_exercises")
    .insert(buildAddExercisePayload(input))
    .select()
    .single();

  return {
    data,
    error,
  };
}

export async function getWorkoutExercises(workoutId: number) {
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("workout_id", workoutId)
    .order("order_index", { ascending: true });

  return {
    data,
    error,
  };
}

export async function getExercises() {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return {
    data,
    error,
  };
}

export async function saveWorkoutSet(input: WorkoutSetInput) {
  const { data, error } = await supabase
    .from("workout_sets")
    .insert(buildWorkoutSetPayload(input))
    .select()
    .single();

  return {
    data,
    error,
  };
}

export async function updateWorkoutSet(
  workoutSetId: number,
  input: WorkoutSetUpdateInput,
) {
  const { data, error } = await supabase
    .from("workout_sets")
    .update(buildWorkoutSetUpdatePayload(input))
    .eq("id", workoutSetId)
    .select()
    .single();

  return {
    data,
    error,
  };
}

export async function getWorkoutSets(workoutExerciseId: number) {
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_exercise_id", workoutExerciseId)
    .order("set_index", { ascending: true });

  return {
    data,
    error,
  };
}

export async function completeWorkout(workoutId: number) {
  const { data, error } = await supabase
    .from("workouts")
    .update(buildWorkoutCompletionPayload())
    .eq("id", workoutId)
    .select()
    .single();

  return {
    data,
    error,
  };
}