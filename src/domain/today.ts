import { type State, localDate } from "./model";

// Shared with the existing Today screen: skipped items remain in the denominator;
// completed historical items remain visible even after their routine is archived.
export function todayProgress(state: State, date = localDate()) {
  const items = state.occurrences.filter(
    (item) =>
      item.localDate === date &&
      (item.status === "completed" ||
        state.routines.some(
          (routine) =>
            routine.id === item.routineId &&
            routine.isActive &&
            !routine.deletedAt,
        )),
  );
  const done = items.filter((item) => item.status === "completed").length;
  return {
    items,
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  };
}
