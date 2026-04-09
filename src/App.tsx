import './App.css';
import React, { useEffect, useMemo, useState } from 'react';
import Image from './image.png';
import Book from './Book';
import SearchAndSort from './SortAndSearch';
import { BookItem } from './types';

type ApiBook = Omit<BookItem, 'coverImage'>;
type SortOption = 'title' | 'author';

function App() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<boolean>(false);

  useEffect(() => {
    const fetchBookCover = async (isbn: string): Promise<string> => {
      try {
        const response = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`);
        const data = await response.json();

        return data.items && data.items.length > 0
          ? data.items[0].volumeInfo.imageLinks?.thumbnail || Image
          : Image;
      } catch {
        return Image;
      }
    };

    const fetchBooks = async (): Promise<void> => {
      try {
        const response = await fetch('https://fakeapi.extendsclass.com/books');
        const data: ApiBook[] = await response.json();

        const booksWithCovers: BookItem[] = await Promise.all(
          data.map(async (book) => {
            const coverImage = await fetchBookCover(book.isbn);
            return { ...book, coverImage };
          })
        );

        setBooks(booksWithCovers);
      } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        setBooks([]);
      }
    };

    fetchBooks();
  }, []);

  const filteredBooks = useMemo(() => {
    return [...books]
      .filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.authors.some((author) => author.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        let comparison = 0;

        if (sortOption === 'title') {
          comparison = a.title.localeCompare(b.title);
        } else {
          comparison = (a.authors[0] || '').localeCompare(b.authors[0] || '');
        }

        return sortDirection ? -comparison : comparison;
      });
  }, [books, searchTerm, sortOption, sortDirection]);

  return (
    <div className='App'>
      <SearchAndSort
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOption={sortOption}
        setSortOption={setSortOption}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
      />
      <Book books={filteredBooks} />
    </div>
  );
}

export default App;
