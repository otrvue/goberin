Base URL
https://api.h2h.id/api/trx

Produk dengan Flow Khusus / Tidak Didukung di Order Reguler
Status dukungan H2H API:
• Pascabayar / PPOB / Tagihan — didukung via H2H, tetapi wajib flow /trx/inquiry lalu order /trx dengan inquiry_id
• Open Denomination (qty) — didukung untuk produk nominal_bebas (DANA, OVO, GOPAY, ShopeePay, dll). Wajib kirim parameter qty (kelipatan 1.000)
• Produk harga dinamis tanpa inquiry — ditolak sampai inquiry dilakukan
• Kode CEK (contoh CPLA) — hanya untuk inquiry, tidak bisa langsung di endpoint order

Format Response
Semua response menggunakan format JSON yang konsisten:
// Sukses
{
  "status": true,
  "message": "...",
  "data": { ... }
}

// Error
{
  "status": false,
  "message": "Pesan error..."
}


Autentikasi
Semua request memerlukan 3 parameter autentikasi yang dikirim sebagai query string:

Parameter	Tipe	Keterangan
memberID	string	Username akun H2H.ID Anda
pin	        string	PIN transaksi, diatur di menu Profil
password	string	Password H2H (berbeda dari password login), diatur di Pengaturan → API H2H


Cek Saldo
GET /balance
GET https://api.h2h.id/api/trx/balance?memberID={username}&pin={pin}&password={h2h_password}
Response
{
  "status": true,
  "message": "Cek saldo berhasil",
  "data": {
    "balance": 1234567,
    "balance_formatted": "1.234.567"
  }
}


Order Transaksi (Reguler)
Untuk order pulsa, paket data, token PLN, voucher game, e-wallet topup (nominal fixed maupun open denomination), dan paket telp/SMS. Produk PPOB/tagihan dapat diproses via H2H jika didahului /trx/inquiry lalu order menggunakan inquiry_id. Produk open denomination (nominal bebas, mis. DANA/OVO/GOPAY/ShopeePay) wajib mengirim parameter qty.

GET /
GET https://api.h2h.id/api/trx?product={kode}&dest={tujuan}&refID={ref}&memberID={id}&pin={pin}&password={pass}

Parameters
Parameter	Wajib	Keterangan
product	    Ya	Kode produk dari Daftar Harga (contoh: T5, XD10, PLN50, ML86, GOPAY20)
dest	    Ya	Nomor tujuan sesuai jenis produk:
                                                Pulsa/Data/Telp SMS: Nomor HP (08xxx, 628xxx)
                                                Token PLN Prabayar: Nomor meter (10-15 digit)
                                                E-Wallet: Nomor HP terdaftar e-wallet
                                                Voucher Game: User ID game (untuk ML format: userid atau userid|zoneid)
refID	    Ya	Reference ID unik dari sistem Anda. Tidak boleh duplikat (untuk mencegah double order & sebagai referensi callback)
memberID	Ya	Username akun H2H Anda
pin	        Ya	PIN transaksi
password	Ya	Password H2H
qty	        Kondisional	Wajib untuk produk open denomination / nominal bebas (DANA, OVO, GOPAY, ShopeePay, dll). Tidak boleh dikirim untuk produk nominal fixed. Format: integer, kelipatan 1.000, range 10.000 – 10.000.000. Total tagihan = qty + admin fee.
inquiry_id	Kondisional	Wajib untuk produk pascabayar/PPOB. Dapatkan dari endpoint /trx/inquiry.
Response
{
  "status": true,
  "message": "Order berhasil dibuat",
  "data": {
    "invoice": "INV20260228001",
    "ref_id": "ref001",
    "product_name": "Telkomsel 5.000",
    "product_code": "T5",
    "destination": "08123456789",
    "price": 5650,
    "balance_before": 1000000,
    "balance_after": 994350,
    "transaction_status": "pending"
  }
}
Keterangan:

invoice — Nomor invoice transaksi
ref_id — Reference ID yang Anda kirim
price — Harga dalam Rupiah (integer)
Saldo langsung terpotong saat order berhasil dibuat
Jika transaksi gagal, saldo otomatis dikembalikan (refund)

