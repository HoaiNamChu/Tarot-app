import styles from './Header.module.css';

function Header() {
  return (
    <header className={styles.hero}>
        <div className={`${styles['hero-card']} ${styles['hero-card-1']}`}>
            <div className={styles['hero-card-roman']}>I</div>
            <div className={styles['hero-card-icon']}>Magician</div>
            <div className={styles['hero-card-name']}>The Magician</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-2']}`}>
            <div className={styles['hero-card-roman']}>XVII</div>
            <div className={styles['hero-card-icon']}>Star</div>
            <div className={styles['hero-card-name']}>The Star</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-3']}`}>
            <div className={styles['hero-card-roman']}>III</div>
            <div className={styles['hero-card-icon']}>Empress</div>
            <div className={styles['hero-card-name']}>The Empress</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-4']}`}>
            <div className={styles['hero-card-roman']}>X</div>
            <div className={styles['hero-card-icon']}>Wheel</div>
            <div className={styles['hero-card-name']}>Wheel of Fortune</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-5']}`}>
            <span className={styles['hero-card-icon']}>Oracle</span>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-6']}`}>
            <span className={styles['hero-card-icon']}>Heart</span>
        </div>

        <div className={styles.badge}>Nang luong dang hoi tu</div>
        <div className={styles['hero-eyebrow']}>Tarot · Chiem tinh · Huyen hoc</div>
        <h1>Lang nghe<br /><em>vu tru</em><br />noi gi</h1>
        <p className={styles['hero-sub']}>Moi la bai la mot thong diep. Moi buoi doc la mot hanh trinh kham pha noi tam va dinh huong tuong lai.</p>
        <div className={styles['hero-btns']}>
            <a href="#booking" className={styles['btn-primary']}>Dat lich ngay</a>
            <a href="#free-reading" className={styles['btn-ghost']}>Rut bai mien phi</a>
        </div>
        <div className={styles['scroll-hint']}>
            <span>Scroll</span>
            <div className={styles['scroll-line']}></div>
        </div>
    </header>
  );
}

export default Header;
