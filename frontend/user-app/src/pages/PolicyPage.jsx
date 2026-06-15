import { Navigate } from 'react-router-dom'

import { ROUTES } from '../constants/routes.js'
import styles from './PolicyPage.module.css'

const POLICIES = {
  terms: {
    title: 'Dieu khoan su dung',
    updated: 'Cap nhat: 15/06/2026',
    intro: 'Cac dieu khoan nay ap dung cho viec dat lich, thanh toan va su dung dich vu tu van tarot cua Luna Arcana.',
    sections: [
      ['Pham vi dich vu', 'Luna Arcana cung cap lich hen tu van truc tuyen voi reader. Noi dung tu van mang tinh tham khao va khong thay the tu van y te, phap ly, tai chinh hoac quyet dinh chuyen mon.'],
      ['Tai khoan va thong tin dat lich', 'Khach hang can cung cap thong tin lien he chinh xac de nhan xac nhan, link phong hop va thong bao lien quan den lich hen.'],
      ['Thanh toan', 'Lich hen chi duoc giu trong thoi gian hien thi tai buoc thanh toan. He thong co the tu dong huy lich neu het han thanh toan hoac giao dich khong hop le.'],
      ['Hanh vi su dung', 'Khach hang khong duoc su dung dich vu cho hanh vi quang cao, lam phien, xam pham quyen rieng tu, hoac noi dung vi pham phap luat.'],
    ],
  },
  privacy: {
    title: 'Chinh sach bao mat thong tin',
    updated: 'Cap nhat: 15/06/2026',
    intro: 'Chinh sach nay mo ta cach Luna Arcana thu thap, su dung va bao ve du lieu cua khach hang.',
    sections: [
      ['Thong tin thu thap', 'Chung toi co the thu thap ho ten, email, so dien thoai, lich su dat lich, noi dung ghi chu va thong tin thanh toan can thiet de xu ly don hang.'],
      ['Muc dich su dung', 'Du lieu duoc dung de tao lich, gui email thong bao, ho tro khach hang, xac minh thanh toan va cai thien chat luong dich vu.'],
      ['Bao ve du lieu', 'He thong gioi han quyen truy cap theo vai tro admin, reader va khach hang. Cac khoa bi mat thanh toan khong duoc hien thi lai sau khi luu.'],
      ['Yeu cau ho tro', 'Khach hang co the lien he de yeu cau cap nhat thong tin ca nhan hoac duoc giai thich ve du lieu dang duoc luu tru.'],
    ],
  },
  payment: {
    title: 'Chinh sach thanh toan',
    updated: 'Cap nhat: 15/06/2026',
    intro: 'Trang nay giai thich cac hinh thuc thanh toan va trang thai xu ly lich hen.',
    sections: [
      ['Phuong thuc ho tro', 'Luna Arcana co the bat hoac tat tung phuong thuc thanh toan nhu chuyen khoan ngan hang, MoMo va VNPay theo cau hinh he thong.'],
      ['Giu lich tam thoi', 'Sau khi tao lich, he thong giu khung gio trong thoi gian gioi han. Neu qua han ma chua thanh toan, lich co the tu dong huy de tra lai slot cho reader.'],
      ['Thanh toan tu dong', 'Voi cong thanh toan tu dong, trang thai lich duoc cap nhat theo ket qua tra ve tu nha cung cap. Khach hang khong nen dong trang khi giao dich dang xu ly.'],
      ['Xac minh thu cong', 'Voi chuyen khoan ngan hang, admin se xac minh giao dich va cap nhat trang thai thanh toan khi tien da vao tai khoan.'],
    ],
  },
  refund: {
    title: 'Chinh sach hoan tien',
    updated: 'Cap nhat: 15/06/2026',
    intro: 'Chinh sach hoan tien giup khach hang nam ro cac truong hop duoc ho tro va cach thuc xu ly.',
    sections: [
      ['Truong hop co the hoan tien', 'Khach hang co the duoc hoan tien khi lich bi huy do loi van hanh, reader khong the thuc hien lich, hoac giao dich bi thu tien nhung khong tao duoc lich hop le.'],
      ['Truong hop can xem xet', 'Yeu cau huy sat gio hen, vang mat hoac cung cap thong tin lien he sai se duoc admin xem xet theo tung truong hop cu the.'],
      ['Hinh thuc hoan tien', 'Hoan tien duoc thuc hien theo phuong thuc phu hop voi giao dich goc hoac chuyen khoan thu cong sau khi doi soat.'],
      ['Thoi gian xu ly', 'Thoi gian xu ly phu thuoc vao ngan hang hoac cong thanh toan. Admin se cap nhat trang thai trong lich su thanh toan cua khach hang.'],
    ],
  },
}

function PolicyPage({ type }) {
  const policy = POLICIES[type]

  if (!policy) {
    return <Navigate to={ROUTES.TERMS} replace />
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <a href="/" className={styles.back}>Ve trang chu</a>
        <p className={styles.kicker}>Luna Arcana</p>
        <h1>{policy.title}</h1>
        <p className={styles.updated}>{policy.updated}</p>
        <p className={styles.intro}>{policy.intro}</p>
      </section>

      <section className={styles.content} aria-label={policy.title}>
        {policy.sections.map(([heading, body]) => (
          <article key={heading} className={styles.section}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default PolicyPage
