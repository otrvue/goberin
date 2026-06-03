# Pascabayar Refactor & Unified Service Contract

## Context

Project:

```txt
/home/aiden/Proyek/codex/goberin
```

Backend:

```txt
Node.js + Express
Pure JavaScript (bukan TypeScript)
```

## Wajib Sebelum Coding

Selalu baca terlebih dahulu:

```txt
AGENTS.md
CODEX.md
docs/**/*.md
**/*.md
```

Khusus provider wajib baca:

```txt
DIGIFLAZZ.md
OKECONNECT.md
H2H-id.md
```

Dan update dokumentasi berikut setiap ada perubahan flow atau API:

```txt
docs/api-pascabayar.md
```

Jangan scan workspace berlebihan.
Gunakan pencarian yang relevan dan terbatas.

---

# Tujuan

Pisahkan seluruh logic pascabayar dari prabayar.

Buat module baru:

```txt
src/modules/transaction/pascabayar
```

Yang menjadi single entry point untuk:

```txt
INQUIRY
CHECK
PAYMENT
```

Provider yang didukung:

```txt
DIGIFLAZZ
OKECONNECT
H2H
```

---

# Product Validation

Semua request masuk menggunakan:

```json
{
  "customerNo": "123456789",
  "sku": "PLN-POSTPAID",
  "referenceId": "TRX-123456789"
}
```

Service wajib lookup ke table:

```txt
products
```

berdasarkan:

```txt
sku
```

Field yang wajib digunakan:

```txt
products.id
products.sku
products.vendor
products.vendorSku
products.type
```

Validasi:

```txt
type == POSTPAID
vendorSku tidak boleh kosong
vendor harus valid
```

Vendor valid:

```txt
DIGIFLAZZ
OKECONNECT
H2H
```

Jika invalid:

```json
{
  "success": false,
  "status": "INVALID_PRODUCT"
}
```

Dan jangan melakukan request ke provider.

---

# Arsitektur Baru

Contoh struktur:

```txt
src/modules/transaction/pascabayar/
│
├── pascabayar.service.js
├── pascabayar.mapper.js
├── pascabayar.validator.js
├── pascabayar.pricing.js
├── pascabayar.repository.js
│
├── providers/
│   ├── digiflazz.provider.js
│   ├── okeconnect.provider.js
│   └── h2h.provider.js
│
└── routes/
    └── pascabayar.route.js
```

---

# Flow Utama

## 1. Inquiry

Request:

```json
{
  "customerNo": "413760800025",
  "sku": "PLN-POSTPAID",
  "referenceId": "TRX-123"
}
```

Tujuan inquiry:

* validasi pelanggan
* ambil data tagihan
* simpan transaksi sementara
* menghasilkan inquiryId

---

# Flow Digiflazz

Digiflazz langsung mengembalikan data tagihan.

Maka:

```txt
call inquiry
↓
response tagihan diterima
↓
buat transactions
↓
simpan inquiryId
↓
status PENDING
```

Data inquiry harus langsung disimpan ke database.

---

# Flow H2H

Mirip Digiflazz.

Contoh response:

```json
{
  "inquiry_id": 41,
  "ref_id": "2af8fa0d-b509-48b0-9693-4b3fb991a083",
  "customer_no": "413760800025",
  "customer_name": null,
  "bill_amount": 77180,
  "admin_fee": 2500,
  "total_amount": 79680,
  "biaya_layanan": 2500,
  "grand_total": 82180,
  "period": "JUN 26",
  "expired_at": "2026-06-03T14:34:03+07:00"
}
```

Flow:

```txt
inquiry
↓
response tagihan
↓
simpan transactions
↓
status PENDING
```

---

# Flow OKECONNECT

Berbeda.

Inquiry tidak langsung menghasilkan data tagihan.

Provider akan mengirim callback.

Flow:

```txt
inquiry
↓
buat transaksi sementara
↓
status PENDING
↓
menunggu callback
↓
callback masuk
↓
parse callback
↓
update transactions
↓
simpan inquiryId
↓
simpan data tagihan
```

Wajib membuat parser callback yang kuat.

Pastikan callback tervalidasi sebelum update database.

---

# Penyimpanan Database

Tambahkan field baru pada transactions:

