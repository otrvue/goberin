# API Pascabayar (Unified)

## Base Path

Seluruh endpoint pascabayar baru berada di bawah:

```text
/api/trx/pascabayar
```

Route yang tersedia:

* `POST /api/trx/pascabayar/inquiry`
* `POST /api/trx/pascabayar/check`
* `POST /api/trx/pascabayar/payment`

Provider yang didukung:

* `DIGIFLAZZ`
* `OKECONNECT`
* `H2H`

## Authentication

Gunakan salah satu:

* `Authorization: Bearer <token>`
* `X-API-Key: <api-key>`

## Flow Ringkas

### 1. Inquiry

Frontend mengirim:

```json
{
  "customerNo": "413760800025",
  "sku": "PLN-POSTPAID",
  "referenceId": "TRX-123"
}
```

Backend akan:

1. validasi produk dari database berdasarkan `sku`
2. panggil provider sesuai `vendor`
3. buat transaksi pascabayar sementara di tabel `transactions`
4. simpan metadata provider ke `transactions.metadata`
5. return response ringan berisi `transactionId`

### 2. Check

Frontend hanya mengirim:

```json
{
  "transactionId": "uuid-transaction"
}
```

Backend akan:

1. ambil transaction dari database
2. baca `vendor`, `vendorSku`, `customerNo`, `providerRefId`, dan metadata lain dari transaction
3. ambil data inquiry/tagihan dari metadata atau provider
4. return response unified dengan `totalAmount` final yang sudah termasuk markup

### 3. Payment

Frontend hanya mengirim:

```json
{
  "transactionId": "uuid-transaction"
}
```

Backend akan:

1. ambil transaction dari database
2. ambil `vendor`, `customerNo`, `inquiryId`, dan metadata lain dari transaction
3. proses pembayaran ke provider
4. update transaction dan metadata
5. return response unified sederhana

## 1. Inquiry API

### Route

```http
POST /api/trx/pascabayar/inquiry
```

### Request Body

```json
{
  "customerNo": "413760800025",
  "sku": "PLN-POSTPAID",
  "referenceId": "TRX-123"
}
```

### Field wajib

* `customerNo`
* `sku`
* `referenceId`

### Catatan

* `customerNo` akan dinormalisasi menjadi string
* jangan kirim `vendorSku`, `vendor`, atau `type` dari frontend
* semua data provider diambil dari database berdasarkan `sku`

### Response sukses

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123",
  "inquiryId": "TRX-123",
  "message": "Inquiry berhasil"
}
```

### Response gagal: invalid product

```json
{
  "success": false,
  "status": "INVALID_PRODUCT",
  "action": "INQUIRY",
  "referenceId": "TRX-123",
  "sku": "UNKNOWN",
  "customerNo": "413760800025",
  "message": "Produk tidak ditemukan",
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produk tidak ditemukan"
  }
}
```

### Response gagal: provider error

```json
{
  "success": false,
  "status": "PROVIDER_ERROR",
  "action": "INQUIRY",
  "referenceId": "TRX-123",
  "provider": "DIGIFLAZZ",
  "sku": "PLN-POSTPAID",
  "vendorSku": "pln",
  "customerNo": "413760800025",
  "message": "Provider error",
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "Provider error"
  }
}
```

## 2. Check API

### Route

```http
POST /api/trx/pascabayar/check
```

### Request Body

```json
{
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123"
}
```

### Response sukses

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123",
  "data": {
    "customerName": "John Doe",
    "productName": "PLN Pascabayar",
    "billAmount": 100000,
    "adminFee": 2500,
    "totalAmount": 105000,
    "period": "JUN 2026",
    "dueDate": "2026-06-20",
    "detail": {
      "providerTotal": 102500,
      "markupType": "FIXED",
      "markupValue": 2500,
      "markupAmount": 2500
    }
  }
}
```

### Arti nilai di response check

* `billAmount`: nominal tagihan utama
* `adminFee`: admin fee dari provider
* `totalAmount`: total final ke frontend, sudah termasuk markup internal
* `detail.providerTotal`: total provider sebelum markup internal
* `detail.markupAmount`: markup internal yang ditambahkan backend

