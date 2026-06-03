## 🎯 General Principles

- Gunakan Node.js + Express.js dengan ES Modules (`import/export`)
- Arsitektur wajib feature-based / module-based
- Kode harus clean, scalable, dan mudah di-maintain
- Business logic tidak boleh ada di controller
- Semua konfigurasi sensitif wajib menggunakan `.env`

---

## 📁 Project Structure Rules

Semua fitur wajib berada di:

src/modules/{feature}/

Setiap module wajib memiliki:

- route.js
- controller.js
- service.js
- repository.js (untuk database query)
- validation.js (opsional tapi direkomendasikan)

---

## ⚙️ Coding Standards

- Wajib menggunakan async/await
- Tidak boleh menggunakan callback style
- Semua controller wajib pakai try/catch
- Response harus seragam

Contoh response:

return res.status(200).json({
  success: true,
  message: "Success",
  data,
});

---

## 🧠 Service Layer Rules

- Semua business logic wajib di service layer
- Controller hanya menerima request, memanggil service, mengembalikan response
- Service tidak boleh mengakses req/res

---

## 🗄️ Database Rules (Prisma)

- Semua query database wajib melalui repository layer
- Dilarang query Prisma langsung di controller
- Gunakan soft delete jika memungkinkan (deletedAt)

---

## 🔐 Security Rules

- Wajib JWT Authentication
- Wajib input validation (zod/joi/validator)
- Password wajib di-hash (bcrypt)
- Rate limiting wajib untuk public endpoint
- Tidak boleh expose error internal ke client

---

## 📊 Logging Rules (WINSTON)

Semua logging WAJIB menggunakan Winston

src/config/logger.js
logs/

Konfigurasi:

import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

export default logger;

Rules:
- dilarang console.log
- semua log pakai logger

Levels:
- info
- warn
- error
- debug

---

## 🚨 Error Handling Rules

- Wajib global error middleware
- Tidak boleh expose stack trace ke client

Format:
{
  success: false,
  message: "Something went wrong",
  errorCode: "INTERNAL_ERROR"
}

---

## 🔁 API Response Rules

Success:
{
  success: true,
  message: "OK",
  data: {}
}

Error:
{
  success: false,
  message: "Error message",
  data: null
}

---

## 📦 Naming Convention

- file: kebab-case.js
- function: camelCase
- class: PascalCase
- constant: UPPER_CASE

---

## ⚡ Performance Rules

- Pagination wajib untuk list besar
- Hindari N+1 query
- Gunakan caching jika perlu

---

## ❌ Forbidden Practices

- console.log di production
- business logic di controller
- query DB langsung di route/controller
- duplicate logic
- expose internal error

---

## 🧩 Recommended Stack

- Express.js
- Prisma (v6)
- Winston
- Zod
- JWT