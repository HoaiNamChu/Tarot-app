import styles from './Testi.module.css'

function Testi() {
    return (
        <section className={styles["testi-section"]}>
            <div className={styles["testi-inner"]}>
                <div className="sl" style={{ justifyContent: 'center' }}>Tiếng Nói Linh Hồn</div>
                <h2 className="section-title" style={{ textAlign: 'center' }}>Cảm Nhận Từ <em>Khách Hàng</em></h2>

                <div className={styles["tgrid"]}>
                    <div className={styles["tc"]}>
                        <div className={styles["tquote"]}>"</div>
                        <div className={styles["stars"]}>★★★★★</div>
                        <p className={styles["ttext"]}>"Buổi nói chuyện với Luna đã giúp mình tháo gỡ được khúc mắc trong chuyện tình cảm
                            suốt 2 năm qua. Năng lượng rất ấm áp."</p>
                        <div className={styles["tauthor"]}>
                            <div className={styles["adot"]}>M</div>
                            <div>
                                <div className={styles["aname"]}>Minh Phương</div>
                                <div className={styles["asince"]}>Tháng 10, 2023</div>
                            </div>
                        </div>
                    </div>
                    <div className={styles["tc"]}>
                        <div className={styles["tquote"]}>"</div>
                        <div className={styles["stars"]}>★★★★★</div>
                        <p className={styles["ttext"]}>"Sol đúng là vị cứu tinh của mình. Anh ấy chỉ ra chính xác điểm yếu trong định
                            hướng công việc và khuyên mình nên rẽ hướng."</p>
                        <div className={styles["tauthor"]}>
                            <div className={styles["adot"]}>T</div>
                            <div>
                                <div className={styles["aname"]}>Thành Nguyễn</div>
                                <div className={styles["asince"]}>Tháng 1, 2024</div>
                            </div>
                        </div>
                    </div>
                    <div className={styles["tc"]}>
                        <div className={styles["tquote"]}>"</div>
                        <div className={styles["stars"]}>★★★★★</div>
                        <p className={styles["ttext"]}>"Mọi thứ diễn ra rất tự nhiên và màu nhiệm. Lời khuyên của các vì sao qua lời Nova
                            thực sự làm mình thức tỉnh."</p>
                        <div className={styles["tauthor"]}>
                            <div className={styles["adot"]}>L</div>
                            <div>
                                <div className={styles["aname"]}>Linh Chi</div>
                                <div className={styles["asince"]}>Tháng 3, 2024</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Testi