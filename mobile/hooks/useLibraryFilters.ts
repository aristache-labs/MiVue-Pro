import { useMemo, useState } from "react";

import type { FileCategory, RemoteFile } from "../packages/parsers/src/index";

export type CategoryFilter = "all" | Exclude<FileCategory, "unknown">;
export type LibrarySort = "newest" | "oldest" | "name";

const CATEGORY_FILTERS: readonly CategoryFilter[] = ["all", "normal", "event", "parking", "photo"];

export function useLibraryFilters(files: readonly RemoteFile[]) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("newest");

  const filtered = useMemo(() => {
    const byCategory =
      category === "all" ? [...files] : files.filter((file) => file.category === category);

    byCategory.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const ta = Date.parse(a.recordedAt.replace(" ", "T"));
      const tb = Date.parse(b.recordedAt.replace(" ", "T"));
      const na = Number.isFinite(ta) ? ta : 0;
      const nb = Number.isFinite(tb) ? tb : 0;
      return sort === "newest" ? nb - na : na - nb;
    });

    return byCategory;
  }, [files, category, sort]);

  return {
    category,
    setCategory,
    sort,
    setSort,
    filtered,
    categoryFilters: CATEGORY_FILTERS,
  };
}