Contoh per Kategori:
E-Wallet Topup (Nominal Fixed):
https://api.h2h.id/api/trx?product=GOPAY20&dest=08123456789&refID=ref005&memberID=user1&pin=123456&password=h2hpass
E-Wallet Topup (Open Denomination / Nominal Bebas):
https://api.h2h.id/api/trx?product=BBSDN&dest=08123456789&refID=ref006&qty=50000&memberID=user1&pin=123456&password=h2hpass
Contoh di atas top up DANA Rp 50.000. Total tagihan = qty + admin fee (lihat Daftar Harga). Response akan menambahkan field qty dan admin_fee.

Catatan: Untuk PPOB/tagihan (PLN Pascabayar, BPJS, PDAM, Telkom, dll), lakukan /trx/inquiry terlebih dahulu lalu kirim inquiry_id saat order /trx. Order langsung tanpa inquiry akan ditolak dengan kode error seperti INQUIRY_REQUIRED. Untuk produk open denomination (nominal bebas), kirim parameter qty (kelipatan 1.000, range 10.000–10.000.000); jangan kirim qty pada produk nominal fixed (akan ditolak VALIDATION_ERROR).


Cek Status Transaksi
Berlaku untuk transaksi reguler maupun SMM — sistem otomatis mendeteksi berdasarkan refID.

GET /status
GET https://api.h2h.id/api/trx/status?refID={ref}&memberID={id}&pin={pin}&password={pass}
Parameters
Parameter	Wajib	Keterangan
refID	Ya	Reference ID yang digunakan saat order
memberID	Ya	Username akun H2H Anda
pin	Ya	PIN transaksi
password	Ya	Password H2H
Response
Sukses:
{
  "status": true,
  "message": "Status transaksi",
  "data": {
    "invoice": "INV20260228001",
    "ref_id": "ref001",
    "product_name": "Telkomsel 5.000",
    "product_code": "T5",
    "destination": "08123456789",
    "price": 5650,
    "balance": 994350,
    "time": "28/02 14:31",
    "transaction_status": "success",
    "status_label": "Sukses",
    "status_description": "Transaksi berhasil diproses",
    "serial_number": "0812xxxx1234",
    "provider_message": "SN=0812xxxx1234"
  }
}

Pending:
{
  "status": true,
  "message": "Status transaksi",
  "data": {
    "invoice": "INV20260228001",
    "ref_id": "ref001",
    "product_name": "Telkomsel 5.000",
    "product_code": "T5",
    "destination": "08123456789",
    "price": 5650,
    "balance": 994350,
    "time": "28/02 14:30",
    "transaction_status": "pending",
    "status_label": "Menunggu",
    "status_description": "Transaksi sedang diproses provider",
    "provider_message": ""
  }
}

Gagal:
{
  "status": true,
  "message": "Status transaksi",
  "data": {
    "invoice": "INV20260228001",
    "ref_id": "ref001",
    "product_name": "Telkomsel 5.000",
    "product_code": "T5",
    "destination": "08123456789",
    "price": 5650,
    "balance": 1000000,
    "time": "28/02 14:32",
    "transaction_status": "failed",
    "status_label": "Gagal",
    "status_description": "Transaksi gagal, saldo dikembalikan",
    "reason": "Gangguan provider",
    "is_refunded": true,
    "provider_message": "TRANSAKSI GAGAL"
  }
}

Nilai transaction_status:

success — Transaksi berhasil. Field serial_number berisi SN / token PLN
pending — Sedang diproses oleh provider
failed — Transaksi gagal. reason berisi alasan, is_refunded menandakan dana dikembalikan
Field tambahan:

status_label — Label status dalam Bahasa Indonesia (Sukses / Menunggu / Diproses / Gagal / Dikembalikan)
status_description — Deskripsi status transaksi dalam Bahasa Indonesia
provider_message — Pesan dari provider (SN, token, atau keterangan error)

