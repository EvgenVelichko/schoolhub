# School Hub | Навчання Нового Покоління

Це сучасна освітня платформа, побудована на NextJS та Firebase.

## Як розгорнути на Vercel

1. **Створіть проект у Vercel**: Імпортуйте свій репозиторій.
2. **Налаштуйте змінні оточення (Environment Variables)**:
   У налаштуваннях проекту Vercel додайте наступні ключі, які ви отримали в консолі Firebase:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
3. **Deploy**: Vercel автоматично розпізнає конфігурацію Next.js та запустить збірку.

## Основні розділи
- **Дашборд**: Огляд успішності та розклад.
- **Хаб Знань**: Соціальна мережа для обміну досвідом.
- **Зона Ігор**: Навчальні міні-ігри.
- **Адмін Панель**: Керування користувачами та контентом.
- **Повідомлення**: Приватні чати між учнями.
