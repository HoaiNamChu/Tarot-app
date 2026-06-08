import styles from './Header.module.css';

function Header() {
  return (
    <header className={styles.hero}>
        <div className={`${styles['hero-card']} ${styles['hero-card-1']}`}>
            <div className={styles['hero-card-roman']}>I</div>
            <div className={styles['hero-card-icon']}>🧙‍♂️</div>
            <div className={styles['hero-card-name']}>The Magician</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-2']}`}>
            <div className={styles['hero-card-roman']}>XVII</div>
            <div className={styles['hero-card-icon']}>⭐</div>
            <div className={styles['hero-card-name']}>The Star</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-3']}`}>
            <div className={styles['hero-card-roman']}>III</div>
            <div className={styles['hero-card-icon']}>👑</div>
            <div className={styles['hero-card-name']}>The Empress</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-4']}`}>
            <div className={styles['hero-card-roman']}>X</div>
            <div className={styles['hero-card-icon']}>🎡</div>
            <div className={styles['hero-card-name']}>Wheel of Fortune</div>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-5']}`}>
            <span className={styles['hero-card-icon']}>🔮</span>
        </div>
        <div className={`${styles['hero-card']} ${styles['hero-card-6']}`}>
            <span className={styles['hero-card-icon']}>💞</span>
        </div>

        <div className={styles.badge}>✦ Năng Lượng Đang Hội Tụ ✦</div>
        <div className={styles['hero-eyebrow']}>Tarot · Chiêm tinh · Huyền học</div>
        <h1>Lắng nghe<br /><em>vũ trụ</em><br />nói gì</h1>
        <p className={styles['hero-sub']}>Mỗi lá bài là một thông điệp. Mỗi buổi đọc là một hành trình khám phá nội tâm và định hướng tương lai.</p>
        <div className={styles['hero-btns']}>
            <a href="#booking" className={styles['btn-primary']}>Đặt Lịch Ngay</a>
            <a href="#free-reading" className={styles['btn-ghost']}>Rút Bài Miễn Phí</a>
        </div>
        <div className={styles['scroll-hint']}>
            <span>Scroll</span>
            <div className={styles['scroll-line']}></div>
        </div>
    </header>
  )
}

export default Header