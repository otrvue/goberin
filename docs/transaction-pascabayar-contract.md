Kamu adalah senior backend engineer Node.js + Express.

Tugas utama: refactor dan buat service khusus transaksi pascabayar di project:

`/home/aiden/Proyek/codex/goberin`

Target folder baru:

`src/modules/transaction/pascabayar`

## Wajib dibaca dulu

Sebelum coding, baca dan ringkas konteks dari file berikut:

* `AGENTS.md`, `CODEX.md`, atau file instruksi lain jika ada
* File di `src/modules/transaction` yang memiliki comment:

  * `// TODO: move to other file`
* Provider docs:

  * `DIGIFLAZZ.md`
  * `OKCONNECT.md`
  * `H2H-id.md`

Jangan scan workspace berlebihan. Gunakan search terbatas dan relevan saja.

## Tujuan

Pisahkan logic transaksi pascabayar dari prabayar karena flow-nya berbeda.

Buat service pascabayar unified yang mendukung 3 provider:

* `DIGIFLAZZ`
* `OKECONNECT`
* `H2H`

Semua service pascabayar harus berada di:

`src/modules/transaction/pascabayar`

## Product validation wajib

Setiap request wajib lookup product dari database `products` menggunakan `sku`.

Field product yang wajib digunakan/validasi:

* `sku`
* `vendorSku`
* `vendor`
* `type`

Rules:

* `product.sku` harus sama dengan payload `sku`
* `product.vendorSku` wajib ada
* `product.vendor` hanya boleh:

  * `DIGIFLAZZ`
  * `OKECONNECT`
  * `H2H`
* `product.type` wajib `POSTPAID`
* Jika product tidak ditemukan / bukan POSTPAID / vendor tidak valid, return error response unified dan jangan panggil provider

## Public API service

Buat 1 service utama, contoh nama bebas tapi jelas, misalnya:

`PascabayarTransactionService`

Dengan method:

```ts
PascabayarTransactionService.inquiry({
  customerNo: "123456789",
  sku: "SK123",
  referenceId: "TRX-123456789",
  ...optional
})

PascabayarTransactionService.payment({
  customerNo: "123456789",
  sku: "SK123",
  referenceId: "TRX-123456789",
  ...optional
})

PascabayarTransactionService.check({
  customerNo: "123456789",
  sku: "SK123",
  referenceId: "TRX-123456789",
  ...optional
})
```

## Payload contract

Buat DTO/type request unified:

```ts
type PascabayarBaseRequest = {
  customerNo: string;
  sku: string;
  referenceId: string;

  // optional provider-specific metadata
  amount?: number;
  adminFee?: number;
  buyerSkuCode?: string;
  customerName?: string;
  phone?: string;
  raw?: unknown;
  metadata?: Record<string, unknown>;
};
```

Catatan:

* `customerNo`, `sku`, dan `referenceId` wajib
* Normalisasi `customerNo` jadi string
* Jangan pakai `vendorSku` dari payload frontend
* `vendorSku` harus selalu diambil dari database product

## Provider routing

Setelah product valid:

```ts
switch (product.vendor) {
  case "DIGIFLAZZ":
    return DigiflazzPascabayarProvider.inquiry(...)
  case "OKECONNECT":
    return OkeconnectPascabayarProvider.inquiry(...)
  case "H2H":
    return H2hPascabayarProvider.inquiry(...)
}
```

Buat adapter/provider service terpisah agar gampang maintenance, contoh struktur:

```txt
src/modules/transaction/pascabayar/
  index.ts
  pascabayar.types.ts
  pascabayar.service.ts
  pascabayar.mapper.ts
  pascabayar.validator.ts
  providers/
    digiflazz.pascabayar.provider.ts
    okeconnect.pascabayar.provider.ts
    h2h.pascabayar.provider.ts
```

Boleh sesuaikan dengan style existing project, tapi jangan campur logic pascabayar ke service prabayar.

## Unified response contract

Semua provider harus dikembalikan dalam bentuk response yang sama.

Gunakan response seperti ini:

```ts
type PascabayarUnifiedResponse = {
  success: boolean;
  status:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "NOT_FOUND"
    | "INVALID_PRODUCT"
    | "PROVIDER_ERROR";

  action: "INQUIRY" | "PAYMENT" | "CHECK";

  referenceId: string;
  provider: "DIGIFLAZZ" | "OKECONNECT" | "H2H";
  sku: string;
  vendorSku: string;
  customerNo: string;

  message: string;

  data?: {
    customerName?: string;
    productName?: string;
    billAmount?: number;
    adminFee?: number;
    totalAmount?: number;
    period?: string;
    dueDate?: string;
    serialNumber?: string;
    providerTransactionId?: string;
    providerStatus?: string;
    paidAt?: string;
    detail?: Record<string, unknown>;
  };

  raw?: unknown;
  error?: {
    code?: string;
    message: string;
    detail?: unknown;
  };
};
```

Rules response:

* Jangan lempar response mentah provider langsung ke frontend
* Simpan raw provider response di field `raw`
* Field utama harus selalu konsisten
* Mapping status provider ke enum internal:

  * sukses bayar / lunas => `SUCCESS`
  * proses / pending => `PENDING`
  * gagal => `FAILED`
  * produk/customer/tagihan tidak ditemukan => `NOT_FOUND`
  * product invalid => `INVALID_PRODUCT`
  * error dari provider / timeout / malformed response => `PROVIDER_ERROR`

## Error handling

* Jangan crash jika provider response berbeda format
* Semua error harus masuk ke unified response
* Gunakan try/catch di boundary provider call
* Jangan expose credential/signature/hash rahasia ke response frontend/log
* Logging boleh, tapi jangan log secret

## Integration

Cari route/controller transaksi existing.

Jika sudah ada endpoint pascabayar, integrasikan ke service baru.

Jika belum ada, buat endpoint minimal:

```txt
POST /transaction/pascabayar/inquiry
POST /transaction/pascabayar/payment
POST /transaction/pascabayar/check
```

Body mengikuti unified request.

Response mengikuti unified response.

## Jangan dilakukan

* Jangan ubah flow prabayar kecuali benar-benar perlu
* Jangan rename besar-besaran file existing tanpa alasan
* Jangan hapus logic lama sebelum service baru aman
* Jangan hardcode SKU provider di frontend
* Jangan percaya `vendor`, `vendorSku`, atau `type` dari request frontend
* Jangan scan seluruh workspace tanpa limit

## Acceptance criteria

* Ada folder `src/modules/transaction/pascabayar`
* Ada service utama dengan method `inquiry`, `payment`, `check`
* Ada adapter untuk Digiflazz, Okeconnect, dan H2H
* Product selalu divalidasi dari database berdasarkan `sku`
* Hanya product `type = POSTPAID` yang diproses
* Response 3 provider sudah unified
* Existing transaksi prabayar tetap aman
* TypeScript build/lint tidak error
* Tambahkan komentar secukupnya hanya di bagian mapping provider yang kompleks



NOTE: ini pure javascript bukan typescript