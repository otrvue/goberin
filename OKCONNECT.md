# OkeConnect H2H API Documentation

# Base URL

```text
https://h2h.okeconnect.com
```

> Penting:
> Hampir seluruh response OkeConnect menggunakan Plain Text (STRING), bukan JSON.
> Jangan menggunakan JSON.parse().
> Gunakan regex atau string parser.

---

# Authentication

Parameter yang digunakan:

| Parameter | Keterangan |
|------------|------------|
| memberID | ID member OkeConnect |
| pin | PIN transaksi |
| password | Password API |

---

# Cek Saldo

Request:

```text
GET /trx/balance?memberID=OKXXXXX&pin=1234&password=password
```

Response:

```text
Saldo 284.939
```

Parsing:

```js
function parseBalance(response){

const match=response.match(
/Saldo\s([\d\.]+)/
)

return {
balance:match?.[1]
?.replace(/\./g,"")
}

}

```

Output:

```js
{
 balance:284939
}
```

---

# Transaksi Global

Request:

```text
GET /trx?product=T1&dest=089660522887&refID=113&memberID=OKXXXXX&pin=1234&password=password
```

Response Pending:

```text
T#210286229 R#113 Three 1.000 T1.089660522887 akan diproses. Saldo 279.655 - 1.321 = 278.334 @19:08
```

Parsing:

```js
function parseTransaction(response){

return{

trxId:
response.match(
/T#(\d+)/
)?.[1],

refId:
response.match(
/R#(\d+)/
)?.[1],

status:
response.includes(
"akan diproses"
)
?
"PENDING"
:
"UNKNOWN"

}

}
```

Output:

```js
{
 trxId:"210286229",
 refId:"113",
 status:"PENDING"
}
```

---

# Transaksi Open Denom

Request:

```text
GET /trx?pin=1234&product=BBSDN&dest=085736044280&qty=12345&refID=7777&memberID=OKXXXXX&password=password
```

Response:

```text
T#762261897 R#7777 H2H DANA Topup (Bebas Nominal) BBSDN.085736044280 , QTY : 12345 akan diproses. Saldo 43.928.256 - 12.516 = 43.915.740 @19:14
```

Parsing:

```js
const qty=
response.match(
/QTY\s:\s(\d+)/
)?.[1]
```

Output:

```js
{
qty:12345
}
```

---

# Callback

Method:

```text
GET
```

Format:

```text
{callback_url}?refid=114&message=encoded_message
```

---

## Callback sukses

Response:

```text
T#210288912 R#114 Three 1.000 T1.089660522887 SUKSES. SN:R230512.1911.2100F1. Saldo 278.334 - 1.321 = 277.013
```

---

## Callback gagal

Response:

```text
T#41169572 R#1235 Telkomsel 5.000 S5.082280004280 GAGAL. Nomor tujuan salah.
```

Parsing callback:

```js
function parseCallback(message){

const decoded=
decodeURIComponent(
message
)

const status=
decoded.includes(
"SUKSES"
)
?
"SUCCESS"
:
decoded.includes(
"GAGAL"
)
?
"FAILED"
:
"PENDING"

const serialNumber=
decoded.match(
/SN:(.+?)\./
)?.[1]

return{

status,
serialNumber

}

}
```

Output sukses:

```js
{
 status:"SUCCESS",
 serialNumber:
"R230512.1911.2100F1"
}
```

---

# Cek Status

Request:

```text
GET /trx?pin=1234&product=T5&dest=08980204060&refID=999&memberID=OKXXXXX&password=password&check=1
```

---

## No Data

```text
TIDAK ADA transaksi Tujuan 08980204060 pada tgl 22/04/2025.
```

---

## Success

```text
R#999 Three 5.000 T5.08980204060 sudah pernah jam 18:46, status Sukses. SN:R25042218462100b7
```

---

## Failed

```text
R#999 Three 5.000 T5.08980204060 sudah pernah jam 18:46, status Gagal
```

---

## Pending

```text
Mhn tunggu trx sblmnya selesai: T#762221212 R#999 T5.08980204060 status Menunggu Jawaban
```

Parsing:

```js
function parseStatus(response){

if(
response.includes(
"Sukses"
)
){

return "SUCCESS"

}

if(
response.includes(
"Gagal"
)
){

return "FAILED"

}

if(
response.includes(
"Menunggu"
)
){

return "PENDING"

}

if(
response.includes(
"TIDAK ADA"
)
){

return "NOT_FOUND"

}

return "UNKNOWN"

}
```

---

# Daftar Harga

Request:

```text
https://www.okeconnect.com/harga/json?id=YOUR_ID
```

Response:

```json
[
{
"kode":"CHOME",
"keterangan":"Cek Tagihan Home Credit",
"produk":"Cicilan Home Credit",
"kategori":"FINANCE",
"harga":"0",
"status":"1"
},
{
"kode":"BHOME",
"keterangan":"Bayar Tagihan Home Credit",
"produk":"Cicilan Home Credit",
"kategori":"FINANCE",
"harga":"-1600",
"status":"1"
}
]
```

Rules:

| Kondisi | Tipe |
|-----------|------|
| status=1 | ACTIVE |
| status=0 | INACTIVE |
| harga < 0 | POSTPAID |
| harga=0 + mengandung "Cek" | INQUIRY |

Parsing:

```js
function parsePriceList(data){

return data.map(item=>({

code:item.kode,

active:
item.status==="1",

isPostpaid:
Number(
item.harga
)<0,

isInquiry:
item.harga==="0"
&&
item.keterangan.includes(
"Cek"
),

price:
Math.abs(
Number(
item.harga
)
)

}))

}
```

Output:

```js
[
{
code:"BHOME",
active:true,
isPostpaid:true,
isInquiry:false,
price:1600
}
]
```

---

# Flow Pascabayar

1. Inquiry produk terlebih dahulu

2. Simpan hasil inquiry

3. User konfirmasi pembayaran

4. Lanjut transaksi pembayaran

5. Tunggu callback

6. Update status transaksi

---

# Internal Status Mapping

| OkeConnect | Internal |
|------------|----------|
| SUKSES | SUCCESS |
| GAGAL | FAILED |
| akan diproses | PENDING |
| Menunggu Jawaban | PENDING |
| TIDAK ADA | NOT_FOUND |
