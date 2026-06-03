# Agent Memory - 2026-06-04

## Ringkasan pekerjaan hari ini

Fokus utama hari ini ada di refactor flow **pascabayar unified** pada project `goberin`, khususnya agar frontend tidak perlu tahu provider dan semua provider punya response utama yang seragam.

Area yang dikerjakan:

* modul baru `src/modules/transaction/pascabayar`
* endpoint unified:
  * `POST /api/trx/pascabayar/inquiry`
  * `POST /api/trx/pascabayar/check`
  * `POST /api/trx/pascabayar/payment`
* dokumentasi API pascabayar
* callback handling agar support flow pascabayar baru

---

## Hal penting yang sudah diputuskan

### 1. Flow unified pascabayar

Flow baru yang dipakai:

* `inquiry` masih pakai:
  * `customerNo`
  * `sku`
  * `referenceId`
* `check` sekarang pakai:
  * `transactionId`
* `payment` sekarang pakai:
  * `transactionId`

Tujuannya supaya frontend tidak perlu kirim ulang `vendor`, `vendorSku`, `sku`, atau `customerNo` setelah inquiry.

---

### 2. Metadata transaction

Kolom baru di DB aktif sudah ditambahkan:

* `transactions.metadata` (`JSON`)

Kolom ini dipakai untuk menyimpan state unified pascabayar seperti:

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

Catatan: perubahan ini dilakukan langsung ke DB lokal aktif dengan `ALTER TABLE transactions ADD COLUMN metadata JSON NULL AFTER notes`.

---

### 3. Pricing / fee / markup

Sudah dibuat helper terpusat di:

* `src/modules/transaction/pascabayar/pascabayar.pricing.js`

Helper penting:

* `calculateMarkup(baseAmount, markupType, markupValue)`
* `calculatePascabayarPricing(...)`
* `applyPricingToCheckData(...)`

Tujuan:

* menghindari duplikasi logic markup
* memastikan `totalAmount` ke frontend sudah final
* mendukung `FIXED` dan `PERCENTAGE`

---

### 4. Response frontend diseragamkan

Response utama ke frontend untuk pascabayar sedang diarahkan ke shape seragam seperti:

```json
{
  "billStatus": "PENDING",
  "customerName": "...",
  "billAmount": 0,
  "adminFee": 0,
  "totalAmount": 0,
  "tarif": "...",
  "lembar_tagihan": 0,
  "alamat": "...",
  "detail": [],
  "notes": "T#..."
}
```

Helper yang dipakai:

* `buildFrontendBillData(...)` di `src/modules/transaction/pascabayar/pascabayar.mapper.js`

Catatan penting:

* `error` **tidak boleh tampil** untuk kasus `DUPLICATE_REFERENCE_ID`
* `error` hanya muncul untuk error nyata seperti invalid product / provider error / transaction not found

---

### 5. Duplicate referenceId

Sudah ditambahkan handling untuk inquiry duplicate `referenceId`.

Behavior saat ini:

* lookup transaksi terbaru by `referenceId` (`createdAt DESC`)
* jika ketemu, provider tidak dipanggil lagi
* response return:
  * `status = DUPLICATE_REFERENCE_ID`
  * `transactionId`
  * `inquiryId`
  * `data` dari transaction existing

Lookup ada di:

* `findLatestByReferenceId(referenceId)`
  * file: `src/modules/transaction/pascabayar/pascabayar.repository.js`

---

### 6. Notes unified pascabayar

Sudah dibuat formatter notes terpusat di:

* `src/modules/transaction/pascabayar/pascabayar.notes.js`

Format notes yang sekarang dipakai untuk flow unified pascabayar:

```text
T#<transaction.id> R#<transaction.vendorTrxId> <product.name> <product.sku>.<customerNo> <Status> Ket:<message> @<dd/mm HH:mm>. Saldo <balance>
```

Contoh target:

```text
T#NEO124545421 R#TRX-12155 Cek pdam palembang CPM225.123456789 Pending Ket: transaksi sedang di proses biller @02/06 21:52. Saldo 6.500
```

Notes ini diterapkan ke flow unified pascabayar agar tidak mengganggu flow legacy/live lain.

---

## Provider-specific notes

### DIGIFLAZZ

Issue yang ditemukan:

* payment bisa kena error `ERR-R204: Data belum ada`

Penyebab yang didiagnosa:

* `pay-pasca` kemungkinan dikirim dengan `ref_id` berbeda dari `inq-pasca`

Patch yang sudah dibuat:

* untuk `DIGIFLAZZ`, payment sekarang memakai:
  * `metadata.providerInquiryId || metadata.providerRefId || transaction.vendorTrxId || transaction.id`

Tujuan:

