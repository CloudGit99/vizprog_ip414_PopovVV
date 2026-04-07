import React, { ChangeEvent, Dispatch, SetStateAction } from 'react';

interface SearchAndSortProps {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  sortOption: 'title' | 'author';
  setSortOption: Dispatch<SetStateAction<'title' | 'author'>>;
  sortDirection: boolean;
  setSortDirection: Dispatch<SetStateAction<boolean>>;
}

function SearchAndSort({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
  sortDirection,
  setSortDirection,
}: SearchAndSortProps) {
  return (
    <div className='search_and_sort'>
      <input
        className='search'
        type='text'
        placeholder='Поиск по названию или автору'
        value={searchTerm}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
      />

      <select
        value={sortOption}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setSortOption(e.target.value as 'title' | 'author')
        }
      >
        <option value='title'>Название</option>
        <option value='author'>Автор</option>
      </select>

      <p className='text_p'>Обратная сортировка:</p>

      <input
        type='checkbox'
        checked={sortDirection}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSortDirection(e.target.checked)}
      />
    </div>
  );
}

export default SearchAndSort;
