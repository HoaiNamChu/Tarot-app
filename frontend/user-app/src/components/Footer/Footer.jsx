import styles from './Footer.module.css'

function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles['footer-inner']}>
                <div className={styles['footer-col']}>
                    <span className={styles['footer-logo']}>Luna Arcana</span>
                    <p className={styles['footer-tagline']}>Nơi ánh sáng của các vì sao soi rọi tâm hồn, mang đến sự chữa lành và thấu
                        suốt cho hành trình của bạn.</p>
                    <div className={styles.fsocials}>
                        <a href="#" className={styles.fsl}>f</a>
                        <a href="#" className={styles.fsl}>ig</a>
                        <a href="#" className={styles.fsl}>yt</a>
                    </div>
                </div>
                <div className={styles['footer-col']}>
                    <h4 className={styles['footer-col-title']}>Khám Phá</h4>
                    <ul className={styles.flinks}>
                        <li><a href="#services" className={styles['flinks-item']}>Dịch Vụ</a></li>
                        <li><a href="#readers" className={styles['flinks-item']}>Readers</a></li>
                        <li><a href="#free-reading" className={styles['flinks-item']}>Rút Bài Miễn Phí</a></li>
                    </ul>
                </div>
                <div className={styles['footer-col']}>
                    <h4 className={styles['footer-col-title']}>Hỗ Trợ</h4>
                    <ul className={styles.flinks}>
                        <li><a href="#" className={styles['flinks-item']}>FAQ</a></li>
                        <li><a href="#" className={styles['flinks-item']}>Chính Sách Thanh Toán</a></li>
                        <li><a href="#" className={styles['flinks-item']}>Bảo Mật Thông Tin</a></li>
                    </ul>
                </div>
                <div className={styles['footer-col']}>
                    <h4 className={styles['footer-col-title']}>Liên Hệ</h4>
                    <ul className={styles.flinks}>
                        <li><a href="#" className={styles['flinks-item']}>hello@lunaarcana.com</a></li>
                        <li><a href="#" className={styles['flinks-item']}>+84 987 654 321</a></li>
                        <li><a href="#" className={styles['flinks-item']}>Hà Nội, Vietnam</a></li>
                    </ul>
                </div>
            </div>
            <div className={styles['footer-bottom']}>
                <span>&copy; 2024 Luna Arcana. All rights reserved.</span>
                <span>Design crafted with magic.</span>
            </div>
        </footer>
    )
}

export default Footer