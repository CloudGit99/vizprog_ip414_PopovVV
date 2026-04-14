export interface WeatherDescription {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface MainWeatherData {
  temp: number;
  humidity: number;
}

export interface WindData {
  speed: number;
}

export interface CurrentWeatherData {
  weather: WeatherDescription[];
  main: MainWeatherData;
  wind: WindData;
}

export interface ForecastItem {
  dt: number;
  main: MainWeatherData;
  weather: WeatherDescription[];
}

export interface ForecastWeatherData {
  list: ForecastItem[];
}

export interface GeocodingItem {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}