* memastikan payment menggunakan ref inquiry yang sudah dikenal Digiflazz

Masih perlu diverifikasi live terhadap provider.

---

### OKECONNECT

Issue yang ditemukan:

* error DB:
  * `Data truncated for column 'status' at row 1`

Penyebab:

* kolom `transactions.status` adalah enum:
  * `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`, `NOT_FOUND`
* service sempat mencoba menulis status API seperti:
  * `PROVIDER_ERROR`
  * `DUPLICATE_REFERENCE_ID`

Patch yang sudah dibuat:

* helper `toTransactionStatus(status)` di `src/modules/transaction/pascabayar/pascabayar.service.js`
* mapping write ke DB sekarang dibatasi jadi enum valid saja

Rule saat ini:

* `SUCCESS` -> `SUCCESS`
* `FAILED` -> `FAILED`
* `NOT_FOUND` -> `NOT_FOUND`
* selain itu -> `PENDING`

---

## Callback handling

File yang disentuh:

* `src/modules/callback/service.js`

Tujuan perubahan:

* callback provider bisa menemukan transaction unified baru tidak hanya dari `transactions.id`
* fallback lookup by metadata:
  * `providerRefId`
  * `providerPaymentRefId`
* callback bisa update metadata unified pascabayar tanpa merusak flow legacy

Ada helper tambahan di callback service untuk:

* load transaction by provider ref
* detect apakah transaction termasuk `PASCABAYAR_UNIFIED`
* update metadata inquiry/payment unified

---

## File penting yang dibuat / diubah

### Baru / utama

* `src/modules/transaction/pascabayar/index.js`
* `src/modules/transaction/pascabayar/pascabayar.service.js`
* `src/modules/transaction/pascabayar/pascabayar.mapper.js`
* `src/modules/transaction/pascabayar/pascabayar.validator.js`
* `src/modules/transaction/pascabayar/pascabayar.pricing.js`
* `src/modules/transaction/pascabayar/pascabayar.repository.js`
* `src/modules/transaction/pascabayar/pascabayar.notes.js`
* `src/modules/transaction/pascabayar/providers/digiflazz.pascabayar.provider.js`
* `src/modules/transaction/pascabayar/providers/okeconnect.pascabayar.provider.js`
* `src/modules/transaction/pascabayar/providers/h2h.pascabayar.provider.js`
* `docs/api-pascabayar.md`

### Diubah

* `src/modules/transaction/controller.js`
* `src/modules/transaction/route.js`
* `src/modules/callback/service.js`
* `src/integrations/digiflazz/index.js`
* `src/integrations/okeconnect/index.js`

---

## Status saat handoff

Yang sudah diverifikasi:

* import/runtime parse untuk beberapa modul utama: lolos
* `transactions.metadata` sudah ada di DB aktif
* invalid product path bisa return unified response
* duplicate referenceId path sudah diarahakan ke existing transaction

Yang **belum tuntas diverifikasi end-to-end**:

1. response duplicate reference yang di-run user masih menunjukkan bentuk lama (`success: false`, masih ada `error`, `data.detail` masih object nested), artinya:
   * bisa jadi user menjalankan code/branch/path yang belum sinkron dengan patch terakhir
   * perlu dites ulang di runtime endpoint aktual
2. patch Digiflazz payment ref sudah dilakukan, tapi belum diuji live
3. callback OKECONNECT/H2H untuk flow unified belum diuji penuh dari inquiry -> callback -> check -> payment
4. notes format perlu dicek live apakah sudah exactly seperti target user, terutama spasi dan kapitalisasi message

---

## Dugaan gap yang perlu dicek agent berikutnya

1. **Kemungkinan response lama masih keluar karena server belum restart** atau user berada di repo/path yang berbeda.
2. **Service response vs DB notes** bisa berbeda timing-nya; perlu cek endpoint real setelah restart server.
3. **`docs/response.md`** muncul sebagai file untracked di worktree, tetapi tidak jelas apakah itu bagian task atau catatan user. Belum disentuh di tahap akhir.

---

## Rekomendasi kerja agent berikutnya

1. Restart server lokal terlebih dahulu.
2. Test ulang endpoint ini dengan sample nyata:
   * inquiry baru
   * inquiry duplicate dengan `referenceId` sama
   * check dengan `transactionId`
   * payment Digiflazz dengan hasil inquiry existing
3. Verifikasi response duplicate sudah menjadi:
   * `success: true`
   * tanpa `error`
   * `data.billStatus`
   * `data.notes`
4. Verifikasi payment Digiflazz tidak lagi kena `ERR-R204`.
5. Verifikasi OKECONNECT inquiry tidak lagi memicu error enum `status` di DB.
6. Kalau response masih belum seragam, audit kemungkinan ada path legacy yang masih terpakai.

