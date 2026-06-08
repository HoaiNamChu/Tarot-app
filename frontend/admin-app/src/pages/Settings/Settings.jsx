import { useState } from 'react';

function Toggle({ checked, onChange }) {
    return (
        <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" defaultChecked={checked} style={{ opacity: 0, width: 0, height: 0 }} onChange={onChange} />
            <span style={{
                position: 'absolute', inset: 0, background: checked ? 'var(--gold)' : 'var(--panel-3)',
                borderRadius: 20, transition: '.3s', border: '1px solid var(--border-2)'
            }}>
                <span style={{
                    position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#fff',
                    top: 2, left: checked ? 18 : 2, transition: '.3s', boxShadow: '0 1px 3px rgba(0,0,0,.3)'
                }}></span>
            </span>
        </label>
    );
}

function SetRow({ name, desc, checked, input }) {
    const [val, setVal] = useState(checked);
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.75rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
                <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: '.15rem' }}>{name}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{desc}</div>
            </div>
            {input
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <input type="number" className="input" defaultValue={30} style={{ width: 65, textAlign: 'center' }} />
                    <span style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>%</span>
                </div>
                : <Toggle checked={val} onChange={() => setVal(!val)} />
            }
        </div>
    );
}

export default function Settings() {
    return (
        <div>
            <div className="g2">
                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Thông tin hệ thống</div></div>
                        <div className="card-body">
                            <div className="form-group"><label className="label">Tên thương hiệu</label><input type="text" className="input" defaultValue="Luna Arcana" /></div>
                            <div className="form-group"><label className="label">Email liên hệ</label><input type="email" className="input" defaultValue="hello@lunaarcana.com" /></div>
                            <div className="form-group"><label className="label">Số điện thoại</label><input type="tel" className="input" defaultValue="+84 987 654 321" /></div>
                            <div className="form-group"><label className="label">Địa chỉ</label><input type="text" className="input" defaultValue="Hà Nội, Vietnam" /></div>
                            <button className="form-submit">Lưu thay đổi</button>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Bảo mật</div></div>
                        <div className="card-body">
                            <div className="form-group"><label className="label">Mật khẩu hiện tại</label><input type="password" className="input" placeholder="••••••••" /></div>
                            <div className="form-group"><label className="label">Mật khẩu mới</label><input type="password" className="input" placeholder="••••••••" /></div>
                            <div className="form-group"><label className="label">Xác nhận mật khẩu mới</label><input type="password" className="input" placeholder="••••••••" /></div>
                            <button className="form-submit">Đổi mật khẩu</button>
                        </div>
                    </div>
                </div>

                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Đặt lịch</div></div>
                        <div className="card-body">
                            <SetRow name="Xác nhận tự động" desc="Tự động xác nhận lịch sau khi thanh toán" checked={false} />
                            <SetRow name="Nhắc lịch qua email" desc="Gửi email nhắc nhở trước 24h và 1h" checked={true} />
                            <SetRow name="Đặt lịch cùng ngày" desc="Khách có thể đặt lịch trong ngày hiện tại" checked={false} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Thanh toán</div></div>
                        <div className="card-body">
                            <SetRow name="VNPay" desc="Thanh toán qua cổng VNPay" checked={true} />
                            <SetRow name="MoMo" desc="Ví điện tử MoMo" checked={true} />
                            <SetRow name="Chuyển khoản ngân hàng" desc="Hướng dẫn chuyển khoản thủ công" checked={true} />
                            <SetRow name="Tỷ lệ hoa hồng Reader" desc="Phần trăm doanh thu chia cho Reader" checked={true} input />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Thông báo Admin</div></div>
                        <div className="card-body">
                            <SetRow name="Lịch đặt mới" desc="Nhận email khi có lịch mới" checked={true} />
                            <SetRow name="Đánh giá tiêu cực" desc="Cảnh báo khi có review 1-2 sao" checked={true} />
                            <SetRow name="Báo cáo tuần" desc="Nhận báo cáo tổng hợp mỗi thứ Hai" checked={true} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}