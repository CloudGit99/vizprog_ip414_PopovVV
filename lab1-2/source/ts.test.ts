import { describe, it, expect } from 'vitest';
import {
  createUser,
  createBook,
  calculateArea,
  getStatusColor,
  capitalLetter,
  trimAndUppercase,
  getFirstElement,
  findById,
  type IBook,
} from './ts';

describe('createUser', () => {
  it('создаёт пользователя с isActive=true по умолчанию', () => {
    const u = createUser(1, 'Vladimir', 'vovan@gmail.com');
    expect(u).toEqual({ id: 1, name: 'Vladimir', email: 'vovan@gmail.com', isActive: true });
  });

  it('принимает isActive=false', () => {
    const u = createUser(2, 'Petr', undefined, false);
    expect(u.isActive).toBe(false);
    expect(u.email).toBeUndefined();
  });
});

describe('createBook', () => {
  it('возвращает книгу с year', () => {
    const b: IBook = { title: 'title', author: 'author', year: 2026, genre: 'fiction' };
    expect(createBook(b)).toEqual(b);
  });

  it('возвращает книгу без year', () => {
    const b: IBook = { title: 'title', author: 'author', genre: 'non-fiction' };
    expect(createBook(b)).toEqual(b);
  });
});

describe('calculateArea', () => {
  it('площадь круга', () => {
    expect(calculateArea('circle', 2)).toBeCloseTo(Math.PI * 4, 10);
  });

  it('площадь квадрата', () => {
    expect(calculateArea('square', 3)).toBe(9);
  });
});

describe('getStatusColor', () => {
  it('возвращает цвета', () => {
    expect(getStatusColor('active')).toBe('green');
    expect(getStatusColor('inactive')).toBe('red');
    expect(getStatusColor('new')).toBe('yellow');
  });
});

describe('StringFormatter', () => {
  it('capitalLetter делает первую букву заглавной (с учётом пробелов слева)', () => {
    expect(capitalLetter(' hello')).toBe(' Hello');
    expect(capitalLetter('')).toBe('');
    expect(capitalLetter('   ')).toBe('   ');
  });

  it('capitalLetter uppercase=true делает всё верхним регистром', () => {
    expect(capitalLetter(' hello', true)).toBe(' HELLO');
  });

  it('trimAndUppercase обрезает пробелы', () => {
    expect(trimAndUppercase('  hi  ')).toBe('hi');
  });

  it('trimAndUppercase uppercase=true', () => {
    expect(trimAndUppercase('  hi  ', true)).toBe('HI');
  });
});

describe('getFirstElement', () => {
  it('возвращает первый элемент', () => {
    expect(getFirstElement([10, 20])).toBe(10);
    expect(getFirstElement(['a', 'b'])).toBe('a');
  });

  it('для пустого массива возвращает undefined', () => {
    expect(getFirstElement([])).toBeUndefined();
  });
});

describe('findById', () => {
  it('находит объект по id', () => {
    const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    expect(findById(items, 2)).toEqual({ id: 2, name: 'B' });
  });

  it('если нет — undefined', () => {
    const items = [{ id: 1, name: 'A' }];
    expect(findById(items, 999)).toBeUndefined();
  });
});
