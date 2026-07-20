import { useMemo, useState } from "react";

import type { FileCategory, RemoteFile } from "../packages/parsers/src/index";

export type CategoryFilter = "all" | Exclude<FileCategory, "unknown">;
export type LibrarySort = "newest" | "oldest" | "name";

const CATEGORY_FILTERS: readonly CategoryFilter[] = ["all", "normal", "event", "parking", "photo"];

export interface LibrarySection {
  readonly title: string;
  readonly dayKey: string;
  readonly data: readonly RemoteFile[];
}

export interface CategoryCounts {
  readonly all: number;
  readonly normal: number;
  readonly event: number;
  readonly parking: number;
  readonly photo: number;
}

function dayKey(recordedAt: string): string {
  return recordedAt.slice(0, 10);
}

function formatDayTitle(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return key;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function useLibraryFilters(files: readonly RemoteFile[]) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("newest");

  const counts = useMemo<CategoryCounts>(() => {
    let normal = 0;
    let event = 0;
    let parking = 0;
    let photo = 0;
    for (const file of files) {
      if (file.category === "normal") normal += 1;
      else if (file.category === "event") event += 1;
      else if (file.category === "parking") parking += 1;
      else if (file.category === "photo") photo += 1;
    }
    return { all: files.length, normal, event, parking, photo };
  }, [files]);

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

  const sections = useMemo<LibrarySection[]>(() => {
    const map = new Map<string, RemoteFile[]>();
    for (const file of filtered) {
      const key = dayKey(file.recordedAt);
      const list = map.get(key);
      if (list) list.push(file);
      else map.set(key, [file]);
    }
    const keys = [...map.keys()].sort((a, b) => (sort === "oldest" ? a.localeCompare(b) : b.localeCompare(a)));
    return keys.map((key) => ({
      dayKey: key,
      title: formatDayTitle(key),
      data: map.get(key) ?? [],
    }));
  }, [filtered, sort]);

  return {
    category,
    setCategory,
    sort,
    setSort,
    filtered,
    sections,
    counts,
    categoryFilters: CATEGORY_FILTERS,
  };
}
