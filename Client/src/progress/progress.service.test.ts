import { describe, expect, it } from "vitest";
import {
  calculateEstimatedOneRepMax,
  calculateWorkoutVolume,
  formatProgressDate,
  getDateRangeStart,
} from "./progress.service";

describe("progressService", () => {
  it("calculates estimated one-rep max with the Epley formula", () => {
    expect(calculateEstimatedOneRepMax(60, 10)).toBeCloseTo(80);
  });

  it("calculates workout volume from completed weighted reps", () => {
    expect(
      calculateWorkoutVolume([
        { weight: 60, reps: 10, is_completed: true },
        { weight: 70, reps: 8, is_completed: true },
        { weight: 100, reps: 5, is_completed: false },
      ]),
    ).toBe(1160);
  });

  it("builds the selected progress date range", () => {
    expect(getDateRangeStart("1W", "2026-09-16")).toBe("2026-09-10");
    expect(getDateRangeStart("1M", "2026-09-16")).toBe("2026-08-18");
    expect(getDateRangeStart("3M", "2026-09-16")).toBe("2026-06-16");
    expect(getDateRangeStart("1Y", "2026-09-16")).toBe("2025-09-16");
  });

  it("formats progress dates consistently", () => {
    expect(formatProgressDate("2026-09-16")).toBe("Sep 16");
  });
});
