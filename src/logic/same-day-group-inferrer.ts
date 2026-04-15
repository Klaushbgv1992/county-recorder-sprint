export interface InferrerInput {
  instrument_number: string;
  recording_date: string;
  names: string[];
}

export interface InferrerOutput extends InferrerInput {
  same_day_group_id: string | null;
}

export function inferSameDayGroups(instruments: InferrerInput[]): InferrerOutput[] {
  const byDate = new Map<string, InferrerInput[]>();
  for (const i of instruments) {
    const arr = byDate.get(i.recording_date) ?? [];
    arr.push(i);
    byDate.set(i.recording_date, arr);
  }

  const groupIdFor = new Map<string, string>();
  for (const [date, arr] of byDate) {
    if (arr.length < 2) continue;
    const parent: Record<string, string> = {};
    const find = (x: string): string =>
      parent[x] === x ? x : (parent[x] = find(parent[x]));
    for (const i of arr) parent[i.instrument_number] = i.instrument_number;
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        const aNames = new Set(arr[a].names.map((n) => n.toUpperCase()));
        if (arr[b].names.some((n) => aNames.has(n.toUpperCase()))) {
          parent[find(arr[a].instrument_number)] = find(arr[b].instrument_number);
        }
      }
    }
    const groups = new Map<string, string[]>();
    for (const i of arr) {
      const root = find(i.instrument_number);
      const g = groups.get(root) ?? [];
      g.push(i.instrument_number);
      groups.set(root, g);
    }
    let n = 0;
    for (const [, members] of groups) {
      if (members.length < 2) continue;
      const id = `grp-${date}-${++n}`;
      for (const m of members) groupIdFor.set(m, id);
    }
  }

  return instruments.map((i) => ({
    ...i,
    same_day_group_id: groupIdFor.get(i.instrument_number) ?? null,
  }));
}
