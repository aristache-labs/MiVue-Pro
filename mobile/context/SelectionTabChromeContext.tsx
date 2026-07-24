import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SelectionTabChromeKind = "local-delete" | "library-actions";

export interface LibraryTabAction {
  readonly key: string;
  readonly tone: "brand" | "warn" | "danger";
  readonly icon: "cloud-download-outline" | "close-circle-outline" | "trash-outline";
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly busy?: boolean;
}

export interface SelectionTabChromeState {
  readonly kind: SelectionTabChromeKind;
  readonly selectedCount: number;
  /** Local delete */
  readonly onDelete?: () => void;
  readonly deleteDisabled?: boolean;
  readonly deleteBusy?: boolean;
  readonly deleteAccessibilityLabel?: string;
  /** Library bulk actions */
  readonly actions?: readonly LibraryTabAction[];
  readonly mutedMessage?: string;
}

interface SelectionTabChromeContextValue {
  readonly chrome: SelectionTabChromeState | null;
  readonly setChrome: (next: SelectionTabChromeState | null) => void;
}

const SelectionTabChromeContext = createContext<SelectionTabChromeContextValue | null>(
  null,
);

export function SelectionTabChromeProvider({ children }: { readonly children: ReactNode }) {
  const [chrome, setChromeState] = useState<SelectionTabChromeState | null>(null);
  const setChrome = useCallback((next: SelectionTabChromeState | null) => {
    setChromeState(next);
  }, []);
  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);
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
