IP414 Popov Vladimir Viz.Prog Final Project
React + Typescript + Vite
Library - TanStack Virtual

Как запустить:
npm run dev

Проверка:
npm run build
npm run lint
npm test

Документы:
Создать документ - кнопка на главной
Открыть - открыть таблицу
Переименовать - новое название
Дублировать - копия документа
Удалить - удаление с подтверждением
Сохранить - кнопка или Ctrl+S
Автосохранение - 500 ms после изменения ячейки

Redux:
Состояние документов - documentsSlice
Состояние таблицы - spreadsheetSlice
Модалки и сохранение - uiSlice
Пользователь - authSlice
Undo - Ctrl+Z
Redo - Ctrl+Y

Маршруты:
/ - переход на /dashboard
/dashboard - список документов
/documents/:documentId - таблица
/profile - профиль
/login - вход
/register - регистрация
* - 404

Auth:
Access token - Redux
Refresh token - localStorage
Logout - кнопка Выйти
Документы фильтруются по userId

Форматирование:
Ctrl+B - жирный
Ctrl+I - курсив
Ctrl+U - подчёркивание
Цвет фона и текста - color
Выравнивание и формат числа - select
Del/Backspace - очистить ячейку
Ctrl+A - выделить всё
Ctrl+C/Ctrl+X/Ctrl+V - копировать/вырезать/вставить

Экспорт/импорт:
Экспорт CSV - скачать .csv
Экспорт JSON - скачать .json
Импорт CSV - загрузить .csv

Формулы:
=SUM(?:?)
=AVERAGE(?:?)
=?+?
=?*2
(? - ячейка)

Как выделить диапазон:
Клик по ячейке и shift + клик по другой ячейке

Меню добавления/удаления строки/столбца: правая кнопка мыши