### Response saat inquiry masih menunggu callback provider

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123",
  "message": "Menunggu data tagihan dari provider"
}
```

### Response gagal: transaction tidak ditemukan

```json
{
  "success": false,
  "status": "NOT_FOUND",
  "message": "Transaksi tidak ditemukan",
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaksi tidak ditemukan"
  }
}
```

## 3. Payment API

### Route

```http
POST /api/trx/pascabayar/payment
```

### Request Body

```json
{
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123"
}
```

### Response sukses

```json
{
  "success": true,
  "status": "SUCCESS",
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123",
  "message": "Pembayaran berhasil"
}
```

### Response pending

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "f4c1f1df-c0a2-4b2d-a2e0-9f9a0cfab123",
  "message": "Pembayaran diproses"
}
```

### Response gagal: inquiry belum siap

```json
{
  "success": false,
  "status": "PROVIDER_ERROR",
  "message": "Inquiry belum lengkap atau data tagihan belum tersedia",
  "error": {
    "code": "INQUIRY_NOT_READY",
    "message": "Inquiry belum lengkap atau data tagihan belum tersedia"
  }
}
```

### Response gagal: OKECONNECT masih menunggu callback inquiry

```json
{
  "success": false,
  "status": "PROVIDER_ERROR",
  "message": "Masih menunggu callback inquiry dari OKECONNECT",
  "error": {
    "code": "INQUIRY_PENDING_CALLBACK",
    "message": "Masih menunggu callback inquiry dari OKECONNECT"
  }
}
```

## Product Validation Rules

Lookup product dilakukan ke tabel `products` berdasarkan `sku`.

Field yang dipakai:

* `products.id`
* `products.sku`
* `products.vendor`
* `products.vendorSku`
* `products.type`

Validasi yang dijalankan:

* produk harus ada
* produk harus aktif
* `vendorSku` tidak boleh kosong
* `vendor` harus salah satu dari `DIGIFLAZZ`, `OKECONNECT`, `H2H`
* `type` harus `POSTPAID`

Jika invalid, backend return `status: INVALID_PRODUCT` dan tidak akan call provider.

## Metadata Transaction

Flow unified pascabayar menyimpan metadata penting di `transactions.metadata`.

Minimal field yang disimpan:

* `productId`
* `sku`
* `vendor`
* `vendorSku`
* `providerInquiryId`
* `providerTransactionId`
* `providerRefId`
* `providerPaymentRefId`
* `customerNo`
* `billData`
* `pricing`

## Markup Rules

Markup dihitung oleh helper terpusat dan tidak boleh dihitung lagi di frontend.

### FIXED

```text
providerTotal = 100000
markup = 2500
hasil totalAmount = 102500
```

### PERCENTAGE

```text
providerTotal = 100000
markup = 5
hasil totalAmount = 105000
```

## Nilai Status Unified

Kemungkinan nilai `status`:

* `PENDING`
* `SUCCESS`
* `FAILED`
* `NOT_FOUND`
* `INVALID_PRODUCT`
* `PROVIDER_ERROR`

## Error Code yang Mungkin Muncul

* `PRODUCT_NOT_FOUND`
* `SKU_MISMATCH`
* `PRODUCT_INACTIVE`
* `VENDOR_SKU_MISSING`
* `INVALID_VENDOR`
* `INVALID_PRODUCT_TYPE`
* `TRANSACTION_NOT_FOUND`
* `FORBIDDEN`
* `INQUIRY_NOT_READY`
* `INQUIRY_PENDING_CALLBACK`
* `INQUIRY_ID_REQUIRED`
* `PROVIDER_ERROR`
* `OKECONNECT_PROVIDER_ERROR`
* `H2H_PROVIDER_ERROR`

## Sanitasi Raw Provider Response

Jika response provider disimpan dan dikembalikan di field `raw` atau `error.detail`, field sensitif akan disamarkan:

* `apikey`
* `api_key`
* `password`
* `pin`
* `sign`
* `signature`
* `token`

Nilai akan menjadi:

```json
"[REDACTED]"
```

## Backward Compatibility

Endpoint legacy lama masih ada:

* `/api/trx/postpaid/inquiry`
* `/api/trx/postpaid/pay`

Tetapi flow unified baru direkomendasikan memakai:

* `/api/trx/pascabayar/inquiry`
* `/api/trx/pascabayar/check`
* `/api/trx/pascabayar/payment`
