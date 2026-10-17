import { State } from "../domain/model";
/** A unit of work commits all related entities atomically. Swap this boundary for sync. */
export interface Repository {
  load(): Promise<State | null>;
  commit(state: State): Promise<void>;
}
