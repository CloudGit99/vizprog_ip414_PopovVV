import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import { store } from './store/store.ts'
import { restoreSession } from './store/authSlice.ts'

/**
 * Запускает восстановление сессии перед первым рендером приложения.
 *
 * Если refresh token существует, закрытые маршруты получают авторизованного пользователя.
 */
void store.dispatch(restoreSession())

/**
 * Корень React-приложения с Redux provider.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
