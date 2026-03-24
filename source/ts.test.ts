import { describe, it, expectTypeOf } from "vitest";
import type { DeepReadonly, PickedByType, EventHandlers } from "./ts";

describe("DeepReadonly", () => {
  it("делает все поля readonly рекурсивно", () => {
    type Source = {
      id: number;
      user: {
        name: string;
        meta: {
          active: boolean;
        };
      };
    };

    type Result = DeepReadonly<Source>;

    expectTypeOf<Result>().toEqualTypeOf<{
      readonly id: number;
      readonly user: {
        readonly name: string;
        readonly meta: {
          readonly active: boolean;
        };
      };
    }>();
  });

  it("не ломает функции", () => {
    type Source = {
      title: string;
      handler: (value: number) => string;
    };

    type Result = DeepReadonly<Source>;

    expectTypeOf<Result>().toEqualTypeOf<{
      readonly title: string;
      readonly handler: (value: number) => string;
    }>();
  });

  it("работает с массивами", () => {
    type Source = {
      items: Array<{
        name: string;
      }>;
    };

    type Result = DeepReadonly<Source>;

    expectTypeOf<Result>().toEqualTypeOf<{
      readonly items: readonly {
        readonly name: string;
      }[];
    }>();
  });
});

describe("PickedByType", () => {
  it("выбирает только string-свойства", () => {
    type Source = {
      id: number;
      name: string;
      surname: string;
      active: boolean;
    };

    type Result = PickedByType<Source, string>;

    expectTypeOf<Result>().toEqualTypeOf<{
      name: string;
      surname: string;
    }>();
  });

  it("выбирает только number-свойства", () => {
    type Source = {
      id: number;
      age: number;
      name: string;
      active: boolean;
    };

    type Result = PickedByType<Source, number>;

    expectTypeOf<Result>().toEqualTypeOf<{
      id: number;
      age: number;
    }>();
  });

  it("возвращает пустой объект, если совпадений нет", () => {
    type Source = {
      name: string;
      active: boolean;
    };

    type Result = PickedByType<Source, number>;

    expectTypeOf<Result>().toEqualTypeOf<{}>();
  });
});

describe("EventHandlers", () => {
  it("создает обработчики событий с префиксом on", () => {
    type Events = {
      click: MouseEvent;
      change: Event;
    };

    type Result = EventHandlers<Events>;

    expectTypeOf<Result>().toEqualTypeOf<{
      onClick: (event: MouseEvent) => void;
      onChange: (event: Event) => void;
    }>();
  });

  it("работает с несколькими пользовательскими событиями", () => {
    type LoginEvent = { userId: string };
    type LogoutEvent = { reason: string };

    type Events = {
      login: LoginEvent;
      logout: LogoutEvent;
    };

    type Result = EventHandlers<Events>;

    expectTypeOf<Result>().toEqualTypeOf<{
      onLogin: (event: LoginEvent) => void;
      onLogout: (event: LogoutEvent) => void;
    }>();
  });
});