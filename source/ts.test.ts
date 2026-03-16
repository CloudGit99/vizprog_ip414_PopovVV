import { describe, it, expect, expectTypeOf } from "vitest";
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

describe("Фильтрация", () => {
  it("фильтрует элементы по значению поля", () => {
    const result = query<User>(
      where<User, "name">("name", "Владимир")
    )(users);

    expect(result).toEqual([
      { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
      { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
      { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
    ]);
  });

  it("поддерживает две фильтрации подряд", () => {
    const result = query<User>(
      where<User, "name">("name", "Владимир"),
      where<User, "surname">("surname", "Попов")
    )(users);

    expect(result).toEqual([
      { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
      { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
      { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
    ]);
  });
});

describe("Сортировка", () => {
  it("сортирует массив по числовому полю", () => {
    const result = query<User>(
      sort<User, "age">("age")
    )(users);

    expect(result.map((u) => u.age)).toEqual([20, 22, 22, 23, 24]);
  });

  it("не изменяет исходный массив", () => {
    const copy = [...users];

    query<User>(
      sort<User, "age">("age")
    )(users);

    expect(users).toEqual(copy);
  });
});

describe("Группировка", () => {
  it("группирует элементы по значению поля", () => {
    const result = query<User, "city">(
      groupBy<User, "city">("city")
    )(users);

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
    const result = query<User, "city">(
      groupBy<User, "city">("city"),
      having<User, "city">((group: Group<User, "city">) => group.items.length > 2)
    )(users);

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
  it("создает конвейер where -> where -> sort", () => {
    const pipeline = query<User>(
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

  it("создает конвейер where -> groupBy -> having", () => {
    const pipeline = query<User, "city">(
      where<User, "surname">("surname", "Попов"),
      groupBy<User, "city">("city"),
      having<User, "city">((group: Group<User, "city">) => group.items.length > 1)
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
    ]);
  });

  it("создает конвейер where -> groupBy -> having -> sort", () => {
    const pipeline = query<User, "city">(
      where<User, "surname">("surname", "Попов"),
      groupBy<User, "city">("city"),
      having<User, "city">((group: Group<User, "city">) => group.items.some((u) => u.age > 20)),
      sort<Group<User, "city">, "key">("key")
    );

    const result = pipeline(users);

    expect(result).toEqual([
      {
        key: "IRK",
        items: [
          { id: 3, name: "Владимир", surname: "Попов", age: 23, city: "IRK" },
        ],
      },
      {
        key: "NSK",
        items: [
          { id: 1, name: "Владимир", surname: "Попов", age: 22, city: "NSK" },
          { id: 2, name: "Владимир", surname: "Попов", age: 20, city: "NSK" },
        ],
      },
    ]);
  });

  it("возвращает исходный массив, если шаги не заданы", () => {
    const pipeline = query<User>();
    const result = pipeline(users);

    expect(result).toEqual(users);
  });
});

describe("Проверка типов", () => {
  it("выводит тип User[] для where -> sort", () => {
    const pipeline = query<User>(
      where<User, "name">("name", "Владимир"),
      sort<User, "age">("age")
    );

    expectTypeOf(pipeline).toEqualTypeOf<(data: User[]) => User[]>();
  });

  it("выводит тип Group<User, 'city'>[] для groupBy -> having -> sort", () => {
    const pipeline = query<User, "city">(
      groupBy<User, "city">("city"),
      having<User, "city">((group: Group<User, "city">) => group.items.length > 1),
      sort<Group<User, "city">, "key">("key")
    );

    expectTypeOf(pipeline).toEqualTypeOf<
      (data: User[]) => Group<User, "city">[]
    >();
  });
});

// @ts-expect-error having нельзя вызывать без groupBy
query<User>(where<User, "name">("name", "Владимир"), having<User, "city">((group: Group<User, "city">) => group.items.length > 1));

// @ts-expect-error where нельзя ставить после groupBy
query<User, "city">(groupBy<User, "city">("city"), where<User, "name">("name", "Владимир"));

// @ts-expect-error после groupBy нельзя сортировать как User[], нужно сортировать группы
query<User, "city">(where<User, "surname">("surname", "Попов"), groupBy<User, "city">("city"), sort<User, "age">("age"));