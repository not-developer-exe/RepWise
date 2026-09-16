import { describe, expect, it } from "vitest";
import {
  buildWorkoutSetPayload,
  type WorkoutSetInput,
} from "./workout.service";

describe("workoutService", () => {
  it("builds a valid workout set payload", () => {
    const input: WorkoutSetInput = {
      workoutExerciseId: "workout-exercise-1",
      setNumber: 1,
      setType: "working",
      weightKg: 60,
      reps: 10,
      rpe: 8,
      completed: true,
      notes: "Felt strong",
    };

    expect(buildWorkoutSetPayload(input)).toEqual({
      workout_exercise_id: "workout-exercise-1",
      set_number: 1,
      set_type: "working",
      weight_kg: 60,
      reps: 10,
      rpe: 8,
      completed: true,
      notes: "Felt strong",
    });
  });

  it("allows optional performance values to be empty", () => {
    const input: WorkoutSetInput = {
      workoutExerciseId: "workout-exercise-2",
      setNumber: 1,
      setType: "warmup",
      weightKg: null,
      reps: null,
      rpe: null,
      completed: false,
      notes: null,
    };

    expect(buildWorkoutSetPayload(input)).toEqual({
      workout_exercise_id: "workout-exercise-2",
      set_number: 1,
      set_type: "warmup",
      weight_kg: null,
      reps: null,
      rpe: null,
      completed: false,
      notes: null,
    });
  });
});