import { create } from "zustand";

/**
 * Client-only booking draft — transient until confirmed (never persisted),
 * mirroring production's bookingStore contract. Payment is card-only
 * (client decision 2026-08-10), so the draft carries no method choice.
 */
interface BookingDraft {
  doctorId: string | null;
  clinicId: string | null;
  serviceId: string | null;
  packageId: string | null;
  patientId: string; // "self" or family member id
  dateISO: string | null; // YYYY-MM-DD
  slotStart: string | null; // HH:MM
  reason: string;
  start: (input: Partial<BookingDraft> & { doctorId: string }) => void;
  set: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
}

const initial = {
  doctorId: null,
  clinicId: null,
  serviceId: null,
  packageId: null,
  patientId: "self",
  dateISO: null,
  slotStart: null,
  reason: "",
};

export const useBookingStore = create<BookingDraft>((set, get) => ({
  ...initial,
  start: (input) => {
    // Starting a booking for a different doctor resets the draft.
    if (get().doctorId !== input.doctorId) set({ ...initial, ...input });
    else set(input);
  },
  set: (patch) => set(patch),
  reset: () => set(initial),
}));
