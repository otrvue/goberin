# NEOPAY REST API Documentation

Sistem REST API untuk manajemen PPOB dengan integrasi DigiFlazz & OkeConnect.

## Base URL
`http://localhost:3000`

## Error Responses
API menggunakan format error yang konsisten:
```json
{
    "success": false,
    "message": "Pesan error detail",
    "errorCode": "KODE_ERROR"
}
```

---

## 1. Authentication
API untuk registrasi dan login.

### [POST] /api/users/generate-api-key
Membuat API Key baru (jika belum ada).

### [PUT] /api/users/regenerate-api-key
Menghapus API Key lama dan membuat yang baru.

**Headers**: `Authorization: Bearer <token>`
**Response Success**:
```json
{
    "success": true,
    "message": "API Key generated successfully",
    "data": {
        "apiKey": "neo_..."
    }
}
```

### [POST] /api/auth/register
Mendaftarkan akun user baru. Role default adalah `USER`.
- **Body**: `{ "email": "...", "username": "...", "password": "...", "name": "..." }`
- **Response**:
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "id": "1b305dd7-43d7-4119-9399-bd917fde5a45",
        "email": "otrvue@gmail.com",
        "username": "otrvue",
        "name": "Administrator",
        "role": "USER",
        "createdAt": "2026-05-23T21:57:32.563Z",
        "updatedAt": "2026-05-23T21:57:32.563Z"
    }
}

### [POST] /api/auth/login
Mendapatkan JWT token. Role akun menentukan akses ke endpoint Admin.
- **Body**: `{ "username": "...", "password": "..." }`
- **Response**: `{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": "96f0ddac-8ade-493b-9470-51f2de0fc9b3",
            "email": "admin@neopay.com",
            "username": "admin",
            "name": "Administrator",
            "role": "ADMIN",
            "createdAt": "2026-05-22T23:41:14.783Z",
            "updatedAt": "2026-05-22T23:41:14.783Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NmYwZGRhYy04YWRlLTQ5M2ItOTQ3MC01MWYyZGUwZmM5YjMiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzk1NzMyNzQsImV4cCI6MTc3OTY1OTY3NH0.omneLljLJuQ9Ub76LHqI1_zpMaAuVMPER_Ei7XcLcsM"
    }
}`

---

## 2. Admin - Dashboard & Stats
Monitoring performa bisnis secara real-time.

### [GET] /api/admin/dashboard/stats
Melihat ringkasan statistik keuangan (Total Volume, Revenue, Profit, Success Rate).
- **Response**:
{
    "success": true,
    "data": {
        "totalVolume": 0,
        "totalRevenue": 0,
        "totalCost": 0,
        "totalProfit": 0,
        "successRate": 0
    }
}

### [GET] /api/admin/dashboard/charts
Melihat grafik penjualan harian.
- **Query Params**: `period` (week / month)
- **Response**:
{
    "success": true,
    "data": {
        "labels": [
            "2026-05-17",
            "2026-05-18",
            "2026-05-19",
            "2026-05-20",
            "2026-05-21",
            "2026-05-22",
            "2026-05-23"
        ],
        "datasets": [
            {
                "label": "Total Volume",
                "data": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                "borderColor": "rgb(75, 192, 192)",
                "backgroundColor": "rgba(75, 192, 192, 0.2)",
                "fill": true
            },
            {
                "label": "Total Revenue",
                "data": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                "borderColor": "rgb(255, 99, 132)",
                "backgroundColor": "rgba(255, 99, 132, 0.2)",
                "fill": true
            },
            {
                "label": "Total Profit",
                "data": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ],
                "borderColor": "rgb(54, 162, 235)",
                "backgroundColor": "rgba(54, 162, 235, 0.2)",
                "fill": true
            }
        ]
    }
}

---

## 3. Admin - Product Management
Pengelolaan inventory produk dari vendor.

