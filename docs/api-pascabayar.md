# API Pascabayar (Unified Frontend Response)

## Base Path

```text
/api/trx/pascabayar
```

Route:

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

## Tujuan Response Unified

Walaupun provider berbeda, response utama ke frontend dibuat **seragam** agar frontend tidak perlu parsing format khusus per provider.

Field `raw` atau metadata internal boleh berbeda antar provider, tetapi **response data utama** ke frontend harus memakai bentuk yang sama.

## Shape Response Data yang Dipakai Frontend

Semua endpoint pascabayar akan menggunakan `data` seperti ini:

```json
{
  "billStatus": "PENDING",
  "customerName": "B*H*X*",
  "billAmount": 78844,
  "adminFee": 2500,
  "totalAmount": 81344,
  "tarif": "-",
  "lembar_tagihan": 1,
  "alamat": "-",
  "detail": [
    {
      "periode": "062026",
      "nilai_tagihan": "77180.0",
      "admin": "2500",
      "denda": "0.0",
      "meter_awal": "0",
      "meter_akhir": "0",
      "biaya_lain": "0"
    }
  ],
  "notes": "T#..."
}
```

### Arti field

* `billStatus`: status tagihan/transaksi unified (`PENDING`, `SUCCESS`, `FAILED`, `NOT_FOUND`, `DUPLICATE_REFERENCE_ID`, dst.)
* `customerName`: nama pelanggan jika tersedia
* `billAmount`: nominal tagihan utama
* `adminFee`: admin fee dari provider
* `totalAmount`: total final ke frontend, sudah termasuk markup backend
* `tarif`: tarif pelanggan jika ada
* `lembar_tagihan`: jumlah lembar tagihan jika ada
* `alamat`: alamat pelanggan jika ada
* `detail`: detail tagihan per periode / field mentah yang relevan
* `notes`: catatan transaksi terformat backend

## Aturan Error

* `error` **hanya muncul jika benar-benar error**
* jika `referenceId` duplikat, **jangan tampilkan `error`**
* jika provider sedang pending callback, `error` tidak muncul

## 1. Inquiry

### Route

```http
POST /api/trx/pascabayar/inquiry
```

### Request Body

```json
{
  "customerNo": "413760800025",
  "sku": "P001-PDAMKPL",
  "referenceId": "TRX-123"
}
```

### Response sukses inquiry langsung (mis. DIGIFLAZZ / H2H)

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "inquiryId": "TRX-123",
  "message": "Inquiry berhasil",
  "data": {
    "billStatus": "PENDING",
    "customerName": "B*H*X*",
    "billAmount": 78844,
    "adminFee": 2500,
    "totalAmount": 81344,
    "tarif": "-",
    "lembar_tagihan": 1,
    "alamat": "-",
    "detail": [
      {
        "periode": "062026",
        "nilai_tagihan": "77180.0",
        "admin": "2500",
        "denda": "0.0",
        "meter_awal": "0",
        "meter_akhir": "0",
        "biaya_lain": "0"
      }
    ],
    "notes": "T#bcbd9e97-90c2-44e0-9f7c-86b8657378ac R#TRX-123 Cek pdam palembang P001-PDAMKPL.413760800025 Pending Ket:Transaksi Sukses @03/06 14:34. Saldo 6.500"
  }
}
```

### Response inquiry OKECONNECT yang masih menunggu callback

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "inquiryId": "TRX-123",
  "message": "Inquiry berhasil, menunggu callback provider",
  "data": {
    "billStatus": "PENDING",
    "notes": "T#bcbd9e97-90c2-44e0-9f7c-86b8657378ac R#TRX-123 Cek pdam palembang P001-PDAMKPL.413760800025 Pending Ket:transaksi sedang di proses biller @03/06 14:34. Saldo 6.500"
  }
}
```

### Response duplicate referenceId

```json
{
  "success": true,
  "status": "DUPLICATE_REFERENCE_ID",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "inquiryId": "TRX-123",
  "message": "referenceId sudah digunakan, mengembalikan data transaksi yang sudah ada",
  "data": {
    "billStatus": "PENDING",
    "customerName": "B*H*X*",
    "billAmount": 78844,
    "adminFee": 2500,
    "totalAmount": 81344,
    "tarif": "-",
    "lembar_tagihan": 1,
    "alamat": "-",
    "detail": [
      {
        "periode": "062026",
        "nilai_tagihan": "77180.0",
        "admin": "2500",
        "denda": "0.0",
        "meter_awal": "0",
        "meter_akhir": "0",
        "biaya_lain": "0"
      }
    ],
    "notes": "T#bcbd9e97-90c2-44e0-9f7c-86b8657378ac R#TRX-123 Cek pdam palembang P001-PDAMKPL.413760800025 Pending Ket:Transaksi Sukses @03/06 14:34. Saldo 6.500"
  }
}
```

