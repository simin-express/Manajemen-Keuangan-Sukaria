# Keuangan - versi GitHub Pages + Supabase

Aplikasi web (PWA) tanpa hosting berbayar. Tampilan dan fitur mengikuti aplikasi PHP Warung Sukaria.
Data disimpan di Supabase (gratis), BUKAN di repositori GitHub.

## Langkah pasang (urut)

### 1. Supabase
1. Daftar di supabase.com, buat project baru (pilih region Singapore). Catat password database.
2. Buka **SQL Editor > New query**, tempel seluruh isi `supabase/setup.sql`, klik **Run**.
3. Buka **Authentication** dan MATIKAN pendaftaran bebas (nonaktifkan "Allow new users to sign up").
4. Buka **Authentication > Users > Add user**: isi email dan password, centang **Auto Confirm User**. Ini akun admin pertama Anda.
5. Di **SQL Editor**, jadikan akun itu administrator (ganti emailnya):
   `update public.profiles set level = 'administrator' where id = (select id from auth.users where email = 'email-anda@contoh.com');`
6. Buka **Project Settings > API**. Salin **Project URL** dan kunci **anon / publishable**.

### 2. Isi konfigurasi
Buka `js/config.js`, ganti `SUPABASE_URL` dan `SUPABASE_KEY` dengan hasil langkah 6.

### 3. GitHub
1. Buat repositori **publik** baru, lalu upload SEMUA isi folder ini ke bagian utama (root).
2. Pastikan folder `.github/workflows/denyut.yml` ikut terupload. Folder berawalan titik sering tersembunyi (di Mac tekan Cmd+Shift+.). Jika tidak ikut, pakai **Add file > Create new file**, beri nama `.github/workflows/denyut.yml`, lalu tempel isi `supabase/denyut-workflow.yml`.
3. **Settings > Pages**: Source = Deploy from a branch, branch `main`, folder `/ (root)`. Tunggu beberapa menit.
4. **Settings > Secrets and variables > Actions > New repository secret**, buat dua secret: `SUPABASE_URL` dan `SUPABASE_KEY` (isinya sama dengan di config.js).
5. Tab **Actions > Denyut Supabase > Run workflow** untuk mencoba. Setelah itu jalan otomatis tiap 3 hari.

### 4. Buka aplikasi
Alamat: `https://NAMA-GITHUB-ANDA.github.io/NAMA-REPO/`. Login dengan email dan password admin tadi.

### 5. Tambah pengguna lain
Authentication > Users > Add user (Auto Confirm). Pengguna baru otomatis berlevel `menunggu` (belum bisa apa-apa). Beri akses:
`update public.profiles set level = 'manajemen' where id = (select id from auth.users where email = 'email@contoh.com');`

## Peran
- **administrator**: semua fitur, termasuk Kategori dan Rekening Bank.
- **manajemen**: transaksi, hutang, piutang; hanya melihat Kategori dan Rekening Bank.

## Dashboard dan laporan
- Dashboard dibuka dalam tampilan bulanan dengan cash flow harian. Filter bulan dan tahun diterapkan melalui tombol **Terapkan**.
- Halaman **Laporan** tersedia di menu, dengan filter periode, rekening, jenis, dan kategori, serta opsi cetak atau simpan sebagai PDF.
- Nominal transaksi ditampilkan dengan pemisah ribuan. Data nominal tetap disimpan sebagai angka di Supabase.

## Penting
- Situs GitHub Pages bersifat publik. Yang bisa dilihat umum hanya kodenya; data tetap terkunci di balik login.
- Paket gratis Supabase tidak punya backup otomatis. Admin punya tombol **Unduh Backup** di menu samping; unduh rutin (misalnya seminggu sekali).
- Workflow terjadwal GitHub dinonaktifkan jika repositori tidak ada aktivitas 60 hari. Ubah sesuatu kecil di repositori sebelum itu, atau aktifkan lagi lewat tab Actions.
- Saldo rekening dihitung otomatis oleh database saat transaksi ditambah, diubah, atau dihapus.

## Belum ada di versi ini
- Halaman Data Pengguna (pengguna dikelola lewat Supabase seperti langkah 5).
- Pemindahan data dari aplikasi PHP lama.

## Dibungkus jadi aplikasi Android
Gunakan PWABuilder seperti aplikasi persuratan Anda, dengan alamat GitHub Pages di atas. Buat nama paket dan kunci tanda tangan BARU. File `assetlinks.json` untuk alamat github.io perlu dipasang di repositori khusus `NAMA-GITHUB-ANDA.github.io` (folder `.well-known`).
