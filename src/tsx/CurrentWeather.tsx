import '../css/CurrentWeather.css';

interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface CurrentWeatherData {
  main: {
    temp: number;
    humidity: number;
  };
  weather: WeatherCondition[];
  wind: {
    speed: number;
  };
}

interface CurrentWeatherProps {
  data: CurrentWeatherData;
}

const CurrentWeather = ({ data }: CurrentWeatherProps) => {
  return (
    <div className="CurrentWeather">
      <h3>Текущая погода</h3>
      <div className="current">
        {Math.round(data.main.temp)}°C
        <div>{data.weather[0].description}</div>
        <div>Влажность: {data.main.humidity}%</div>
        <div>Ветер: {Math.round(data.wind.speed)} м/с</div>
        <img
          src={`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`}
          alt={data.weather[0].description}
        />
      </div>
    </div>
  );
};

export type { CurrentWeatherData, WeatherCondition };
export default CurrentWeather;
