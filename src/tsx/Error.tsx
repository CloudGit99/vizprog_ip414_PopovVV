interface ErrorProps {
  message: string;
}

const ErrorMessage = ({ message }: ErrorProps) => {
  return <div className="error-message">Ошибка: {message}</div>;
};

export default ErrorMessage;
