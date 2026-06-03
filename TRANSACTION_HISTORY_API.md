# NEOPAY Transaction & History API Documentation

Dokumentasi ini mencakup seluruh endpoint untuk manajemen produk, eksekusi transaksi (Prepaid, Postpaid, BukaOlshop), dan pengecekan riwayat bagi user/partner.

## 1. Authentication
Seluruh API ini memerlukan salah satu dari:
- **JWT Token**: Dikirim via header `Authorization: Bearer <token>`
- **API Key**: Dikirim via header `X-API-Key: <api_key>` (Untuk partner/integrasi sistem luar)

---

## 2. Product Management

### [GET] /api/trx/products
Mengambil daftar produk yang tersedia beserta harga jual (setelah markup).
- **Query Params**:
  - `page`: Nomor halaman (Default: 1)
  - `limit`: Jumlah data per halaman (Default: 50)
  - `categoryId`: Filter berdasarkan ID Kategori
  - `providerId`: Filter berdasarkan ID Provider

### [GET] /api/trx/categories
Mengambil daftar kategori produk (Pulsa, Data, Token PLN, dll).

### [GET] /api/trx/providers
Mengambil daftar provider produk (Telkomsel, XL, PLN, dll).
- **Query Params**:
  - `categoryId`: (Opsional) Filter provider berdasarkan kategori tertentu.
- **Response**:
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "total": 120,
        "page": 1,
        "limit": 50,
        "totalPages": 3
    }
}
```

---

## 3. Core Transactions

### [POST] /api/trx/prepaid
Melakukan transaksi prabayar (Pulsa, Paket Data, E-Wallet Topup).
- **Body**: 
```json
{
    "productId": "optional-uuid",
    "sku": "optional-sku",
    "customerNo": "08123456789",
    "nominal": 50000 // Opsional, hanya untuk produk Open Denom
}
```
*Wajib mengisi salah satu antara `productId` atau `sku`.*

### [POST] /api/trx/postpaid/inquiry
Cek tagihan pascabayar (PLN Pasca, BPJS, PDAM, dll).
- **Body**: `{ "productId": "...", "sku": "...", "customerNo": "..." }`

### [POST] /api/trx/postpaid/pay
Membayar tagihan pascabayar yang telah di-inquiry sebelumnya.
- **Body**: `{ "productId": "...", "sku": "...", "customerNo": "..." }`

---

## 4. BukaOlshop Integration

### [POST] /api/trx/bukaolshop
Transaksi khusus yang memotong saldo end-user di aplikasi BukaOlshop.
- **Body**:
```json
{
    "productId": "optional-uuid",
    "sku": "optional-sku",
    "customerNo": "08123456789",
    "tokenUser": "...", // Token user dari BukaOlshop
    "idUser": "...",    // ID user dari BukaOlshop
    "pin": "...",       // (Opsional) PIN BukaOlshop user
    "nominal": 50000    // Opsional untuk Open Denom
}
```
**Kelebihan**: Alur ini secara otomatis menangani *inquiry* (untuk Postpaid) dan *auto-refund* ke saldo BukaOlshop jika transaksi gagal di tengah jalan.

---

## 5. History & Tracking

### [GET] /api/trx/history
Melihat riwayat seluruh transaksi yang pernah dilakukan oleh user/partner ini.
- **Query Params**:
  - `idUser`: Filter berdasarkan ID User BukaOlshop
  - `tokenUser`: Filter berdasarkan Token User BukaOlshop
  - `limit`: Batasi jumlah data (Default: 50)

### [GET] /api/trx/status/:id
Mengecek status mendetail dari satu transaksi tertentu.
- **Path Param**: `id` adalah ID Transaksi Internal NEOPAY.
- **Response**:
```json
{
    "success": true,
    "data": {
        "id": "...",
        "status": "SUCCESS", // PENDING, SUCCESS, FAILED, REFUNDED
        "sn": "1234567890",
        "notes": "Transaksi Berhasil",
        "updatedAt": "..."
    }
}
```

---

## 6. Webhook / Callback
Jika Anda menyetel `callbackUrl` di profil Anda, NEOPAY akan mengirimkan POST request setiap kali ada perubahan status transaksi (misal dari PENDING ke SUCCESS/FAILED).

**Format Callback**:
```json
{
    "ref_id": "ID_INTERNAL_NEOPAY",
    "status": "SUCCESS",
    "sn": "1234567890",
    "message": "Transaksi Sukses"
}
```
