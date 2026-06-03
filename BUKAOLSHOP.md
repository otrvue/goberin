# BukaOlshop API Documentation

## Base Information

API digunakan untuk mengambil informasi user, aplikasi, limit request, dan mengubah saldo member pada BukaOlshop.

---

## Authentication

BukaOlshop menggunakan 2 jenis autentikasi:

### 1. Token Query Parameter

Digunakan pada endpoint OpenAPI:

| Parameter | Keterangan |
|------------|------------|
| token | API Token BukaOlshop |
| token_user | Token user |
| id_user | ID user |

Contoh:

```http
GET /v1/user/info?token=API_TOKEN&token_user=USER_TOKEN&id_user=12345
```

---

### 2. Bearer Token

Digunakan pada endpoint aplikasi dan saldo.

Header:

```http
Authorization: Bearer YOUR_API_KEY
```

Contoh:

```http
Authorization: Bearer xxxxxxxxxxxxxxxxx
```

---

# User API

## Ambil Data User

Mengambil informasi lengkap user.

### Endpoint

```http
GET https://openapi.bukaolshop.net/v1/user/info
```

### Query Parameters

| Parameter | Type | Required | Keterangan |
|------------|-------|-----------|-------------|
| token | string | Ya | API token BukaOlshop |
| token_user | string | Ya | Token user |
| id_user | string | Ya | ID user |

### Example Request

```http
GET https://openapi.bukaolshop.net/v1/user/info?token=API_TOKEN&token_user=USER_TOKEN&id_user=12345
```

### Success Response

```json
{
    "code": 200,
    "status": "ok",
    "data": {
        "nama_user": "User name",
        "email_user": "user@gmail.com",
        "tanggal_lahir": "1998-11-08",
        "nomor_telepon": "62821288454822",
        "foto_profil": "link gambar",
        "tanggal_daftar": "2020-11-23",
        "status_akun": "aktif",
        "status_email": "belum_verifikasi",
        "nama_membership": "Basic reseller",
        "icon_membership": null,
        "block_akses_membership": "tidak_ada",
        "kode_referral": "MYREF",
        "status_nomor_hp": "belum_verifikasi",
        "jumlah_saldo": "50000",
        "jumlah_poin": "500"
    }
}
```

### Response Fields

| Field | Type | Keterangan |
|---------|-------|------------|
| nama_user | string | Nama user |
| email_user | string | Email user |
| tanggal_lahir | string | Tanggal lahir |
| nomor_telepon | string | Nomor HP |
| foto_profil | string | URL foto profil |
| tanggal_daftar | string | Tanggal registrasi |
| status_akun | string | Status akun |
| status_email | string | Verifikasi email |
| nama_membership | string | Membership user |
| icon_membership | string/null | Icon membership |
| block_akses_membership | string | Informasi pembatasan akses |
| kode_referral | string | Kode referral |
| status_nomor_hp | string | Status verifikasi nomor HP |
| jumlah_saldo | string | Saldo user |
| jumlah_poin | string | Total poin |

---

# Application API

## Mendapatkan Informasi Aplikasi

Mengambil informasi aplikasi/toko.

### Endpoint

```http
POST https://bukaolshop.net/api/v1/aplikasi/info
```

### Headers

```http
Authorization: Bearer YOUR_API_KEY
```

### Example Request

```http
POST https://bukaolshop.net/api/v1/aplikasi/info
Authorization: Bearer xxxxxxxxx
```

### Success Response

```json
{
  "code": 200,
  "status": "ok",
  "nama_toko": "OlshopTest",
  "nama_aplikasi": "OlshopTest",
  "nama_package": "com.olshopgue",
  "icon_aplikasi": "https://xxxxxxxx/xxx/xxx/xxx/xxx.png",
  "masa_aktif_premium": "2021-09-16",
  "status_premium": "lite",
  "tanggal_daftar_aplikasi": "2019-11-08 20:29:30",
  "telah_verifikasi_identitas": false,
  "email_pemilik_olshop": "cek@gmail.com",
  "nama_pemilik_olshop": "testing user",
  "hp_pemilik_olshop": "082234327658"
}
```

### Response Fields

| Field | Type |
|---------|------|
| nama_toko | string |
| nama_aplikasi | string |
| nama_package | string |
| icon_aplikasi | string |
| masa_aktif_premium | string |
| status_premium | string |
| tanggal_daftar_aplikasi | string |
| telah_verifikasi_identitas | boolean |
| email_pemilik_olshop | string |
| nama_pemilik_olshop | string |
| hp_pemilik_olshop | string |

---

# Request Limit API

## Mendapatkan Total Request API

Melihat jumlah request API yang telah digunakan.

### Endpoint

```http
GET https://bukaolshop.net/api/v1/aplikasi/info_limit
```

### Headers

```http
Authorization: Bearer YOUR_API_KEY
```

### Example Request

```http
GET https://bukaolshop.net/api/v1/aplikasi/info_limit
Authorization: Bearer xxxxxxxxx
```

### Success Response

```json
{
  "code": 200,
  "status": "ok",
  "jumlah_request": 230
}
```

### Response Fields

| Field | Type | Keterangan |
|---------|------|------------|
| jumlah_request | integer | Total request API |

---

# Member Balance API

## Ubah Saldo Member

Menambah atau mengurangi saldo user.

### Endpoint

```http
POST https://bukaolshop.net/api/v1/member/saldo
```

### Headers

```http
Authorization: Bearer YOUR_API_KEY
```

### Query Parameters

| Parameter | Type | Required | Keterangan |
|------------|------|-----------|-------------|
| id_user | string | Ya | ID user |
| tipe | string | Ya | tambah / kurang |
| jumlah | integer | Ya | Nominal saldo |
| pin | string | Ya | PIN akun |
| catatan_saldo | string | Tidak | Catatan transaksi |
| notifikasi | boolean | Tidak | Kirim notifikasi |
| judul_notifikasi | string | Tidak | Judul notifikasi |
| pesan_notifikasi | string | Tidak | Isi notifikasi |

### Example Request

```http
POST https://bukaolshop.net/api/v1/member/saldo?id_user=289820&tipe=tambah&jumlah=30000&pin=123456&catatan_saldo=Bonus&notifikasi=true&judul_notifikasi=Saldo Masuk&pesan_notifikasi=Saldo berhasil ditambahkan
```

Header:

```http
Authorization: Bearer xxxxxxxxx
```

### Success Response

```json
{
   "code": 200,
   "status": "ok - Saldo berhasil ditambah",
   "id_user": "289820",
   "email_user": "emailuser@gmail.com",
   "nama_user": "Nama user",
   "jumlah": 30000,
   "tipe": "tambah",
   "id_perubahan": "456406"
}
```

### Response Fields

| Field | Type | Keterangan |
|---------|------|------------|
| id_user | string | ID user |
| email_user | string | Email user |
| nama_user | string | Nama user |
| jumlah | integer | Nominal perubahan |
| tipe | string | tambah / kurang |
| id_perubahan | string | ID transaksi perubahan |

---

# Error Response

Contoh response error:

```json
{
  "code":400,
  "status":"parameter tidak valid"
}
```

atau:

```json
{
  "code":401,
  "status":"unauthorized"
}
```

atau:

```json
{
  "code":500,
  "status":"internal server error"
}
```