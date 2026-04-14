import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Form from './Form';
import CurrentWeather from './CurrentWeather';
import WeatherForecast from './WeatherForecast';
import Loader from './Loader';
import ErrorMessage from './Error';
import type { CurrentWeatherData } from './CurrentWeather';
import type { ForecastData } from './WeatherForecast';

interface CoordinatesData {
  lat: number;
  lon: number;
  name: string;
}

const getWeatherBackground = (weatherId?: number): string => {
  if (!weatherId) return 'default-bg';
  if (weatherId >= 200 && weatherId < 300) return 'thunderstorm-bg';
  if (weatherId >= 300 && weatherId < 500) return 'drizzle-bg';
  if (weatherId >= 500 && weatherId < 600) return 'rain-bg';
  if (weatherId >= 600 && weatherId < 700) return 'snow-bg';
  if (weatherId >= 700 && weatherId < 800) return 'fog-bg';
  if (weatherId === 800) return 'clear-bg';
  if (weatherId > 800) return 'clouds-bg';
  return 'default-bg';
};

const Weather = () => {
  const [weatherData, setWeatherData] = useState<ForecastData | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState<string>('Москва');
  const [backgroundClass, setBackgroundClass] = useState<string>('default-bg');

  const API_KEY = '58df5bd93139013a38a69b66d84762ca';

  const fetchCoordinates = useCallback(async (cityName: string): Promise<CoordinatesData | null> => {
    try {
      const response = await axios.get<CoordinatesData[]>(
        `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`
      );

      if (response.data.length > 0) {
        return response.data[0];
      }

      throw new Error('Город не найден');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить координаты';
      setError(message);
      return null;
    }
  }, []);

  const fetchWeatherData = useCallback(async (lat: number, lon: number): Promise<void> => {
    try {
      const currentResponse = await axios.get<CurrentWeatherData>(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`
      );

      const forecastResponse = await axios.get<ForecastData>(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`
      );

      setCurrentWeather(currentResponse.data);
      setWeatherData(forecastResponse.data);

      const weatherId = currentResponse.data.weather[0]?.id;
      setBackgroundClass(getWeatherBackground(weatherId));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить данные о погоде';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const updateWeather = async () => {
      setLoading(true);
      const cityData = await fetchCoordinates(city);

      if (cityData) {
        await fetchWeatherData(cityData.lat, cityData.lon);
      } else {
        setLoading(false);
      }
    };

    updateWeather();
    const intervalId = window.setInterval(updateWeather, 600000);

    return () => window.clearInterval(intervalId);
  }, [city, fetchCoordinates, fetchWeatherData]);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={`weather-app ${backgroundClass}`}>
      <div className="weather-content">
        <h2>Прогноз погоды {city}</h2>
        <Form onSubmit={handleCityChange} initialCity={city} />
        {currentWeather && <CurrentWeather data={currentWeather} />}
        {weatherData && <WeatherForecast data={weatherData} />}
      </div>
    </div>
  );
};

export default Weather;
