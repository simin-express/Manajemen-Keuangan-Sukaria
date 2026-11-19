-- Jalankan seluruh isi file ini sekali di Supabase: SQL Editor > New query > Run.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null default '',
  level text not null default 'menunggu' check (level in ('administrator','manajemen','menunggu'))
);
create table public.kategori (id bigint generated always as identity primary key, nama text not null);
create table public.bank (
  id bigint generated always as identity primary key,
  nama text not null, nomor text not null default '', pemilik text not null default '',
  saldo bigint not null default 0
);
create table public.transaksi (
  id bigint generated always as identity primary key,
  tanggal date not null,
  jenis text not null check (jenis in ('Pemasukan','Pengeluaran')),
  kategori_id bigint references public.kategori(id) on delete restrict,
  nominal bigint not null check (nominal >= 0),
  keterangan text not null default '',
  bank_id bigint references public.bank(id) on delete restrict
);
create table public.hutang (id bigint generated always as identity primary key, tanggal date not null, nominal bigint not null check (nominal >= 0), keterangan text not null default '');
create table public.piutang (id bigint generated always as identity primary key, tanggal date not null, nominal bigint not null check (nominal >= 0), keterangan text not null default '');
create table public.catatan (user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(), isi text not null default '', diperbarui timestamptz not null default now());
create table public.keepalive (id int primary key default 1 check (id = 1), terakhir timestamptz not null default now());
insert into public.keepalive values (1, now());

-- Level pengguna yang sedang login (dipakai aturan akses)
create function public.level_saya() returns text language sql stable security definer set search_path = public as
$$ select level from public.profiles where id = auth.uid() $$;

-- Pengguna baru otomatis dapat profil dengan level 'menunggu' (belum punya akses)
create function public.buat_profil() returns trigger language plpgsql security definer set search_path = public as
$$ begin
  insert into public.profiles (id, nama) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;
create trigger trg_profil after insert on auth.users for each row execute function public.buat_profil();

-- Saldo rekening disesuaikan otomatis saat transaksi ditambah/diubah/dihapus
create function public.sesuaikan_saldo() returns trigger language plpgsql security definer set search_path = public as
$$ begin
  if tg_op in ('UPDATE','DELETE') and old.bank_id is not null then
    update public.bank set saldo = saldo + case old.jenis when 'Pemasukan' then -old.nominal else old.nominal end where id = old.bank_id;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.bank_id is not null then
    update public.bank set saldo = saldo + case new.jenis when 'Pemasukan' then new.nominal else -new.nominal end where id = new.bank_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_saldo after insert or update or delete on public.transaksi for each row execute function public.sesuaikan_saldo();

-- "Denyut" agar proyek gratis tidak dijeda
create function public.ping() returns timestamptz language sql security definer set search_path = public as
$$ update public.keepalive set terakhir = now() where id = 1 returning terakhir $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

-- Aturan akses (Row Level Security)
alter table public.profiles enable row level security;
alter table public.kategori enable row level security;
alter table public.bank enable row level security;
alter table public.transaksi enable row level security;
alter table public.hutang enable row level security;
alter table public.piutang enable row level security;
alter table public.catatan enable row level security;
alter table public.keepalive enable row level security;

create policy "profil: baca sendiri atau admin" on public.profiles for select using (id = auth.uid() or public.level_saya() = 'administrator');
create policy "profil: admin ubah" on public.profiles for update using (public.level_saya() = 'administrator') with check (public.level_saya() = 'administrator');

create policy "kategori: baca" on public.kategori for select using (public.level_saya() in ('administrator','manajemen'));
create policy "kategori: admin tulis" on public.kategori for all using (public.level_saya() = 'administrator') with check (public.level_saya() = 'administrator');
create policy "bank: baca" on public.bank for select using (public.level_saya() in ('administrator','manajemen'));
create policy "bank: admin tulis" on public.bank for all using (public.level_saya() = 'administrator') with check (public.level_saya() = 'administrator');

create policy "transaksi: semua level" on public.transaksi for all using (public.level_saya() in ('administrator','manajemen')) with check (public.level_saya() in ('administrator','manajemen'));
create policy "hutang: semua level" on public.hutang for all using (public.level_saya() in ('administrator','manajemen')) with check (public.level_saya() in ('administrator','manajemen'));
create policy "piutang: semua level" on public.piutang for all using (public.level_saya() in ('administrator','manajemen')) with check (public.level_saya() in ('administrator','manajemen'));
create policy "catatan: milik sendiri" on public.catatan for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Data awal (boleh diubah/dihapus nanti di aplikasi)
insert into public.kategori (nama) values ('Penjualan'), ('Bahan Baku'), ('Gaji Karyawan'), ('Listrik & Air'), ('Lain-lain');
insert into public.bank (nama) values ('Cash'), ('BANK BRI'), ('BANK BCA');