### [GET] /api/admin/products
Melihat list seluruh produk dengan paging dan filter.
- **Query Params**: `page`, `limit`, `search` (sku/name), `status` (active/inactive), `categoryId`, `providerId`
- **Response**:
{
    "success": true,
    "data": {
        "total": 6364,
        "page": 1,
        "limit": 20,
        "totalPages": 319,
        "items": [
            {
                "id": "5b32c16d-bc79-46d7-94c1-ebf630645300",
                "sku": "DF-post692303",
                "vendorSku": "post692303",
                "vendor": "DIGIFLAZZ",
                "type": "POSTPAID",
                "name": "by.U Promo",
                "description": "Masukkan Kode Bayar.",
                "basePrice": "500",
                "isActive": true,
                "categoryId": "fd0bc62c-05a3-446a-9be5-2cb06a6940fc",
                "providerId": "bee1dee9-e214-4b12-b85a-c7ae4a4e02cd",
                "createdAt": "2026-05-23T00:27:31.450Z",
                "updatedAt": "2026-05-23T00:27:31.450Z",
                "category": {
                    "id": "fd0bc62c-05a3-446a-9be5-2cb06a6940fc",
                    "name": "PASCABAYAR",
                    "slug": "pascabayar",
                    "createdAt": "2026-05-23T00:17:02.948Z",
                    "updatedAt": "2026-05-23T00:17:02.948Z"
                },
                "provider": {
                    "id": "bee1dee9-e214-4b12-b85a-c7ae4a4e02cd",
                    "name": "by.U",
                    "slug": "by.u",
                    "createdAt": "2026-05-23T00:27:30.179Z",
                    "updatedAt": "2026-05-23T00:27:30.179Z"
                }
            }
        ]
    }
}

### [GET] /api/admin/products/categories
Melihat list kategori produk (untuk dropdown filter).
- **Response**:
{
    "success": true,
    "data": [
        {
            "id": "fd0bc62c-05a3-446a-9be5-2cb06a6940fc",
            "name": "PASCABAYAR",
            "slug": "pascabayar",
            "createdAt": "2026-05-23T00:17:02.948Z",
            "updatedAt": "2026-05-23T00:17:02.948Z"
        }
    ]
}

### [GET] /api/admin/products/providers
Melihat list provider/brand produk (untuk dropdown filter).
- **Response**:
{
    "success": true,
    "data": [
        {
            "id": "bee1dee9-e214-4b12-b85a-c7ae4a4e02cd",
            "name": "by.U",
            "slug": "by.u",
            "createdAt": "2026-05-23T00:27:30.179Z",
            "updatedAt": "2026-05-23T00:27:30.179Z"
        }
    ]
}

### [PATCH] /api/admin/products/:sku
Update status aktif dan deskripsi produk.
- **Body**: `{ "isActive": boolean, "description": "string" }`
- **Response**:
{
    "success": true,
    "message": "Product updated successfully",
    "data": {
        "id": "28f86ba6-206a-44e2-9f42-00c6734ab92c",
        "sku": "DF-MLBB74",
        "vendorSku": "MLBB74",
        "vendor": "DIGIFLAZZ",
        "type": "PREPAID",
        "name": "MOBILELEGEND - 74 Diamond",
        "description": "Updated description",
        "basePrice": "21200",
        "isActive": true,
        "categoryId": "7e561659-6438-4f15-89eb-c8929df8ff0f",
        "providerId": "6a503590-de52-48c6-b72d-ff12f05fe021",
        "createdAt": "2026-05-23T00:27:31.015Z",
        "updatedAt": "2026-05-23T22:02:17.503Z"
    }
}

---

## 4. Admin - PPOB Sync
Sinkronisasi produk dari PPOB Vendor di latar belakang (background).

### [POST] /api/admin/products/sync/digiflazz
Memicu proses sinkronisasi produk DigiFlazz.
- **Response**:
{
    "success": true,
    "message": "DigiFlazz sync started in background"
}

### [POST] /api/admin/products/sync/okeconnect
Memicu proses sinkronisasi produk OkeConnect.
- **Response**:
{
    "success": true,
    "message": "OkeConnect sync started in background"
}

### [GET] /api/admin/products/sync/status/:vendor
Cek progress sinkronisasi yang sedang berjalan.
- **Path Param**: `vendor` (digiflazz / okeconnect)
- **Response**:
{
    "success": true,
    "data": {
        "id": "7087622d-920f-4ec5-b15f-b7f20846fbed",
        "vendor": "DIGIFLAZZ",
        "status": "COMPLETED",
        "totalItems": 54,
        "processedItems": 54,
        "createdCount": 0,
        "updatedCount": 54,
        "errorMessage": null,
        "startTime": "2026-05-23T22:02:51.192Z",
        "endTime": "2026-05-23T22:02:57.496Z",
        "updatedAt": "2026-05-23T22:02:57.497Z"
    }
}

