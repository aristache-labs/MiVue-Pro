import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SelectionTabChromeKind = "local-delete" | "library-download";

export interface SelectionTabChromeState {
  readonly kind: SelectionTabChromeKind;
  readonly selectedCount: number;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly disabled: boolean;
  readonly busy: boolean;
}

interface SelectionTabChromeContextValue {
  readonly chrome: SelectionTabChromeState | null;
  /** True while any screen owns selection chrome. */
  readonly selectionModeActive: boolean;
  readonly setChrome: (next: SelectionTabChromeState | null) => void;
  /** Clear only if the active chrome belongs to this kind (inactive tabs must not steal). */
  readonly clearChromeIf: (kind: SelectionTabChromeKind) => void;
}

const SelectionTabChromeContext = createContext<SelectionTabChromeContextValue | null>(
  null,
);

export function SelectionTabChromeProvider({ children }: { readonly children: ReactNode }) {
  const [chrome, setChromeState] = useState<SelectionTabChromeState | null>(null);
  const setChrome = useCallback((next: SelectionTabChromeState | null) => {
    setChromeState(next);
  }, []);
  const clearChromeIf = useCallback((kind: SelectionTabChromeKind) => {
    setChromeState((prev) => (prev?.kind === kind ? null : prev));
  }, []);
  const value = useMemo(
    () => ({
      chrome,
      selectionModeActive: chrome !== null,
      setChrome,
      clearChromeIf,
    }),
    [chrome, setChrome, clearChromeIf],
  );
  return (
    <SelectionTabChromeContext.Provider value={value}>
      {children}
    </SelectionTabChromeContext.Provider>
  );
}

export function useSelectionTabChrome(): SelectionTabChromeContextValue {
  const ctx = useContext(SelectionTabChromeContext);
  if (!ctx) {
    throw new Error("useSelectionTabChrome requires SelectionTabChromeProvider");
  }
  return ctx;
}
