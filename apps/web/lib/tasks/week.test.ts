import { describe, expect, it } from "vitest";
import { columnForTask, isoDate, startOfWeek, weekColumns } from "@/lib/tasks/week";

describe("weekly task schedule", () => {
  it("keeps local calendar dates stable and joins Saturday and Sunday", () => {
    const reference = new Date(2026, 8, 6, 23, 30);
    const columns = weekColumns(reference);

    expect(isoDate(startOfWeek(reference))).toBe("2026-08-31");
    expect(columns).toHaveLength(6);
    expect(columns.at(-1)?.dates).toEqual(["2026-09-05", "2026-09-06"]);
    expect(columnForTask({ scheduledDate: "2026-09-06" }, columns)?.key).toBe("weekend");
    expect(columnForTask({ scheduledDate: "2026-09-07" }, columns)).toBeNull();
  });
});
