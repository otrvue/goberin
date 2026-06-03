# 📑 Dokumentasi Alur REST API Sistem PPOB
### Integrasi Terpadu: Digiflazz & OkeConnect (OrderKuota)

Dokumen ini berisi spesifikasi, arsitektur, dan alur data (*data flow*) untuk seluruh REST API pada sistem PPOB Anda, yang berbasis database **Prisma 6**.

---

## 🧭 I. Arsitektur Umum & Pengamanan API

1. **Authentication Guard**: Semua endpoint dengan prefix `/api/admin/*` dan `/api/trx/*` wajib dilindungi oleh Middleware JWT (*JSON Web Token*).
2. **Role Management**: Endpoint `/api/admin/*` hanya dapat diakses oleh user yang memiliki `role: ADMIN` di database.
3. **Idempotency**: Semua proses mutasi saldo wajib menggunakan database transaction (`$transaction`) untuk mencegah kondisi balapan (*race condition*).

---

## 📂 II. Alur REST API CRUD (Data Master)

### 1. Modul Autentikasi & Akun User
* **`POST /api/auth/register` (Registrasi User)**
  * **Alur**: Frontend mengirim `email`, `username`, `password`, dan `name` $\rightarrow$ Backend memeriksa keunikan email & username di database $\rightarrow$ Melakukan enkripsi password (*hashing*) $\rightarrow$ Menyimpan data ke tabel `User`.
* **`POST /api/auth/login` (Masuk Akun)**
  * **Alur**: Validasi kecocokan `username`/`email` dan `password` $\rightarrow$ Jika cocok, backend me-return JWT Token yang berisi payload `userId` dan `role`.
* **`GET /api/users/profile` (Informasi Profil & Sisa Saldo)**
  * **Alur**: Middleware membaca JWT token $\rightarrow$ Backend mengambil profil user $\rightarrow$ Menghitung saldo secara *real-time* dengan menjumlahkan total record `amount` pada tabel `BalanceLog` milik user $\rightarrow$ Return data profil + saldo ke client.

### 2. Modul Inventory & Sinkronisasi Vendor (Admin Only)
* **`POST /api/admin/products/sync` (Otomatisasi Sinkronisasi Produk)**
  * **Alur Vendor Digiflazz**:
    1. Backend menembak API Digiflazz `POST /v1/price-list` (untuk perintah prepaid dan pasca).
    2. Backend memeriksa data `category` dan `brand`. Jika belum ada di tabel `Category` atau `Provider`, backend otomatis membuat baris baru (*upsert*).
    3. Penentuan tipe: Jika respons berasal dari list prepaid, set `type = PREPAID`. Jika dari pasca, set `type = POSTPAID`.
    4. Penentuan status: `isActive = buyer_product_status && seller_product_status`.
    5. Jalankan `prisma.product.upsert()` berdasarkan data unik gabungan `[vendor, vendorSku]`.
  * **Alur Vendor OkeConnect**:
    1. Backend mengambil data JSON dari URL `https://www.okeconnect.com/harga/json?id=YOUR_ID`.
    2. Penentuan tipe: Jika data `harga < 0` atau kolom `keterangan` mengandung kata `"Cek"`, set `type = POSTPAID`. Jika harga $\ge 0$, set `type = PREPAID`.
    3. Penentuan status: Jika `status === "1"`, set `isActive = true`.
    4. Jalankan `prisma.product.upsert()` ke database.

### 3. Modul Manajemen Pricing (Markup) & Promo (Admin Only)
* **`POST /api/admin/markups` (Create Aturan Profit)**
  * **Alur**: Admin menginput nama, `target` (GLOBAL/CATEGORY/PROVIDER/PRODUCT), tipe markup, dan nominalnya. Backend secara otomatis menyisipkan nilai kolom `priority` (Product = 4, Provider = 3, Category = 2, Global = 1) sebelum disimpan ke tabel `MarkupPrice`.
* **`PUT /api/admin/markups/:id` (Update/Toggle Status)**
  * **Alur**: Admin dapat mengubah nilai profit atau mematikan fungsi markup secara sementara (`isActive = false`).
* **`POST /api/admin/promos` (Create Event Promo Terjadwal)**
  * **Alur**: Admin menginput nama promo, besar potongan (`discount`), waktu mulai (`startTime`), waktu selesai (`endTime`), dan daftar `productIds` yang terpilih $\rightarrow$ Backend menyimpan data ke tabel `Promo` dan membuat baris relasi ke tabel penghubung `PromoProduct`.

---

## 🛍️ III. Alur REST API Sisi Client (Aplikasi User)

### 1. Menampilkan Produk & Perhitungan Harga Jual
* **`GET /api/products?categoryId={id}` (Read List Produk Aktif)**
  * **Alur Kerja Engine Backend**:
    1. Ambil list produk dari database yang berstatus `isActive = true` berdasarkan kategori.
    2. Untuk setiap item produk, sistem mencari aturan profit di tabel `MarkupPrice` yang aktif, lalu diurutkan dari prioritas tertinggi (`priority DESC`). Sistem hanya mengambil **1 aturan teratas** yang paling spesifik.
    3. Hitung penambahan harga modal (`basePrice`) dengan markup (apakah berupa angka tetap atau persentase).
    4. Periksa apakah produk terikat pada event `Promo` yang sedang berjalan (`startTime <= NOW <= endTime` dan `isActive = true`). Jika ya, potong harga dengan nilai diskon promo.
    5. Tempelkan hasil akhir perhitungan tersebut ke properti baru bernama `sellingPrice` sebelum dikirim ke frontend.

---

## ⚡ IV. Core Alur Sistem Transaksi

