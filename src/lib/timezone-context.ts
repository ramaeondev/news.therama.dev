import { createContext, useContext } from "react";
import { DEFAULT_TZ } from "@/lib/timezone";

export interface TimeZoneState {
  /** What the reader picked: "local" or an IANA zone. */
  choice: string;
  /** Effective IANA zone used for formatting. */
  timeZone: string;
  setChoice: (choice: string) => void;
}

export const TimeZoneContext = createContext<TimeZoneState>({ choice: DEFAULT_TZ, timeZone: DEFAULT_TZ, setChoice: () => {} });

export const useTimeZone = () => useContext(TimeZoneContext);
