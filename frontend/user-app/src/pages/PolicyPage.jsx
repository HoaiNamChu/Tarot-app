import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { ROUTES } from '../constants/routes.js'
import styles from './PolicyPage.module.css'
import { api } from '../services/api.js'

const POLICIES = {
  terms: {
    title: 'Dieu khoan su dung',
    updated: '15/06/2026',
    intro: 'Cac dieu khoan nay ap dung cho viec dat lich, thanh toan va su dung dich vu tu van tarot cua Luna Arcana.',
    sections: [
      { heading: 'Pham vi dich vu', body: 'Luna Arcana cung cap lich hen tu van truc tuyen voi reader. Noi dung tu van mang tinh tham khao va khong thay the tu van y te, phap ly, tai chinh hoac quyet dinh chuyen mon.' },
      { heading: 'Tai khoan va thong tin dat lich', body: 'Khach hang can cung cap thong tin lien he chinh xac de nhan xac nhan, link phong hop va thong bao lien quan den lich hen.' },
      { heading: 'Thanh toan', body: 'Lich hen chi duoc giu trong thoi gian hien thi tai buoc thanh toan. He thong co the tu dong huy lich neu het han thanh toan hoac giao dich khong hop le.' },
      { heading: 'Hanh vi su dung', body: 'Khach hang khong duoc su dung dich vu cho hanh vi quang cao, lam phien, xam pham quyen rieng tu, hoac noi dung vi pham phap luat.' },
    ],
  },
  privacy: {
    title: 'Chinh sach bao mat thong tin',
    updated: '15/06/2026',
    intro: 'Chinh sach nay mo ta cach Luna Arcana thu thap, su dung va bao ve du lieu cua khach hang.',
    sections: [
      { heading: 'Thong tin thu thap', body: 'Chung toi co the thu thap ho ten, email, so dien thoai, lich su dat lich, noi dung ghi chu va thong tin thanh toan can thiet de xu ly don hang.' },
      { heading: 'Muc dich su dung', body: 'Du lieu duoc dung de tao lich, gui email thong bao, ho tro khach hang, xac minh thanh toan va cai thien chat luong dich vu.' },
      { heading: 'Bao ve du lieu', body: 'He thong gioi han quyen truy cap theo vai tro admin, reader va khach hang. Cac khoa bi mat thanh toan khong duoc hien thi lai sau khi luu.' },
      { heading: 'Yeu cau ho tro', body: 'Khach hang co the lien he de yeu cau cap nhat thong tin ca nhan hoac duoc giai thich ve du lieu dang duoc luu tru.' },
    ],
  },
  payment: {
    title: 'Chinh sach thanh toan',
    updated: '15/06/2026',
    intro: 'Trang nay giai thich cac hinh thuc thanh toan va trang thai xu ly lich hen.',
    sections: [
      { heading: 'Phuong thuc ho tro', body: 'Luna Arcana co the bat hoac tat tung phuong thuc thanh toan nhu chuyen khoan ngan hang, MoMo va VNPay theo cau hinh he thong.' },
      { heading: 'Giu lich tam thoi', body: 'Sau khi tao lich, he thong giu khung gio trong thoi gian gioi han. Neu qua han ma chua thanh toan, lich co the tu dong huy de tra lai slot cho reader.' },
      { heading: 'Thanh toan tu dong', body: 'Voi cong thanh toan tu dong, trang thai lich duoc cap nhat theo ket qua tra ve tu nha cung cap. Khach hang khong nen dong trang khi giao dich dang xu ly.' },
      { heading: 'Xac minh thu cong', body: 'Voi chuyen khoan ngan hang, admin se xac minh giao dich va cap nhat trang thai thanh toan khi tien da vao tai khoan.' },
    ],
  },
  refund: {
    title: 'Chinh sach hoan tien',
    updated: '15/06/2026',
    intro: 'Chinh sach hoan tien giup khach hang nam ro cac truong hop duoc ho tro va cach thuc xu ly.',
    sections: [
      { heading: 'Truong hop co the hoan tien', body: 'Khach hang co the duoc hoan tien khi lich bi huy do loi van hanh, reader khong the thuc hien lich, hoac giao dich bi thu tien nhung khong tao duoc lich hop le.' },
      { heading: 'Truong hop can xem xet', body: 'Yeu cau huy sat gio hen, vang mat hoac cung cap thong tin lien he sai se duoc admin xem xet theo tung truong hop cu the.' },
      { heading: 'Hinh thuc hoan tien', body: 'Hoan tien duoc thuc hien theo phuong thuc phu hop voi giao dich goc hoac chuyen khoan thu cong sau khi doi soat.' },
      { heading: 'Thoi gian xu ly', body: 'Thoi gian xu ly phu thuoc vao ngan hang hoac cong thanh toan. Admin se cap nhat trang thai trong lich su thanh toan cua khach hang.' },
    ],
  },
}

function PolicyPage({ type }) {
  const fallbackPolicy = POLICIES[type]
  const [remotePolicy, setRemotePolicy] = useState(null)

  useEffect(() => {
    let active = true
    setRemotePolicy(null)

    if (fallbackPolicy) {
      api.policies.get(type)
        .then(data => {
          if (active) setRemotePolicy(data)
        })
        .catch(() => {
          if (active) setRemotePolicy(null)
        })
    }

    return () => {
      active = false
    }
  }, [fallbackPolicy, type])

  const policy = remotePolicy || fallbackPolicy

  if (!policy) {
    return <Navigate to={ROUTES.TERMS} replace />
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <a href="/" className={styles.back}>Ve trang chu</a>
        <p className={styles.kicker}>Luna Arcana</p>
        <h1>{policy.title}</h1>
        <p className={styles.updated}>Cap nhat: {policy.updated}</p>
        <p className={styles.intro}>{policy.intro}</p>
      </section>

      <section className={styles.content} aria-label={policy.title}>
        {policy.sections.map((section) => (
          <article key={section.heading} className={styles.section}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default PolicyPage
