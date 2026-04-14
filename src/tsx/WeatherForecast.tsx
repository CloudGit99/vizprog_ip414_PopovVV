import '../css/WeatherForecast.css';
import type { WeatherCondition } from './CurrentWeather';

interface ForecastItem {
  dt: number;
  main: {
    temp: number;
  };
  weather: WeatherCondition[];
}

interface ForecastData {
  list: ForecastItem[];
}

interface WeatherForecastProps {
  data: ForecastData;
}

const WeatherForecast = ({ data }: WeatherForecastProps) => {
  return (
    <div className="WeatherForecast">
      <h3>Прогноз на 2 дня</h3>
      {data.list.slice(0, 16).map((item, index) => (
        <div className="forecast" key={`${item.dt}-${index}`}>
          <span>
            {new Date(item.dt * 1000).toLocaleString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <p>{Math.round(item.main.temp)}°C</p>
          <p>{item.weather[0].description}</p>
          <img
            src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
            alt={item.weather[0].description}
          />
        </div>
      ))}
    </div>
  );
};

export type { ForecastData, ForecastItem };
export default WeatherForecast;
