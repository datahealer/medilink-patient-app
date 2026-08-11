/**
 * Data-layer entry — screens import { repositories } from "@/data" ONLY.
 * In the production port this file switches to the hybrid/real repositories
 * exactly like mobile/src/data/index.ts does.
 */
export { repositories } from "./mock";
export * from "./types";
export type { Repositories, DoctorSearchParams } from "./repositories";