### Response invalid product

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

## 2. Check

### Route

```http
POST /api/trx/pascabayar/check
```

### Request Body

```json
{
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac"
}
```

### Response sukses

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "data": {
    "billStatus": "PENDING",
    "customerName": "B*H*X*",
    "billAmount": 78844,
    "adminFee": 2500,
    "totalAmount": 81344,
    "tarif": "-",
    "lembar_tagihan": 1,
    "alamat": "-",
    "detail": [
      {
        "periode": "062026",
        "nilai_tagihan": "77180.0",
        "admin": "2500",
        "denda": "0.0",
        "meter_awal": "0",
        "meter_akhir": "0",
        "biaya_lain": "0"
      }
    ],
    "notes": "T#bcbd9e97-90c2-44e0-9f7c-86b8657378ac R#TRX-123 Cek pdam palembang P001-PDAMKPL.413760800025 Pending Ket:Transaksi Sukses @03/06 14:34. Saldo 6.500"
  }
}
```

### Response menunggu callback inquiry

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "message": "Menunggu data tagihan dari provider",
  "data": {
    "billStatus": "PENDING",
    "notes": "T#bcbd9e97-90c2-44e0-9f7c-86b8657378ac R#TRX-123 Cek pdam palembang P001-PDAMKPL.413760800025 Pending Ket:transaksi sedang di proses biller @03/06 14:34. Saldo 6.500"
  }
}
```

### Response transaction tidak ditemukan

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

## 3. Payment

### Route

```http
POST /api/trx/pascabayar/payment
```

### Request Body

```json
{
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac"
}
```

### Response sukses

```json
{
  "success": true,
  "status": "SUCCESS",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "message": "Pembayaran berhasil",
  "data": {
    "billStatus": "SUCCESS",
    "customerName": "B*H*X*",
    "billAmount": 78844,
    "adminFee": 2500,
    "totalAmount": 81344,
    "tarif": "-",
    "lembar_tagihan": 1,
    "alamat": "-",
    "detail": [
      {
        "periode": "062026",
        "nilai_tagihan": "77180.0",
        "admin": "2500",
        "denda": "0.0",
        "meter_awal": "0",
        "meter_akhir": "0",
        "biaya_lain": "0"
      }
    ],
    "notes": "T#bcbd9e97-90c2-44e0-9f7c-86b8657378ac R#TRX-123 Cek pdam palembang P001-PDAMKPL.413760800025 Success Ket:Transaksi Sukses @03/06 14:34. Saldo 6.500"
  }
}
```

### Response payment masih diproses

```json
{
  "success": true,
  "status": "PENDING",
  "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
  "message": "Pembayaran diproses",
  "data": {
    "billStatus": "PENDING",
    "notes": "T#..."
  }
}
```

### Response error provider

```json
{
  "success": false,
  "status": "PROVIDER_ERROR",
  "message": "Provider error",
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "Provider error"
  }
}
```

## Product Validation Rules

Lookup product dilakukan ke tabel `products` berdasarkan `sku`.

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

Markup dihitung oleh helper terpusat dan frontend tidak perlu menghitung ulang.

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
* `DUPLICATE_REFERENCE_ID`

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

## Catatan Penting

* `error` **tidak ditampilkan** untuk kasus `DUPLICATE_REFERENCE_ID`
* frontend cukup membaca:
  * `status`
  * `transactionId`
  * `message`
  * `data.billStatus`
  * `data.customerName`
  * `data.billAmount`
  * `data.adminFee`
  * `data.totalAmount`
  * `data.detail`
  * `data.notes`

## Backward Compatibility

Endpoint legacy masih ada:

* `/api/trx/postpaid/inquiry`
* `/api/trx/postpaid/pay`

Tetapi flow unified frontend direkomendasikan memakai:

* `/api/trx/pascabayar/inquiry`
* `/api/trx/pascabayar/check`
* `/api/trx/pascabayar/payment`