{
    "success": true,
    "data": {
        "id": "4da8326e-44b6-456b-9d4f-e3f0b1b28d03",
        "vendor": "OKECONNECT",
        "status": "RUNNING",
        "totalItems": 7041,
        "processedItems": 1500,
        "createdCount": 0,
        "updatedCount": 0,
        "errorMessage": null,
        "startTime": "2026-05-23T22:04:17.163Z",
        "endTime": null,
        "updatedAt": "2026-05-23T22:04:18.882Z"
    }
}

---

## 5. Admin - Pricing & Promos (Full CRUD)
Konfigurasi markup harga dan promo diskon.

### Markup Pricing (`/api/admin/markups`)
- **[GET] `/`**: List seluruh aturan markup.
{
    "success": true,
    "data": [
        {
            "id": "12de1449-ed6a-4573-b789-bccc7f32b9c6",
            "name": "Markup Global",
            "target": "GLOBAL",
            "type": "FIXED",
            "value": "2000",
            "isActive": true,
            "priority": 1,
            "productId": null,
            "providerId": null,
            "categoryId": null,
            "createdAt": "2026-05-23T22:05:03.459Z",
            "updatedAt": "2026-05-23T22:05:03.459Z",
            "product": null,
            "provider": null,
            "category": null
        }
    ]
}
- **[POST] `/`**: Create markup baru (TARGET: GLOBAL/CATEGORY/PROVIDER/PRODUCT).
{
    "success": true,
    "message": "Markup created",
    "data": {
        "id": "12de1449-ed6a-4573-b789-bccc7f32b9c6",
        "name": "Markup Global",
        "target": "GLOBAL",
        "type": "FIXED",
        "value": "2000",
        "isActive": true,
        "priority": 1,
        "productId": null,
        "providerId": null,
        "categoryId": null,
        "createdAt": "2026-05-23T22:05:03.459Z",
        "updatedAt": "2026-05-23T22:05:03.459Z"
    }
}
- **[PUT] `/:id`**: Update aturan markup.
{
    "success": true,
    "message": "Markup updated",
    "data": {
        "id": "12de1449-ed6a-4573-b789-bccc7f32b9c6",
        "name": "Markup Global",
        "target": "GLOBAL",
        "type": "FIXED",
        "value": "2000",
        "isActive": true,
        "priority": 1,
        "productId": null,
        "providerId": null,
        "categoryId": null,
        "createdAt": "2026-05-23T22:05:03.459Z",
        "updatedAt": "2026-05-23T22:05:03.459Z"
    }
}
- **[DELETE] `/:id`**: Hapus aturan markup.
{
    "success": true,
    "message": "Markup deleted"
}

### Promo Management (`/api/admin/promos`)
- **[GET] `/`**: List promo aktif/cadangan.
{
    "success": true,
    "data": [
        {
            "id": "12de1449-ed6a-4573-b789-bccc7f32b9c6",
            "name": "Markup Global",
            "target": "GLOBAL",
            "type": "FIXED",
            "value": "2000",
            "isActive": true,
            "priority": 1,
            "productId": null,
            "providerId": null,
            "categoryId": null,
            "createdAt": "2026-05-23T22:05:03.459Z",
            "updatedAt": "2026-05-23T22:05:03.459Z"
        }
    ]
}
- **[POST] `/`**: Buat promo baru (Fixed/Percentage discount).
{
    "success": true,
    "message": "Promo created",
    "data": {
        "id": "12de1449-ed6a-4573-b789-bccc7f32b9c6",
        "name": "Promo Global",
        "target": "GLOBAL",
        "type": "FIXED",
        "value": "2000",
        "isActive": true,
        "priority": 1,
        "productId": null,
        "providerId": null,
        "categoryId": null,
        "createdAt": "2026-05-23T22:05:03.459Z",
        "updatedAt": "2026-05-23T22:05:03.459Z"
    }
}
- **[PUT] `/:id`**: Update data promo.
- **[DELETE] `/:id`**: Hapus promo.

---

## 6. Admin - Balance & Vendor Management

