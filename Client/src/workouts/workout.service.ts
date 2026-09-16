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

export type StartWorkoutInput = {
  clientId: string;
  programDayId?: number | null;
  scheduledFor?: string | null;
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