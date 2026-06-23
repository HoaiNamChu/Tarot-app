<?php

namespace App\Services;

use App\Models\AppSetting;

class PolicyContentService
{
    public const TYPES = ['terms', 'privacy', 'payment', 'refund'];

    public function all(): array
    {
        return collect(self::TYPES)
            ->mapWithKeys(fn(string $type) => [$type => $this->get($type)])
            ->all();
    }

    public function get(string $type): ?array
    {
        if (!in_array($type, self::TYPES, true)) {
            return null;
        }

        $default = $this->defaults()[$type];
        $sections = $this->sections($type, $default['sections']);

        return [
            'type' => $type,
            'title' => AppSetting::getValue($this->key($type, 'title'), $default['title']),
            'updated' => AppSetting::getValue($this->key($type, 'updated'), $default['updated']),
            'intro' => AppSetting::getValue($this->key($type, 'intro'), $default['intro']),
            'sections' => $sections,
        ];
    }

    public function update(string $type, array $data): ?array
    {
        if (!in_array($type, self::TYPES, true)) {
            return null;
        }

        foreach (['title', 'updated', 'intro'] as $field) {
            AppSetting::updateOrCreate(
                ['key' => $this->key($type, $field)],
                ['value' => (string) $data[$field]]
            );
        }

        AppSetting::updateOrCreate(
            ['key' => $this->key($type, 'sections')],
            ['value' => json_encode($data['sections'], JSON_UNESCAPED_UNICODE)]
        );

        return $this->get($type);
    }

    private function sections(string $type, array $fallback): array
    {
        $raw = AppSetting::getValue($this->key($type, 'sections'));
        if (blank($raw)) {
            return $fallback;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $fallback;
        }

        return collect($decoded)
            ->filter(fn($item) => is_array($item) && filled($item['heading'] ?? null) && filled($item['body'] ?? null))
            ->map(fn($item) => [
                'heading' => (string) $item['heading'],
                'body' => (string) $item['body'],
            ])
            ->values()
            ->all() ?: $fallback;
    }

    private function key(string $type, string $field): string
    {
        return "policy_{$type}_{$field}";
    }

    private function defaults(): array
    {
        return [
            'terms' => [
                'title' => 'Dieu khoan su dung',
                'updated' => '15/06/2026',
                'intro' => 'Cac dieu khoan nay ap dung cho viec dat lich, thanh toan va su dung dich vu tu van tarot cua Luna Arcana.',
                'sections' => [
                    ['heading' => 'Pham vi dich vu', 'body' => 'Luna Arcana cung cap lich hen tu van truc tuyen voi reader. Noi dung tu van mang tinh tham khao va khong thay the tu van y te, phap ly, tai chinh hoac quyet dinh chuyen mon.'],
                    ['heading' => 'Tai khoan va thong tin dat lich', 'body' => 'Khach hang can cung cap thong tin lien he chinh xac de nhan xac nhan, link phong hop va thong bao lien quan den lich hen.'],
                    ['heading' => 'Thanh toan', 'body' => 'Lich hen chi duoc giu trong thoi gian hien thi tai buoc thanh toan. He thong co the tu dong huy lich neu het han thanh toan hoac giao dich khong hop le.'],
                    ['heading' => 'Hanh vi su dung', 'body' => 'Khach hang khong duoc su dung dich vu cho hanh vi quang cao, lam phien, xam pham quyen rieng tu, hoac noi dung vi pham phap luat.'],
                ],
            ],
            'privacy' => [
                'title' => 'Chinh sach bao mat thong tin',
                'updated' => '15/06/2026',
                'intro' => 'Chinh sach nay mo ta cach Luna Arcana thu thap, su dung va bao ve du lieu cua khach hang.',
                'sections' => [
                    ['heading' => 'Thong tin thu thap', 'body' => 'Chung toi co the thu thap ho ten, email, so dien thoai, lich su dat lich, noi dung ghi chu va thong tin thanh toan can thiet de xu ly don hang.'],
                    ['heading' => 'Muc dich su dung', 'body' => 'Du lieu duoc dung de tao lich, gui email thong bao, ho tro khach hang, xac minh thanh toan va cai thien chat luong dich vu.'],
                    ['heading' => 'Bao ve du lieu', 'body' => 'He thong gioi han quyen truy cap theo vai tro admin, reader va khach hang. Cac khoa bi mat thanh toan khong duoc hien thi lai sau khi luu.'],
                    ['heading' => 'Yeu cau ho tro', 'body' => 'Khach hang co the lien he de yeu cau cap nhat thong tin ca nhan hoac duoc giai thich ve du lieu dang duoc luu tru.'],
                ],
            ],
            'payment' => [
                'title' => 'Chinh sach thanh toan',
                'updated' => '15/06/2026',
                'intro' => 'Trang nay giai thich cac hinh thuc thanh toan va trang thai xu ly lich hen.',
                'sections' => [
                    ['heading' => 'Phuong thuc ho tro', 'body' => 'Luna Arcana co the bat hoac tat tung phuong thuc thanh toan nhu chuyen khoan ngan hang, MoMo va VNPay theo cau hinh he thong.'],
                    ['heading' => 'Giu lich tam thoi', 'body' => 'Sau khi tao lich, he thong giu khung gio trong thoi gian gioi han. Neu qua han ma chua thanh toan, lich co the tu dong huy de tra lai slot cho reader.'],
                    ['heading' => 'Thanh toan tu dong', 'body' => 'Voi cong thanh toan tu dong, trang thai lich duoc cap nhat theo ket qua tra ve tu nha cung cap. Khach hang khong nen dong trang khi giao dich dang xu ly.'],
                    ['heading' => 'Xac minh thu cong', 'body' => 'Voi chuyen khoan ngan hang, admin se xac minh giao dich va cap nhat trang thai thanh toan khi tien da vao tai khoan.'],
                ],
            ],
            'refund' => [
                'title' => 'Chinh sach hoan tien',
                'updated' => '15/06/2026',
                'intro' => 'Chinh sach hoan tien giup khach hang nam ro cac truong hop duoc ho tro va cach thuc xu ly.',
                'sections' => [
                    ['heading' => 'Truong hop co the hoan tien', 'body' => 'Khach hang co the duoc hoan tien khi lich bi huy do loi van hanh, reader khong the thuc hien lich, hoac giao dich bi thu tien nhung khong tao duoc lich hop le.'],
                    ['heading' => 'Truong hop can xem xet', 'body' => 'Yeu cau huy sat gio hen, vang mat hoac cung cap thong tin lien he sai se duoc admin xem xet theo tung truong hop cu the.'],
                    ['heading' => 'Hinh thuc hoan tien', 'body' => 'Hoan tien duoc thuc hien theo phuong thuc phu hop voi giao dich goc hoac chuyen khoan thu cong sau khi doi soat.'],
                    ['heading' => 'Thoi gian xu ly', 'body' => 'Thoi gian xu ly phu thuoc vao ngan hang hoac cong thanh toan. Admin se cap nhat trang thai trong lich su thanh toan cua khach hang.'],
                ],
            ],
        ];
    }
}