### [GET] /api/admin/balances/vendors
Melihat saldo terakhir vendor yang tercatat di database kita.
{
    "success": true,
    "data": [
        {
            "id": "23eeecb3-0280-4b47-af67-59017bd78ee7",
            "vendor": "OKECONNECT",
            "balance": "14342",
            "lastChecked": "2026-05-24T00:30:45.833Z",
            "updatedAt": "2026-05-24T00:30:45.833Z"
        },
        {
            "id": "be6b195c-cf67-49b1-a94d-3265b71f9911",
            "vendor": "DIGIFLAZZ",
            "balance": "8086",
            "lastChecked": "2026-05-24T00:23:44.395Z",
            "updatedAt": "2026-05-24T00:30:45.831Z"
        }
    ]
}


### [POST] /api/admin/balances/vendors/sync
Memicu penarikan data saldo real-time langsung dari API DigiFlazz & OkeConnect.
- **Response**:
{
    "success": true,
    "message": "Vendor balances synced successfully",
    "data": {
        "balances": [
            {
                "id": "22efb72f-df25-44d6-8c15-885028868805",
                "vendor": "DIGIFLAZZ",
                "balance": "8086",
                "lastChecked": "2026-05-23T22:39:14.985Z",
                "updatedAt": "2026-05-23T22:53:46.647Z"
            },
            {
                "id": "9b846f0a-7e00-4ef5-b97a-759f97b7ffdd",
                "vendor": "OKECONNECT",
                "balance": "0",
                "lastChecked": "2026-05-23T22:44:00.806Z",
                "updatedAt": "2026-05-23T22:50:21.702Z"
            }
        ],
        "errors": {
            "OKECONNECT": "R# . GAGAL. IP tidak sesuai @125.163.138.172" // null if success
        }
    }
}

---

## 7. Admin - Transaction Supervision

### [GET] /api/admin/transactions
Monitor seluruh transaksi sistem dengan paging dan filter.
- **Query Params**: `page`, `limit`, `search` (customerNo), `status` (PENDING/SUCCESS/FAILED)
{
    "success": true,
    "data": {
        "total": 2,
        "page": 1,
        "limit": 20,
        "totalPages": 1,
        "items": [
            {
                "id": "7ae8121e-a66f-4de6-9a63-05ddf3cbdd95",
                "userId": "06860921-df2b-49a5-9feb-1cdbeac5aa45",
                "productId": "df7fc855-f154-4d78-9acc-ce31195e8be8",
                "customerNo": "085194550304",
                "basePrice": "1038",
                "markupPrice": "500",
                "promoDiscount": "0",
                "totalPrice": "1538",
                "status": "SUCCESS",
                "sn": " DNID ACHXXX RAMXXXXX/1000/2026052410121481030100166575523292887",
                "vendorTrxId": "1216408511",
                "notes": "T#1216408511 R#7ae8121e-a66f-4de6-9a63-05ddf3cbdd95 Dana 1.000 D1.085194550304 SUKSES. SN: DNID ACHXXX RAMXXXXX/1000/2026052410121481030100166575523292887. Saldo 14.342 - 1.038 = 13.304 @24/05 07:31",
                "createdAt": "2026-05-24T00:31:44.665Z",
                "updatedAt": "2026-05-24T00:31:46.437Z",
                "user": {
                    "username": "otrvue",
                    "name": "Administrator"
                },
                "product": {
                    "id": "df7fc855-f154-4d78-9acc-ce31195e8be8",
                    "sku": "OK-D1",
                    "vendorSku": "D1",
                    "vendor": "OKECONNECT",
                    "type": "PREPAID",
                    "name": "Dana 1.000",
                    "description": "Top Up Saldo DANA",
                    "basePrice": "1038",
                    "isActive": true,
                    "categoryId": "52d9bada-fd50-4958-9a27-00a595c94e22",
                    "providerId": "a9a92188-5c51-4764-9b4e-6f3031433d33",
                    "createdAt": "2026-05-23T23:51:09.255Z",
                    "updatedAt": "2026-05-23T23:51:09.255Z",
                    "category": {
                        "id": "52d9bada-fd50-4958-9a27-00a595c94e22",
                        "name": "DOMPET DIGITAL",
                        "slug": "dompet-digital",
                        "createdAt": "2026-05-23T23:49:12.520Z",
                        "updatedAt": "2026-05-23T23:49:12.520Z"
                    },
                    "provider": {
                        "id": "a9a92188-5c51-4764-9b4e-6f3031433d33",
                        "name": "Top Up Saldo DANA",
                        "slug": "top-up-saldo-dana",
                        "createdAt": "2026-05-23T23:49:19.284Z",
                        "updatedAt": "2026-05-23T23:49:19.284Z"
                    }
                }
            },
            {
                "id": "9add971d-9401-4348-abb4-8091cd3919ea",
                "userId": "06860921-df2b-49a5-9feb-1cdbeac5aa45",
                "productId": "df7fc855-f154-4d78-9acc-ce31195e8be8",
                "customerNo": "085194550304",
                "basePrice": "1038",
                "markupPrice": "500",
                "promoDiscount": "0",
                "totalPrice": "1538",
                "status": "REFUNDED",
                "sn": null,
                "vendorTrxId": null,
                "notes": "Vendor Error: R#9add971d-9401-4348-abb4-8091cd3919ea D1.085194550304 GAGAL. IP tidak sesuai @125.163.136.19",
                "createdAt": "2026-05-24T00:22:59.458Z",
                "updatedAt": "2026-05-24T00:22:59.927Z",
                "user": {
                    "username": "otrvue",
                    "name": "Administrator"
                },
                "product": {
                    "id": "df7fc855-f154-4d78-9acc-ce31195e8be8",
                    "sku": "OK-D1",
                    "vendorSku": "D1",
                    "vendor": "OKECONNECT",
                    "type": "PREPAID",
                    "name": "Dana 1.000",
                    "description": "Top Up Saldo DANA",
                    "basePrice": "1038",
                    "isActive": true,
                    "categoryId": "52d9bada-fd50-4958-9a27-00a595c94e22",
                    "providerId": "a9a92188-5c51-4764-9b4e-6f3031433d33",
                    "createdAt": "2026-05-23T23:51:09.255Z",
                    "updatedAt": "2026-05-23T23:51:09.255Z",
                    "category": {
                        "id": "52d9bada-fd50-4958-9a27-00a595c94e22",
                        "name": "DOMPET DIGITAL",
                        "slug": "dompet-digital",
                        "createdAt": "2026-05-23T23:49:12.520Z",
                        "updatedAt": "2026-05-23T23:49:12.520Z"
                    },
                    "provider": {
                        "id": "a9a92188-5c51-4764-9b4e-6f3031433d33",
                        "name": "Top Up Saldo DANA",
                        "slug": "top-up-saldo-dana",
                        "createdAt": "2026-05-23T23:49:19.284Z",
                        "updatedAt": "2026-05-23T23:49:19.284Z"
                    }
                }
            }
        ]
    }
}
    
