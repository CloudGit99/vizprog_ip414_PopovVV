export type Transform<T> = (data: T[]) => T[];

export type Group<T, K extends keyof T> = {
  key: T[K];
  items: T[];
};

export type GroupTransform<T, K extends keyof T> = (
  groups: Group<T, K>[]
) => Group<T, K>[];

export type WhereStep<T extends object> = {
  kind: "where";
  apply: Transform<T>;
};

export type SortStep<T extends object> = {
  kind: "sort";
  apply: Transform<T>;
};

export type GroupByStep<T extends object, K extends keyof T> = {
  kind: "groupBy";
  apply: (data: T[]) => Group<T, K>[];
};

export type HavingStep<T extends object, K extends keyof T> = {
  kind: "having";
  apply: GroupTransform<T, K>;
};

export const where = <T extends object, K extends keyof T>(
  key: K,
  value: T[K]
): WhereStep<T> => ({
  kind: "where",
  apply: (data: T[]) => data.filter((item) => item[key] === value),
});

export const sort = <T extends object, K extends keyof T>(
  key: K
): SortStep<T> => ({
  kind: "sort",
  apply: (data: T[]) =>
    [...data].sort((a, b) => {
      const av = a[key];
      const bv = b[key];

      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    }),
});

export const groupBy = <T extends object, K extends keyof T>(
  key: K
): GroupByStep<T, K> => ({
  kind: "groupBy",
  apply: (data: T[]) => {
    const map = new Map<T[K], T[]>();

    for (const item of data) {
      const groupKey = item[key];
      const bucket = map.get(groupKey);

      if (bucket) {
        bucket.push(item);
      } else {
        map.set(groupKey, [item]);
      }
    }

    return Array.from(map.entries()).map(([groupKey, items]) => ({
      key: groupKey,
      items,
    }));
  },
});

export const having = <T extends object, K extends keyof T>(
  predicate: (group: Group<T, K>) => boolean
): HavingStep<T, K> => ({
  kind: "having",
  apply: (groups: Group<T, K>[]) => groups.filter(predicate),
});

type AnyStep = {
  apply: (data: any[]) => any[];
};

export function query<T extends object>(): Transform<T>;

export function query<T extends object>(
  step1: WhereStep<T> | SortStep<T>
): Transform<T>;

export function query<T extends object>(
  step1: WhereStep<T> | SortStep<T>,
  step2: WhereStep<T> | SortStep<T>
): Transform<T>;

export function query<T extends object>(
  step1: WhereStep<T> | SortStep<T>,
  step2: WhereStep<T> | SortStep<T>,
  step3: WhereStep<T> | SortStep<T>
): Transform<T>;

export function query<T extends object>(
  step1: WhereStep<T> | SortStep<T>,
  step2: WhereStep<T> | SortStep<T>,
  step3: WhereStep<T> | SortStep<T>,
  step4: WhereStep<T> | SortStep<T>
): Transform<T>;

export function query<T extends object, K extends keyof T>(
  step1: GroupByStep<T, K>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: GroupByStep<T, K>,
  step2: HavingStep<T, K> | SortStep<Group<T, K>>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: GroupByStep<T, K>,
  step2: HavingStep<T, K> | SortStep<Group<T, K>>,
  step3: HavingStep<T, K> | SortStep<Group<T, K>>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: WhereStep<T>,
  step2: GroupByStep<T, K>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: WhereStep<T>,
  step2: GroupByStep<T, K>,
  step3: HavingStep<T, K> | SortStep<Group<T, K>>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: WhereStep<T>,
  step2: GroupByStep<T, K>,
  step3: HavingStep<T, K>,
  step4: SortStep<Group<T, K>>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: WhereStep<T>,
  step2: WhereStep<T>,
  step3: GroupByStep<T, K>
): (data: T[]) => Group<T, K>[];

export function query<T extends object, K extends keyof T>(
  step1: WhereStep<T>,
  step2: WhereStep<T>,
  step3: GroupByStep<T, K>,
  step4: HavingStep<T, K> | SortStep<Group<T, K>>
): (data: T[]) => Group<T, K>[];

export function query(...steps: AnyStep[]) {
  return (data: any[]) => steps.reduce((acc, step) => step.apply(acc), data);
}