import { useCallback, useMemo, useState, type ReactNode } from "react";
import { LOCAL, isValidTimeZone, readChoice, resolveTimeZone, saveChoice } from "@/lib/timezone";
import { TimeZoneContext } from "@/lib/timezone-context";

export function TimeZoneProvider({ children, initial }: { children: ReactNode; initial?: string }) {
  const [choice, setChoiceState] = useState(() => initial ?? readChoice());
  const setChoice = useCallback((next: string) => {
    if (next !== LOCAL && !isValidTimeZone(next)) return;
    setChoiceState(next);
    saveChoice(next);
  }, []);
  const value = useMemo(() => ({ choice, timeZone: resolveTimeZone(choice), setChoice }), [choice, setChoice]);
  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}