---

## 8. Client Side - Transactions

### [GET] /api/trx/products
Melihat list produk aktif dengan harga jual final (`sellingPrice`) yang sudah diproses oleh Pricing Engine.
response:
{
    "success": true,
    "data": [
        {
            "id": "00034e9d-5746-4b65-a363-af8001583fbc",
            "sku": "OK-MLSC",
            "vendorSku": "MLSC",
            "vendor": "OKECONNECT",
            "type": "PREPAID",
            "name": "Starlight Member Plus",
            "description": "TPG Diamond Mobile Legends",
            "basePrice": "190000",
            "isActive": true,
            "categoryId": "35a17e69-5bd0-4563-8fb7-f6ab403822c8",
            "providerId": "c762ebe0-629f-4f98-a1bd-3dab6be29aba",
            "createdAt": "2026-05-23T23:50:53.464Z",
            "updatedAt": "2026-05-23T23:50:53.464Z",
            "category": {
                "id": "35a17e69-5bd0-4563-8fb7-f6ab403822c8",
                "name": "DIGITAL",
                "slug": "digital",
                "createdAt": "2026-05-23T23:49:11.519Z",
                "updatedAt": "2026-05-23T23:49:11.519Z"
            },
            "provider": {
                "id": "c762ebe0-629f-4f98-a1bd-3dab6be29aba",
                "name": "TPG Diamond Mobile Legends",
                "slug": "tpg-diamond-mobile-legends",
                "createdAt": "2026-05-23T23:49:22.611Z",
                "updatedAt": "2026-05-23T23:49:22.611Z"
            },
            "sellingPrice": 190000
        }
    ]
}

### [PUT] /api/users/callback-url
Mengatur URL untuk menerima notifikasi otomatis (outbound callback) saat transaksi sukses/gagal.
- **Body**: `{ "callbackUrl": "https://your-server.com/callback" }`

---

## 8. Client Side - Transactions

