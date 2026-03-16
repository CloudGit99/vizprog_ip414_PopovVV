export type Transform<T> = (data: T[]) => T[];

export type Where<T extends object> = <K extends keyof T>(
  key: K,
  value: T[K]
) => Transform<T>;

export type Sort<T extends object> = <K extends keyof T>(
  key: K
) => Transform<T>;

export type Group<T, K extends keyof T> = {
  key: T[K];
  items: T[];
};

export type GroupTransform<T, K extends keyof T> = (
  groups: Group<T, K>[]
) => Group<T, K>[];

export type GroupBy<T extends object> = <K extends keyof T>(
  key: K
) => (data: T[]) => Group<T, K>[];

export type Having<T extends object> = <K extends keyof T>(
  predicate: (group: Group<T, K>) => boolean
) => GroupTransform<T, K>;

export const where =
  <T extends object, K extends keyof T>(key: K, value: T[K]) =>
  (data: T[]): T[] =>
    data.filter((item) => item[key] === value);

export const sort =
  <T extends object, K extends keyof T>(key: K) =>
  (data: T[]): T[] =>
    [...data].sort((a, b) => {
      const av = a[key];
      const bv = b[key];

      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });

export const groupBy =
  <T extends object, K extends keyof T>(key: K) =>
  (data: T[]): Group<T, K>[] => {
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
  };

export const having =
  <T extends object, K extends keyof T>(
    predicate: (group: Group<T, K>) => boolean
  ) =>
  (groups: Group<T, K>[]): Group<T, K>[] =>
    groups.filter(predicate);

export function query(...steps: Array<(data: any[]) => any[]>) {
  return (data: any[]) => steps.reduce((acc, step) => step(acc), data);
}