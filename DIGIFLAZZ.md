# 📘 Digiflazz API Documentation

Dokumentasi ini digunakan untuk integrasi API Digiflazz (Prepaid & Postpaid), mencakup:

* Cek Saldo
* Price List (Prepaid & Pascabayar)
* Transaksi Prepaid
* Transaksi Pascabayar (Inquiry & Payment)
* Status Transaksi
* Webhook
* Response Code Reference

---

# 🔐 Authentication & Signature

Semua request membutuhkan:

* `username`
* `apiKey`
* `sign`

## 📌 Formula Signature

**Cek Saldo**

```
MD5(username + apiKey + "depo")
```

**Transaksi / Inquiry / Status**

```
MD5(username + apiKey + ref_id)
```

---

# 💰 1. Cek Saldo

## Endpoint

```
POST https://api.digiflazz.com/v1/cek-saldo
```

## Request

```json
{
  "cmd": "deposit",
  "username": "your_username",
  "sign": "md5(username + apiKey + 'depo')"
}
```

## Response

```json
{
  "data": {
    "username": "your_username",
    "deposit": 1500000
  }
}
```

---

# 📦 2. Price List

## 2.1 Prepaid

### Endpoint

```
POST https://api.digiflazz.com/v1/price-list
```

### Request

```json
{
  "cmd": "prepaid",
  "username": "username",
  "sign": "SIGNATURE"
}
```

### Response

```json
{
  "data": [
    {
      "product_name": "Xl 100.000",
      "category": "Pulsa",
      "brand": "XL",
      "type": "Umum",
      "seller_name": "PT. ABC",
      "price": 98000,
      "buyer_sku_code": "X100",
      "buyer_product_status": true,
      "seller_product_status": true,
      "unlimited_stock": true,
      "stock": 0,
      "multi": true,
      "start_cut_off": "23:45",
      "end_cut_off": "00:15",
      "desc": "Pulsa Xl Rp 100.000"
    }
  ]
}
```

---

## 2.2 Postpaid

### Request

```json
{
  "cmd": "pasca",
  "username": "username",
  "sign": "SIGNATURE"
}
```

### Response

```json
{
  "data": [
    {
      "product_name": "Pln Postpaid",
      "category": "Pascabayar",
      "brand": "PLN",
      "seller_name": "PT. ABC",
      "admin": 2750,
      "commission": 1800,
      "buyer_sku_code": "pln",
      "buyer_product_status": true,
      "seller_product_status": true,
      "desc": "-"
    }
  ]
}
```

---

# ⚡ 3. Transaksi Prepaid

## Endpoint

```
POST https://api.digiflazz.com/v1/transaction
```

## Request

```json
{
  "username": "username",
  "buyer_sku_code": "xld25",
  "customer_no": "087800001233",
  "ref_id": "unique-id",
  "sign": "SIGNATURE",
  "cb_url": "https://your-callback.com"
}
```

## Response

```json
{
  "data": {
    "ref_id": "unique-id",
    "customer_no": "087800001233",
    "buyer_sku_code": "xld25",
    "message": "Transaksi Pending",
    "status": "Pending",
    "rc": "03",
    "sn": "",
    "buyer_last_saldo": 100000,
    "price": 25000
  }
}
```

---

# 🧾 4. Transaksi Postpaid

## 4.1 Inquiry

```json
{
  "commands": "inq-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000003",
  "ref_id": "unique-id",
  "sign": "SIGNATURE"
}
```

## Response

```json
{
  "data": {
    "ref_id": "unique-id",
    "customer_name": "Nama Pelanggan",
    "status": "Sukses",
    "rc": "00",
    "price": 10000,
    "selling_price": 11000,
    "desc": {
      "tarif": "R1",
      "daya": 1300
    }
  }
}
```

---

## 4.2 Payment

```json
{
  "commands": "pay-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000003",
  "ref_id": "unique-id",
  "sign": "SIGNATURE"
}
```

## Response

```json
{
  "data": {
    "ref_id": "unique-id",
    "status": "Sukses",
    "rc": "00",
    "sn": "S12345"
  }
}
```

---

## 4.3 Status

```json
{
  "commands": "status-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000003",
  "ref_id": "unique-id",
  "sign": "SIGNATURE"
}
```

---

# 📊 5. Response Code

| RC | Message           | Status  |
| -- | ----------------- | ------- |
| 00 | Sukses            | Success |
| 01 | Timeout           | Failed  |
| 02 | Gagal             | Failed  |
| 03 | Pending           | Pending |
| 40 | Payload Error     | Failed  |
| 41 | Signature Invalid | Failed  |
| 44 | Saldo tidak cukup | Failed  |
| 49 | Ref ID duplicate  | Failed  |
| 58 | Cut Off           | Failed  |

---

# 🔔 6. Webhook

## Headers

* X-Digiflazz-Event
* X-Hub-Signature
* User-Agent

---

## Prepaid Webhook

```json
{
  "data": {
    "ref_id": "30467470",
    "status": "Sukses",
    "rc": "00",
    "sn": "SEPTI..."
  }
}
```

---

## Postpaid Webhook

```json
{
  "data": {
    "ref_id": "1763103975",
    "status": "Sukses",
    "rc": "00",
    "sn": "004212C9..."
  }
}
```

---

# ⚠️ Catatan Penting

* ref_id harus unik
* jangan retry < 1 menit
* transaksi > 90 hari tidak bisa dicek
* webhook wajib idempotent