### 1. Transaksi Produk Prabayar / Prepaid (Pulsa, Paket Data, Token)
* **Endpoint**: `POST /api/trx/prepaid`
* **Payload**: `{"productId": "uuid-produk", "customerNo": "08123456789"}`
* **Alur Eksekusi**:
  1. Validasi apakah produk tersedia dan berstatus aktif.
  2. Hitung harga jual final (`totalPrice`) menggunakan mesin pricing (Markup + Promo).
  3. Hitung sisa saldo berjalan user. Jika saldo lebih kecil dari `totalPrice`, kembalikan respons error `400 (Saldo Tidak Cukup)`.
  4. Jalankan **Prisma Database Transaction (`$transaction`)**:
     * Buat baris baru di tabel `Transaction` dengan status awal `PENDING`.
     * Kurangi saldo user dengan membuat record bernilai negatif (`-totalPrice`) di tabel `BalanceLog`.
  5. Kirim request transaksi secara *asynchronous* ke API Vendor:
     * **OkeConnect**: Kirim via `GET /trx` dengan parameter `refID = {transaction.id}`.
     * **Digiflazz**: Kirim via `POST /v1/transaction` dengan parameter `ref_id = {transaction.id}`.
  6. Baca respon awal vendor. Jika vendor merespon transaksi diterima/sedang diproses, update kolom `vendorTrxId` dengan ID referensi dari vendor, lalu kirim status `PENDING` ke frontend user.

---

### 2. Transaksi Produk Pascabayar / Postpaid (Tagihan Listrik, PDAM, BPJS)
Proses wajib dilewati melalui 2 tahap terpisah: **Inquiry** (Cek) dan **Payment** (Bayar).

#### **Tahap A: Cek Rincian Tagihan (Inquiry)**
* **Endpoint**: `POST /api/trx/postpaid/inquiry`
* **Payload**: `{"productId": "uuid-produk", "customerNo": "530000000003"}`
* **Alur Eksekusi**:
  1. Backend mendeteksi vendor dari produk yang dipilih.
  2. Tembak API Inquiry Vendor (`commands: "inq-pasca"` di Digiflazz atau kode cek di OkeConnect).
  3. Vendor mengembalikan rincian data tagihan (Nama pelanggan, nominal tagihan/`price`).
  4. Backend mencari aturan markup, lalu menghitung: $\text{Total Bayar User} = \text{Tagihan Vendor} + \text{Margin Margin Anda}$.
  5. Kirim data rincian lengkap (Nama pelanggan, nominal tagihan asli, biaya admin markup Anda, dan total yang harus dibayar) ke frontend sebagai layar konfirmasi.

#### **Tahap B: Eksekusi Pembayaran Tagihan (Payment)**
* **Endpoint**: `POST /api/trx/postpaid/pay`
* **Payload**: `{"productId": "uuid-produk", "customerNo": "530000000003", "totalPrice": 125000}`
* **Alur Eksekusi**:
  1. User menekan tombol konfirmasi bayar di aplikasi.
  2. Backend menguji ulang kecukupan saldo user berdasarkan nominal `totalPrice` hasil inquiry.
  3. Jika saldo cukup, jalankan **Prisma `$transaction`**:
     * Buat record transaksi di tabel `Transaction` dengan status `PENDING`.
     * Potong saldo user dengan menginput nilai minus (`-totalPrice`) di tabel `BalanceLog`.
  4. Tembak endpoint bayar milik vendor (`commands: "pay-pasca"` di Digiflazz atau kode bayar di OkeConnect) dengan melempar parameter ID transaksi sistem Anda ke kolom `refID` / `ref_id`.
  5. Kembalikan status respons `PENDING` kepada user untuk menandakan tagihan sedang dibayarkan ke vendor.

---

## 🔔 V. Alur Webhook / Callback Handler (Otomatisasi Status)

Endpoint ini menerima laporan status sukses/gagal secara otomatis dari server pihak ketiga (Digiflazz/OkeConnect).

* **Endpoint**: `POST /api/callbacks/vendor`
* **Akses**: Publik (Disarankan melakukan proteksi menggunakan IP Whitelisting atau pengecekan Signature rahasia vendor).
* **Alur Kerja Engine**:
  1. Tangkap parameter ID transaksi (`refid` atau `ref_id`) beserta informasi status akhir transaksi dari payload kiriman vendor.
  2. Tarik data transaksi terkait dari tabel `Transaction`.
  3. **Proteksi Idempotent**: Periksa status transaksi saat ini di database Anda. Jika status transaksi di database Anda sudah bernilai `SUCCESS` atau `REFUNDED`, segera hentikan proses (`return HTTP 200 OK`). Langkah ini krusial untuk mencegah manipulasi data ganda (seperti refund berulang).
  4. **Percabangan Kondisi Laporan Vendor**:
     * **JIKA TRANSAKSI SUKSES** (`SUKSES` / `Sukses` / `rc: "00"`):
       * Update tabel `Transaction`: Ubah nilai `status = SUCCESS`, dan simpan nomor Serial Number resmi dari vendor ke dalam kolom `sn`.
     * **JIKA TRANSAKSI GAGAL** (`GAGAL` / `Gagal` / `rc: "02"`):
       * Jalankan operasi database **Prisma `$transaction`**:
         1. Update tabel `Transaction`: Ubah nilai `status = REFUNDED`, dan simpan pesan error vendor pada kolom `notes`.
         2. **Proses Pengembalian Dana (Refund)**: Buat satu baris record baru bertanda nilai positif (`+totalPrice` nominal transaksi awal) di tabel `BalanceLog` milik user agar saldo akun mereka otomatis bertambah kembali secara instan.
  5. **Final Respon**: Kirim kode respons HTTP `200 OK` atau plain text sesuai dokumentasi vendor agar server mereka mengetahui callback sukses diproses dan tidak mengirimkan ulang data laporan yang sama.