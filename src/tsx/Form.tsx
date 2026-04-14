import { FormEvent, useEffect, useState } from 'react';

interface FormProps {
  onSubmit: (city: string) => void;
  initialCity: string;
}

const Form = ({ onSubmit, initialCity }: FormProps) => {
  const [city, setCity] = useState<string>(initialCity);

  useEffect(() => {
    setCity(initialCity);
  }, [initialCity]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(city.trim());
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Введите город"
      />
      <button type="submit">Обновить</button>
    </form>
  );
};

export default Form;