### [GET] /api/trx/status/:id
Melihat status transaksi spesifik berdasarkan ID internal.
- **Path Param**: `id` (Transaction ID)
- **Response**:
```json
{
    "success": true,
    "data": {
        "id": "uuid-transaksi",
        "status": "SUCCESS",
        "sn": "SN123456",
        "notes": "Success",
        "updatedAt": "2026-05-25T..."
    }
}
```

---

## 9. Outbound Callback (Notifikasi ke Server Partner)
Sistem NEOPAY akan mengirimkan `POST` request ke `callbackUrl` Anda saat status transaksi berubah menjadi `SUCCESS` atau `FAILED`.

- **Method**: `POST`
- **Payload**:
```json
{
    "id": "uuid-transaksi",
    "productId": "...",
    "sku": "INTERNAL-SKU",
    "customerNo": "08123456789",
    "status": "SUCCESS",
    "sn": "SN123456",
    "notes": "Pesanan Berhasil",
    "totalPrice": 15000,
    "createdAt": "...",
    "updatedAt": "..."
}
```

### [GET] /api/trx/history
Riwayat transaksi pribadi user yang login.
{
    "success": true,
    "data": [
        {
            "id": "7ae8121e-a66f-4de6-9a63-05ddf3cbdd95",
            "userId": "06860921-df2b-49a5-9feb-1cdbeac5aa45",
            "productId": "df7fc855-f154-4d78-9acc-ce31195e8be8",
            "customerNo": "085194550304",
            "basePrice": "1038",
            "markupPrice": "500",
            "promoDiscount": "0",
            "totalPrice": "1538",
            "status": "SUCCESS",
            "sn": " DNID ACHXXX RAMXXXXX/1000/2026052410121481030100166575523292887",
            "vendorTrxId": "1216408511",
            "notes": "T#1216408511 R#7ae8121e-a66f-4de6-9a63-05ddf3cbdd95 Dana 1.000 D1.085194550304 SUKSES. SN: DNID ACHXXX RAMXXXXX/1000/2026052410121481030100166575523292887. Saldo 14.342 - 1.038 = 13.304 @24/05 07:31",
            "createdAt": "2026-05-24T00:31:44.665Z",
            "updatedAt": "2026-05-24T00:31:46.437Z",
            "product": {
                "id": "df7fc855-f154-4d78-9acc-ce31195e8be8",
                "sku": "OK-D1",
                "vendorSku": "D1",
                "vendor": "OKECONNECT",
                "type": "PREPAID",
                "name": "Dana 1.000",
                "description": "Top Up Saldo DANA",
                "basePrice": "1038",
                "isActive": true,
                "categoryId": "52d9bada-fd50-4958-9a27-00a595c94e22",
                "providerId": "a9a92188-5c51-4764-9b4e-6f3031433d33",
                "createdAt": "2026-05-23T23:51:09.255Z",
                "updatedAt": "2026-05-23T23:51:09.255Z"
            }
        },
        {
            "id": "9add971d-9401-4348-abb4-8091cd3919ea",
            "userId": "06860921-df2b-49a5-9feb-1cdbeac5aa45",
            "productId": "df7fc855-f154-4d78-9acc-ce31195e8be8",
            "customerNo": "085194550304",
            "basePrice": "1038",
            "markupPrice": "500",
            "promoDiscount": "0",
            "totalPrice": "1538",
            "status": "REFUNDED",
            "sn": null,
            "vendorTrxId": null,
            "notes": "Vendor Error: R#9add971d-9401-4348-abb4-8091cd3919ea D1.085194550304 GAGAL. IP tidak sesuai @125.163.136.19",
            "createdAt": "2026-05-24T00:22:59.458Z",
            "updatedAt": "2026-05-24T00:22:59.927Z",
            "product": {
                "id": "df7fc855-f154-4d78-9acc-ce31195e8be8",
                "sku": "OK-D1",
                "vendorSku": "D1",
                "vendor": "OKECONNECT",
                "type": "PREPAID",
                "name": "Dana 1.000",
                "description": "Top Up Saldo DANA",
                "basePrice": "1038",
                "isActive": true,
                "categoryId": "52d9bada-fd50-4958-9a27-00a595c94e22",
                "providerId": "a9a92188-5c51-4764-9b4e-6f3031433d33",
                "createdAt": "2026-05-23T23:51:09.255Z",
                "updatedAt": "2026-05-23T23:51:09.255Z"
            }
        }
    ]
}
---