Daftar Harga
GET /pricelist
GET https://api.h2h.id/api/trx/pricelist?memberID={id}&pin={pin}&password={pass}
Parameter Opsional
type	Filter berdasarkan tipe produk. Nilai yang tersedia:
pulsa paket_data pln voucher_game e_wallet pascabayar tagihan streaming paket_telp_sms cetak_voucher nominal_bebas lainnya
Gunakan type=smm untuk daftar layanan SMM (lihat bagian 9)
Response
{
  "status": true,
  "message": "Daftar harga berhasil diambil",
  "member_id": "username",
  "total": 150,
  "data": [
    {
      "code": "T5",
      "name": "Telkomsel 5.000",
      "description": "Pulsa Telkomsel 5.000 masa aktif 7 hari",
      "operator": "Telkomsel",
      "price": 5650,
      "status": "OPEN",
      "provider_status": "active"
    }
  ]
}

Catatan: Field price adalah harga jual dalam Rupiah (bilangan bulat, tanpa desimal). Harga untuk produk PPOB tagihan (BPJS, PLN Pascabayar, PDAM, dll) bisa bernilai 0 karena harga ditentukan saat transaksi berdasarkan tagihan pelanggan. Field description berisi deskripsi produk (bisa kosong "" jika belum diisi).

Cek ID Pelanggan (PLN, Game & Tagihan)
Endpoint publik (tanpa autentikasi) untuk memverifikasi data pelanggan sebelum melakukan transaksi.

Cek Pelanggan PLN
POST https://api.h2h.id/api/pln/check
Parameters (JSON Body)
Param	Keterangan
meter_id	Nomor Meter / ID Pelanggan PLN (10–15 digit angka). *wajib
Contoh Request
POST https://api.h2h.id/api/pln/check
Content-Type: application/json

{
    "meter_id": "530000123456"
}
Contoh Response Sukses
{
    "success": true,
    "data": {
        "meter_id": "530000123456",
        "name": "NAMA PELANGGAN",
        "tariff": "R1",
        "power": "900",
        "power_formatted": "900 VA"
    },
    "message": "Data pelanggan ditemukan"
}
Cek Akun Game
POST https://api.h2h.id/api/game/check
Parameters (JSON Body)
Param	Keterangan
game	Kode game: mobile-legends free-fire pubg-mobile *wajib
user_id	User ID game (3–20 karakter). *wajib
zone_id	Zone ID / Server ID. *wajib untuk Mobile Legends
Contoh Request (Mobile Legends)
POST https://api.h2h.id/api/game/check
Content-Type: application/json

{
    "game": "mobile-legends",
    "user_id": "123456789",
    "zone_id": "1234"
}
Contoh Response Sukses
{
    "success": true,
    "data": {
        "game": "mobile-legends",
        "user_id": "123456789",
        "zone_id": "1234",
        "username": "NamaPlayer"
    },
    "message": "Akun ditemukan"
}
Tips: Gunakan endpoint ini untuk validasi ID pelanggan/game sebelum mengirim transaksi, agar mengurangi risiko transaksi gagal karena ID salah.
Cek Tagihan Pascabayar (Bill Check)
Endpoint publik (tanpa autentikasi) untuk mengecek tagihan pascabayar sebelum melakukan pembayaran.

POST https://api.h2h.id/api/bill/check
Parameters (JSON Body)
Param	Keterangan
buyer_sku_code	Kode produk pascabayar (contoh: CPLA, CBPJS, CTEL). *wajib
customer_no	Nomor pelanggan (5–30 digit angka). *wajib
Contoh Request
POST https://api.h2h.id/api/bill/check
Content-Type: application/json

{
    "buyer_sku_code": "CPLA",
    "customer_no": "530000123456"
}
Contoh Response Sukses
{
    "success": true,
    "data": {
        "customer_name": "NAMA PELANGGAN",
        "customer_no": "530000123456",
        "bill_amount": 350000,
        "admin_fee": 2500,
        "total_amount": 352500,
        "period": "JAN 2026",
        "description": "Tagihan listrik 1 bulan",
        "ref_id": "BIL-xxxxxxxx"
    },
    "message": "Tagihan ditemukan"
}
Catatan: Response menggunakan key success (bukan status). Field total_amount = bill_amount + admin_fee.