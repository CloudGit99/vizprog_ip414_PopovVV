import { describe, it, expect } from "vitest";
import { where, sort, groupBy, having, query, Group } from "./query";

type User = {
  id: number;
  name: string;
  surname: string;
  age: number;
  city: string;
};

const users: User[] = [
  { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
  { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
  { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
  { id: 4, name: "Евгений", surname: "Хмыльников", age: 24, city: "NSK" },
  { id: 5, name: "Дмитрий", surname: "Огнивенко", age: 22, city: "IRK" },
];

describe("фильтрация", () => {
  it("фильтрует элементы по значению поля", () => {
    const result = where<User, "name">("name", "Владимир")(users);

    expect(result).toEqual([
      { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
      { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
      { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
    ]);
  });
});

describe("Сортировка", () => {
  it("сортирует массив по числовому полю", () => {
    const result = sort<User, "age">("age")(users);

    expect(result.map((u) => u.age)).toEqual([20, 22, 22, 23, 24]);
  });

  it("не изменяет исходный массив", () => {
    const copy = [...users];
    sort<User, "age">("age")(users);

    expect(users).toEqual(copy);
  });
});

describe("Группировка", () => {
  it("группирует элементы по значению поля", () => {
    const result = groupBy<User, "city">("city")(users);

    expect(result).toEqual([
      {
        key: "NSK",
        items: [
          { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
          { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
          { id: 4, name: "Евгений", surname: "Хмыльников", age: 24, city: "NSK" },
        ],
      },
      {
        key: "IRK",
        items: [
          { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
          { id: 5, name: "Дмитрий", surname: "Огнивенко", age: 22, city: "IRK" },
        ],
      },
    ]);
  });
});

describe("Фильтрация групп", () => {
  it("оставляет только группы, удовлетворяющие условию", () => {
    const grouped = groupBy<User, "city">("city")(users);
    const result = having<User, "city">(
      (group: Group<User, "city">) => group.items.length > 2
    )(grouped);

    expect(result).toEqual([
      {
        key: "NSK",
        items: [
          { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
          { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
          { id: 4, name: "Евгений", surname: "Хмыльников", age: 24, city: "NSK" },
        ],
      },
    ]);
  });
});

describe("Конвейер преобразований", () => {
  it("создает конвейер фильтрации и сортировки", () => {
    const pipeline = query(
      where<User, "name">("name", "Владимир"),
      where<User, "surname">("surname", "Попов"),
      sort<User, "age">("age")
    );

    const result = pipeline(users);

    expect(result).toEqual([
      { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
      { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
      { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
    ]);
  });

  it("создает конвейер группировки и фильтрации групп", () => {
    const pipeline = query(
      groupBy<User, "city">("city"),
      having<User, "city">((group: Group<User, "city">) => group.items.length > 2)
    );

    const result = pipeline(users);

    expect(result).toEqual([
      {
        key: "NSK",
        items: [
          { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
          { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
          { id: 4, name: "Евгений", surname: "Хмыльников", age: 24, city: "NSK" },
        ],
      },
    ]);
  });

  it("поддерживает комбинированный конвейер операций", () => {
    const pipeline = query(
      where<User, "surname">("surname", "Попов"),
      groupBy<User, "city">("city"),
      having<User, "city">((group: Group<User, "city">) =>
        group.items.some((u) => u.age > 20)
      )
    );

    const result = pipeline(users);

    expect(result).toEqual([
      {
        key: "NSK",
        items: [
          { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
          { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },

        ],
      },
       {
        key: "IRK",
        items: [
          { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
        ],
      },
    ]);
  });

  it("возвращает исходный массив, если шаги не заданы", () => {
    const pipeline = query();
    const result = pipeline(users);

    expect(result).toEqual(users);
  });
});