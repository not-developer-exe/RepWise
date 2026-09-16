import { describe, expect, it } from "vitest";
import {
  buildWorkoutCompletionPayload,
  buildWorkoutSetPayload,
  buildWorkoutStartPayload,
  type WorkoutSetInput,
} from "./workout.service";

describe("workoutService", () => {
  it("builds a valid workout set payload", () => {
    const input: WorkoutSetInput = {
      workoutExerciseId: 1,
      setIndex: 1,
      setType: "working",
      weight: 60,
      reps: 10,
      durationSeconds: null,
      rir: 2,
      rpe: 8,
      isCompleted: true,
      notes: "Felt strong",
    };

    expect(buildWorkoutSetPayload(input)).toEqual({
      workout_exercise_id: 1,
      set_index: 1,
      set_type: "working",
      reps: 10,
      weight: 60,
      duration_seconds: null,
      rir: 2,
      rpe: 8,
      is_completed: true,
      notes: "Felt strong",
    });
  });

  it("allows optional performance values to be empty", () => {
    const input: WorkoutSetInput = {
      workoutExerciseId: 2,
      setIndex: 1,
      setType: "warmup",
      weight: null,
      reps: null,
      durationSeconds: null,
      rir: null,
      rpe: null,
      isCompleted: false,
      notes: null,
    };

    expect(buildWorkoutSetPayload(input)).toEqual({
      workout_exercise_id: 2,
      set_index: 1,
      set_type: "warmup",
      reps: null,
      weight: null,
      duration_seconds: null,
      rir: null,
      rpe: null,
      is_completed: false,
      notes: null,
    });
  });

  it("builds a workout start payload", () => {
    expect(
      buildWorkoutStartPayload({
        clientId: "client-123",
        programDayId: 42,
        scheduledFor: "2026-09-16",
      }),
    ).toEqual({
      client_id: "client-123",
      program_day_id: 42,
      scheduled_for: "2026-09-16",
      status: "in_progress",
      started_at: expect.any(String),
    });
  });

  it("builds a workout completion payload", () => {
    expect(buildWorkoutCompletionPayload()).toEqual({
      status: "completed",
      completed_at: expect.any(String),
    });
  });
});