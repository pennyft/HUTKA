// Генерация TypeScript-типов из OpenAPI-схемы бэка в src/api/generated/schema.d.ts
// Запуск: npm run gen:api   (бэк должен быть запущен)
// URL схемы: возьмите ссылку на JSON из Swagger UI и при необходимости задайте OPENAPI_URL.
import { spawnSync } from 'node:child_process'

const url = process.env.OPENAPI_URL || 'http://localhost:8080/v3/api-docs'
const res = spawnSync('npx', ['openapi-typescript', url, '-o', 'src/api/generated/schema.d.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(res.status ?? 1)
