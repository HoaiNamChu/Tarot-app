import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { ROUTES } from '../constants/routes.js'
import styles from './PolicyPage.module.css'
import { api } from '../services/api.js'

const POLICIES = {
  terms: {
    title: 'Điều khoản sử dụng',
    updated: '15/06/2026',
    intro: 'Các điều khoản này áp dụng cho việc đặt lịch, thanh toán và sử dụng dịch vụ tư vấn Tarot của Luna Arcana.',
    sections: [
      { heading: 'Phạm vi dịch vụ', body: 'Luna Arcana cung cấp lịch hẹn tư vấn trực tuyến với reader. Nội dung tư vấn chỉ mang tính tham khảo, không thay thế tư vấn y tế, pháp lý, tài chính hoặc quyết định chuyên môn.' },
      { heading: 'Tài khoản và thông tin đặt lịch', body: 'Khách hàng cần cung cấp thông tin liên hệ chính xác để nhận xác nhận, đường dẫn phòng họp và thông báo liên quan đến lịch hẹn.' },
      { heading: 'Thanh toán', body: 'Lịch hẹn chỉ được giữ trong thời gian hiển thị ở bước thanh toán. Hệ thống có thể tự động hủy lịch nếu hết hạn thanh toán hoặc giao dịch không hợp lệ.' },
      { heading: 'Hành vi sử dụng', body: 'Khách hàng không được sử dụng dịch vụ để quảng cáo, làm phiền, xâm phạm quyền riêng tư hoặc đăng nội dung vi phạm pháp luật.' },
    ],
  },
  privacy: {
    title: 'Chính sách bảo mật thông tin',
    updated: '15/06/2026',
    intro: 'Chính sách này mô tả cách Luna Arcana thu thập, sử dụng và bảo vệ dữ liệu của khách hàng.',
    sections: [
      { heading: 'Thông tin thu thập', body: 'Chúng tôi có thể thu thập họ tên, email, số điện thoại, lịch sử đặt lịch, nội dung ghi chú và thông tin thanh toán cần thiết để xử lý đơn hàng.' },
      { heading: 'Mục đích sử dụng', body: 'Dữ liệu được dùng để tạo lịch, gửi email thông báo, hỗ trợ khách hàng, xác minh thanh toán và cải thiện chất lượng dịch vụ.' },
      { heading: 'Bảo vệ dữ liệu', body: 'Hệ thống giới hạn quyền truy cập theo vai trò quản trị viên, reader và khách hàng. Khóa bí mật thanh toán không được hiển thị lại sau khi lưu.' },
      { heading: 'Yêu cầu hỗ trợ', body: 'Khách hàng có thể liên hệ để yêu cầu cập nhật thông tin cá nhân hoặc được giải thích về dữ liệu đang được lưu trữ.' },
    ],
  },
  payment: {
    title: 'Chính sách thanh toán',
    updated: '15/06/2026',
    intro: 'Trang này giải thích các hình thức thanh toán và trạng thái xử lý lịch hẹn.',
    sections: [
      { heading: 'Phương thức hỗ trợ', body: 'Luna Arcana có thể bật hoặc tắt từng phương thức thanh toán như chuyển khoản ngân hàng, MoMo và VNPay theo cấu hình hệ thống.' },
      { heading: 'Giữ lịch tạm thời', body: 'Sau khi tạo lịch, hệ thống giữ khung giờ trong thời gian giới hạn. Nếu quá hạn mà chưa thanh toán, lịch có thể tự động hủy để trả lại khung giờ cho reader.' },
      { heading: 'Thanh toán tự động', body: 'Với cổng thanh toán tự động, trạng thái lịch được cập nhật theo kết quả từ nhà cung cấp. Khách hàng không nên đóng trang khi giao dịch đang xử lý.' },
      { heading: 'Xác minh thủ công', body: 'Với chuyển khoản ngân hàng, quản trị viên sẽ xác minh giao dịch và cập nhật trạng thái thanh toán khi tiền đã vào tài khoản.' },
    ],
  },
  refund: {
    title: 'Chính sách hoàn tiền',
    updated: '15/06/2026',
    intro: 'Chính sách hoàn tiền giúp khách hàng nắm rõ các trường hợp được hỗ trợ và cách thức xử lý.',
    sections: [
      { heading: 'Trường hợp có thể hoàn tiền', body: 'Khách hàng có thể được hoàn tiền khi lịch bị hủy do lỗi vận hành, reader không thể thực hiện lịch hoặc giao dịch bị trừ tiền nhưng không tạo được lịch hợp lệ.' },
      { heading: 'Trường hợp cần xem xét', body: 'Yêu cầu hủy sát giờ hẹn, vắng mặt hoặc cung cấp thông tin liên hệ sai sẽ được quản trị viên xem xét theo từng trường hợp cụ thể.' },
      { heading: 'Hình thức hoàn tiền', body: 'Hoàn tiền được thực hiện theo phương thức phù hợp với giao dịch gốc hoặc chuyển khoản thủ công sau khi đối soát.' },
      { heading: 'Thời gian xử lý', body: 'Thời gian xử lý phụ thuộc vào ngân hàng hoặc cổng thanh toán. Quản trị viên sẽ cập nhật trạng thái trong lịch sử thanh toán của khách hàng.' },
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
        <a href="/" className={styles.back}>Về trang chủ</a>
        <p className={styles.kicker}>Luna Arcana</p>
        <h1>{policy.title}</h1>
        <p className={styles.updated}>Cập nhật: {policy.updated}</p>
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
