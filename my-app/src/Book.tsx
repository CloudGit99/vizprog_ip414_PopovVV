import React from 'react';
import { BookItem } from './types';

interface BookProps {
  books: BookItem[];
}

function Book({ books }: BookProps) {
  if (!books || books.length === 0) {
    return <p>Загрузка...</p>;
  }

  return (
    <div className='book_pattern'>
      {books.map((book, id) => (
        <div key={id} className='pattern'>
          <img className='image' src={book.coverImage} alt={book.title} />
          <p className='text_header'>{book.title}</p>
          <p className='text_authors'>{book.authors.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}

export default Book;
