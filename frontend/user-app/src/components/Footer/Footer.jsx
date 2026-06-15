import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants/routes.js'
import styles from './Footer.module.css'

function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles['footer-inner']}>
                <div className={styles['footer-col']}>
                    <span className={styles['footer-logo']}>Luna Arcana</span>
                    <p className={styles['footer-tagline']}>
                        Noi anh sang cua cac vi sao soi ro tam hon, mang den su thau hieu cho hanh trinh cua ban.
                    </p>
                    <div className={styles.fsocials}>
                        <a href="#" className={styles.fsl} aria-label="Facebook">f</a>
                        <a href="#" className={styles.fsl} aria-label="Instagram">ig</a>
                        <a href="#" className={styles.fsl} aria-label="YouTube">yt</a>
                    </div>
                </div>

                <div className={styles['footer-col']}>
                    <h4 className={styles['footer-col-title']}>Kham pha</h4>
                    <ul className={styles.flinks}>
                        <li><a href="/#services" className={styles['flinks-item']}>Dich vu</a></li>
                        <li><a href="/#readers" className={styles['flinks-item']}>Readers</a></li>
                        <li><a href="/#free-reading" className={styles['flinks-item']}>Rut bai mien phi</a></li>
                    </ul>
                </div>

                <div className={styles['footer-col']}>
                    <h4 className={styles['footer-col-title']}>Ho tro</h4>
                    <ul className={styles.flinks}>
                        <li><Link to={ROUTES.TERMS} className={styles['flinks-item']}>Dieu khoan su dung</Link></li>
                        <li><Link to={ROUTES.PAYMENT_POLICY} className={styles['flinks-item']}>Chinh sach thanh toan</Link></li>
                        <li><Link to={ROUTES.REFUND_POLICY} className={styles['flinks-item']}>Chinh sach hoan tien</Link></li>
                        <li><Link to={ROUTES.PRIVACY} className={styles['flinks-item']}>Bao mat thong tin</Link></li>
                    </ul>
                </div>

                <div className={styles['footer-col']}>
                    <h4 className={styles['footer-col-title']}>Lien he</h4>
                    <ul className={styles.flinks}>
                        <li><a href="mailto:hello@lunaarcana.com" className={styles['flinks-item']}>hello@lunaarcana.com</a></li>
                        <li><a href="tel:+84987654321" className={styles['flinks-item']}>+84 987 654 321</a></li>
                        <li><span className={styles['flinks-item']}>Ha Noi, Vietnam</span></li>
                    </ul>
                </div>
            </div>

            <div className={styles['footer-bottom']}>
                <span>&copy; 2026 Luna Arcana. All rights reserved.</span>
                <span>Tarot readings by appointment.</span>
            </div>
        </footer>
    )
}

export default Footer