```txt
metadata
```

Tipe:

```json
{}
```

Digunakan untuk menyimpan data provider yang penting.

Contoh:

```json
{
  "productId": 1,
  "sku": "PLN-POSTPAID",
  "vendor": "DIGIFLAZZ",
  "vendorSku": "PLNPASCA",
  "providerInquiryId": "12345",
  "providerRefId": "ABC123"
}
```

---

# Metadata Rules

Simpan hanya field penting.

Jangan dump seluruh response provider jika ukurannya besar.

Minimal simpan:

```txt
productId
sku
vendor
vendorSku
providerInquiryId
providerTransactionId
providerRefId
customerNo
```

Jika perlu simpan response mentah provider:

```json
{
  "providerResponse": {}
}
```

tetapi hanya field penting.

Hindari metadata bengkak.

---

# Markup Prices

Sebelum data dikembalikan ke frontend.

Cari data:

```txt
markup_prices
```

berdasarkan:

```txt
productId
```

Jika tidak ada:

```txt
gunakan harga asli provider
```

---

# Tipe Markup

## FIXED

Contoh:

```txt
bill = 100000
markup = 2500
```

hasil:

```txt
102500
```

---

## PERCENTAGE

Contoh:

```txt
bill = 100000
markup = 5
```

hasil:

```txt
105000
```

---

# Helper

Buat helper terpusat:

```js
calculateMarkup(baseAmount, markupType, markupValue)
```

Jangan duplikasi logic pricing di provider.

---

# Response Total Amount

Semua response API ke frontend harus menggunakan:

```txt
harga provider + markup
```

Artinya:

```json
response.data.totalAmount
```

sudah final.

Frontend tidak perlu menghitung lagi.

---

# CHECK API

Endpoint:

```txt
POST /transaction/pascabayar/check
```

Request:

```json
{
  "transactionId": 123
}
```

Bukan lagi menggunakan:

```txt
sku
vendor
vendorSku
```

Karena semuanya sudah tersimpan saat inquiry.

Flow:

```txt
ambil transactions
↓
lihat vendor
↓
lihat inquiryId
↓
lihat metadata
↓
call provider sesuai vendor
↓
return hasil
```

Frontend tidak perlu tahu provider apa.

---

# PAYMENT API

Endpoint:

```txt
POST /transaction/pascabayar/payment
```

Request:

```json
{
  "transactionId": 123
}
```

Flow:

```txt
ambil transaction
↓
ambil vendor
↓
ambil inquiryId
↓
ambil metadata
↓
proses payment
↓
update transaction
↓
return unified response
```

Frontend tidak perlu mengirim:

```txt
vendor
vendorSku
sku
customerNo
```

karena semuanya sudah ada di database.

---

# Unified Inquiry Response

Saat inquiry berhasil:

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": 123,
  "inquiryId": "ABC123",
  "message": "Inquiry berhasil"
}
```

Response inquiry dibuat ringan.

Tidak perlu mengembalikan seluruh data tagihan.

---

# Unified Check Response

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": 123,
  "data": {
    "customerName": "John Doe",
    "productName": "PLN Pascabayar",
    "billAmount": 100000,
    "adminFee": 2500,
    "totalAmount": 105000,
    "period": "JUN 2026"
  }
}
```

---

# Unified Payment Response

```json
{
  "success": true,
  "status": "SUCCESS",
  "transactionId": 123,
  "message": "Pembayaran berhasil"
}
```

---

# Acceptance Criteria

* Seluruh logic pascabayar berada di folder baru.
* Tidak mengganggu flow prabayar existing.
* Digiflazz inquiry langsung simpan transaksi.
* H2H inquiry langsung simpan transaksi.
* OKECONNECT inquiry menunggu callback.
* Transactions memiliki metadata untuk provider.
* Markup FIXED dan PERCENTAGE berjalan.
* totalAmount selalu sudah termasuk markup.
* CHECK hanya membutuhkan transactionId.
* PAYMENT hanya membutuhkan transactionId.
* Frontend tidak perlu mengetahui provider.
* Update docs/api-pascabayar.md.
* Pure JavaScript.
* Tidak ada syntax error.
* Tidak ada duplikasi logic pricing.
