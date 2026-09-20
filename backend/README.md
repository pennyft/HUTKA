# HUTKA — backend

Spring Boot 3.5.16 · Java 21 · PostgreSQL · Redis · Flyway

## Запуск в IntelliJ IDEA Ultimate

1. **Открыть проект**: File → Open → выбрать папку `hutka-backend` (там, где `pom.xml`).
   IDEA сама распознает Maven-проект и подтянет зависимости (может занять пару минут при первом импорте).

2. **Проверить JDK**: File → Project Structure → Project → SDK — должен быть Java 21.
   Если нет — SDK → Add SDK → Download JDK → 21 (Temurin/Eclipse Adoptium подойдёт).

3. **Поднять Postgres и Redis**:
   ```bash
   docker-compose up -d
   ```
   Проверить, что контейнеры живые: `docker ps` — должны быть `hutka-postgres` и `hutka-redis`.

4. **Переменные окружения**: скопировать `.env.example` → `.env` и заполнить.
   Для локального docker-compose дефолтные значения `DB_URL`/`DB_USER`/`DB_PASSWORD` уже подходят,
   менять не обязательно на этом шаге.

   IDEA сама `.env` не читает — два варианта:
   - плагин **EnvFile** (Settings → Plugins → искать "EnvFile") → в Run Configuration подключить `.env`;
   - или вручную вставить переменные в Run Configuration → Environment variables.

   Для первого запуска можно вообще ничего не настраивать — в `application.yml` у всех
   переменных есть дефолты, совпадающие с `docker-compose.yml`.

5. **Запустить**: открыть `BackendApplication.java` → зелёная стрелка слева от `main` → Run.

6. **Проверить, что поднялось**:
   - Swagger UI: http://localhost:8080/swagger-ui.html
   - Flyway должен был создать таблицу `users` — можно проверить через IDEA Database tool
     window (Database → + → Data Source → PostgreSQL, `localhost:5432/hutka`, hutka/hutka).

## Дальше по плану (раздел 18.3 документа)

Порядок пакетов: `config → db/migration → auth` (сейчас), затем `car` + `partner`,
затем `booking` (самый сложный), остальное — параллельно.

Следующий шаг — пакет `auth`: JWT-фильтр, `User` entity, `/auth/register`,
`/auth/verify-email` (раздел 3.1, 23.1).
