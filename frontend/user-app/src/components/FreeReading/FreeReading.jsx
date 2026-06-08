import { useState, useEffect } from 'react';
import styles from './FreeReading.module.css';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

const tarotCards = [
  // ── MAJOR ARCANA ──
  { name: "The Fool", slug: "the-fool", desc: "Sự khởi đầu mới, ngây thơ, tự do và niềm tin mù quáng. Đã đến lúc bước ra khỏi vùng an toàn." },
  { name: "The Magician", slug: "the-magician", desc: "Hành động, sáng tạo và biểu hiện. Bạn đang nắm giữ đủ công cụ để đạt được mong muốn." },
  { name: "The High Priestess", slug: "the-high-priestess", desc: "Trực giác, thế giới tiềm thức và bí ẩn. Hãy lắng nghe tiếng nói bên trong tâm hồn bạn." },
  { name: "The Empress", slug: "the-empress", desc: "Sinh sôi, trù phú, nữ tính và nuôi dưỡng. Một năng lượng dồi dào đang bao quanh bạn." },
  { name: "The Emperor", slug: "the-emperor", desc: "Cấu trúc, quyền lực và sự ổn định. Bạn cần đưa ra kỷ luật và xây dựng nền tảng vững chắc." },
  { name: "The Hierophant", slug: "the-hierophant", desc: "Truyền thống, tín ngưỡng và sự hướng dẫn tâm linh. Hãy tìm kiếm sự khôn ngoan từ người đi trước." },
  { name: "The Lovers", slug: "the-lovers", desc: "Tình yêu, sự hòa hợp và những lựa chọn quan trọng từ trái tim. Sự gắn kết đồng điệu." },
  { name: "The Chariot", slug: "the-chariot", desc: "Kiểm soát, ý chí và chiến thắng. Vượt qua khó khăn bằng sự quyết tâm cao độ." },
  { name: "Strength", slug: "strength", desc: "Dũng cảm, sự thuyết phục và đam mê. Dùng sự mềm mỏng để chế ngự sức mạnh bên trong." },
  { name: "The Hermit", slug: "the-hermit", desc: "Suy ngẫm, tìm kiếm chân lý nội tâm. Khoảng thời gian tốt để ở một mình và tĩnh tâm." },
  { name: "Wheel of Fortune", slug: "wheel-of-fortune", desc: "Nghiệp quả, định mệnh và bước ngoặt. Bánh xe vận mệnh đang xoay, hãy thuận theo dòng chảy." },
  { name: "Justice", slug: "justice", desc: "Công lý, sự cân bằng và sự thật. Mọi hành động đều có hệ quả tương xứng, hãy hành động có trách nhiệm." },
  { name: "The Hanged Man", slug: "the-hanged-man", desc: "Buông bỏ, nhìn nhận từ góc độ khác. Đôi khi dừng lại chính là cách tiến về phía trước." },
  { name: "Death", slug: "death", desc: "Sự chuyển hóa và kết thúc để tái sinh. Đừng sợ sự thay đổi, nó mang đến những cơ hội mới." },
  { name: "Temperance", slug: "temperance", desc: "Cân bằng, kiên nhẫn và sự điều độ. Hòa hợp các yếu tố đối lập để tìm thấy sự bình an." },
  { name: "The Devil", slug: "the-devil", desc: "Ràng buộc, cám dỗ và ảo tưởng. Nhận ra những gì đang giam cầm bạn để tìm đường thoát ra." },
  { name: "The Tower", slug: "the-tower", desc: "Sự đột phá và thay đổi đột ngột. Những nền tảng không vững chắc cần được phá bỏ và xây dựng lại." },
  { name: "The Star", slug: "the-star", desc: "Hy vọng, niềm tin và sự chữa lành. Ánh sáng le lói sau những chuỗi ngày tăm tối nhất." },
  { name: "The Moon", slug: "the-moon", desc: "Ảo ảnh, sợ hãi và tiềm thức. Có những điều ẩn khuất chưa được phơi bày, hãy tin vào trực giác." },
  { name: "The Sun", slug: "the-sun", desc: "Thành công, rạng rỡ và tích cực. Niềm vui và ánh sáng sẽ xua tan mọi mây mù u ám." },
  { name: "Judgement", slug: "judgement", desc: "Thức tỉnh, tha thứ và tái sinh. Hãy lắng nghe tiếng gọi của linh hồn và dũng cảm bước lên." },
  { name: "The World", slug: "the-world", desc: "Hoàn thành, tích hợp và thành tựu. Bạn đang ở đỉnh cao của một chu kỳ quan trọng trong cuộc đời." },

  // ── WANDS ──
  { name: "Ace of Wands", slug: "ace-of-wands", desc: "Nguồn cảm hứng mới, tiềm năng sáng tạo và sức mạnh khởi đầu. Hãy nắm lấy cơ hội đang đến." },
  { name: "Two of Wands", slug: "two-of-wands", desc: "Lập kế hoạch, tầm nhìn xa và sự mở rộng. Bạn đang đứng trước một quyết định quan trọng về tương lai." },
  { name: "Three of Wands", slug: "three-of-wands", desc: "Mở rộng, chờ đợi kết quả và nhìn về phía trước. Những nỗ lực đang bắt đầu đơm hoa kết trái." },
  { name: "Four of Wands", slug: "four-of-wands", desc: "Lễ kỷ niệm, sự hài hòa và thành tựu. Đây là thời điểm vui mừng và tận hưởng những gì đã đạt được." },
  { name: "Five of Wands", slug: "five-of-wands", desc: "Xung đột, cạnh tranh và thử thách. Hãy đối mặt với sự hỗn loạn và tìm cách vượt qua nó." },
  { name: "Six of Wands", slug: "six-of-wands", desc: "Chiến thắng, được công nhận và thành công. Nỗ lực của bạn đang được ghi nhận và đánh giá cao." },
  { name: "Seven of Wands", slug: "seven-of-wands", desc: "Bảo vệ lập trường, kiên định và dũng cảm. Đứng vững trước những áp lực và thách thức từ bên ngoài." },
  { name: "Eight of Wands", slug: "eight-of-wands", desc: "Tốc độ, hành động nhanh và sự tiến triển. Mọi thứ đang diễn ra nhanh chóng, hãy sẵn sàng thích ứng." },
  { name: "Nine of Wands", slug: "nine-of-wands", desc: "Kiên trì, phòng thủ và sức bền. Dù mệt mỏi, bạn vẫn có đủ sức mạnh để về đích." },
  { name: "Ten of Wands", slug: "ten-of-wands", desc: "Gánh nặng, trách nhiệm quá mức và áp lực. Đã đến lúc buông bớt và phân chia công việc." },
  { name: "Page of Wands", slug: "page-of-wands", desc: "Nhiệt huyết, khám phá và tinh thần phiêu lưu. Một thông điệp mới hay cơ hội thú vị sắp xuất hiện." },
  { name: "Knight of Wands", slug: "knight-of-wands", desc: "Năng lượng mạnh mẽ, táo bạo và hành động quyết đoán. Hãy theo đuổi đam mê với tất cả nhiệt huyết." },
  { name: "Queen of Wands", slug: "queen-of-wands", desc: "Tự tin, quyến rũ và lãnh đạo. Bạn có khả năng truyền cảm hứng cho những người xung quanh." },
  { name: "King of Wands", slug: "king-of-wands", desc: "Tầm nhìn, lãnh đạo mạnh mẽ và tinh thần doanh nhân. Hãy dẫn dắt với sự tự tin và đam mê." },

  // ── CUPS ──
  { name: "Ace of Cups", slug: "ace-of-cups", desc: "Tình yêu mới, cảm xúc dồi dào và sự mở lòng. Trái tim bạn sẵn sàng đón nhận điều tốt đẹp." },
  { name: "Two of Cups", slug: "two-of-cups", desc: "Kết nối, đối tác và tình yêu hài hòa. Một mối quan hệ đẹp đang được xây dựng trên nền tảng tin tưởng." },
  { name: "Three of Cups", slug: "three-of-cups", desc: "Tình bạn, lễ kỷ niệm và niềm vui cộng đồng. Hãy chia sẻ hạnh phúc với những người thân yêu." },
  { name: "Four of Cups", slug: "four-of-cups", desc: "Suy tư, chán nản và bỏ lỡ cơ hội. Hãy mở mắt nhìn ra những điều tốt đẹp đang chờ đợi bạn." },
  { name: "Five of Cups", slug: "five-of-cups", desc: "Mất mát, hối tiếc và đau buồn. Nhưng vẫn còn những điều tốt đẹp phía sau, đừng chìm đắm trong quá khứ." },
  { name: "Six of Cups", slug: "six-of-cups", desc: "Hoài niệm, kỷ niệm và sự ngây thơ. Quá khứ mang đến bài học quý giá cho hiện tại." },
  { name: "Seven of Cups", slug: "seven-of-cups", desc: "Ảo mộng, lựa chọn và tưởng tượng. Hãy phân biệt thực tế với những giấc mơ hão huyền." },
  { name: "Eight of Cups", slug: "eight-of-cups", desc: "Rời bỏ, tìm kiếm ý nghĩa sâu xa hơn. Đã đến lúc buông bỏ những thứ không còn phù hợp." },
  { name: "Nine of Cups", slug: "nine-of-cups", desc: "Mãn nguyện, ước muốn thành hiện thực và hạnh phúc. Đây là thời điểm tận hưởng những điều tốt đẹp." },
  { name: "Ten of Cups", slug: "ten-of-cups", desc: "Hạnh phúc gia đình, hòa hợp và viên mãn. Tình yêu thương bao quanh và cuộc sống tràn đầy ý nghĩa." },
  { name: "Page of Cups", slug: "page-of-cups", desc: "Nhạy cảm, sáng tạo và thông điệp cảm xúc. Hãy tin vào trực giác và mở lòng với những điều bất ngờ." },
  { name: "Knight of Cups", slug: "knight-of-cups", desc: "Lãng mạn, lý tưởng và theo đuổi trái tim. Hành động xuất phát từ tình yêu và cảm xúc chân thật." },
  { name: "Queen of Cups", slug: "queen-of-cups", desc: "Đồng cảm, trực giác mạnh và sự chăm sóc. Bạn có khả năng cảm nhận và chữa lành những người xung quanh." },
  { name: "King of Cups", slug: "king-of-cups", desc: "Cân bằng cảm xúc, trí tuệ và lòng trắc ẩn. Lãnh đạo bằng trái tim và sự thấu hiểu sâu sắc." },

  // ── SWORDS ──
  { name: "Ace of Swords", slug: "ace-of-swords", desc: "Sự rõ ràng, sự thật và ý tưởng mới mẻ. Cắt bỏ những ảo tưởng để nhìn thấy sự thật." },
  { name: "Two of Swords", slug: "two-of-swords", desc: "Bế tắc, lưỡng lự và tránh né quyết định. Đã đến lúc mở mắt và đối mặt với sự thật." },
  { name: "Three of Swords", slug: "three-of-swords", desc: "Đau lòng, mất mát và nỗi đau cảm xúc. Cho phép bản thân chữa lành qua những giọt nước mắt." },
  { name: "Four of Swords", slug: "four-of-swords", desc: "Nghỉ ngơi, phục hồi và tĩnh tâm. Cơ thể và tâm hồn cần được nạp lại năng lượng." },
  { name: "Five of Swords", slug: "five-of-swords", desc: "Xung đột, thất bại và chiến thắng rỗng tuếch. Đôi khi thắng cuộc nhưng lại mất đi điều quan trọng hơn." },
  { name: "Six of Swords", slug: "six-of-swords", desc: "Chuyển tiếp, chuyển dịch và hướng tới bình yên. Rời khỏi giai đoạn khó khăn để tiến đến vùng an toàn hơn." },
  { name: "Seven of Swords", slug: "seven-of-swords", desc: "Lừa dối, chiến lược và hành động lén lút. Hãy cẩn thận với sự gian dối xung quanh bạn." },
  { name: "Eight of Swords", slug: "eight-of-swords", desc: "Bị ràng buộc, hạn chế và cảm giác bất lực. Thực ra bạn có nhiều lựa chọn hơn bạn nghĩ." },
  { name: "Nine of Swords", slug: "nine-of-swords", desc: "Lo lắng, ác mộng và nỗi sợ hãi. Hầu hết những điều bạn lo sợ không tệ như bạn tưởng tượng." },
  { name: "Ten of Swords", slug: "ten-of-swords", desc: "Kết thúc đau đớn, thất bại và chạm đáy. Nhưng sau mỗi kết thúc là một khởi đầu mới tươi sáng hơn." },
  { name: "Page of Swords", slug: "page-of-swords", desc: "Tò mò, nhanh nhẹn và khát khao học hỏi. Hãy thu thập thông tin trước khi đưa ra quyết định." },
  { name: "Knight of Swords", slug: "knight-of-swords", desc: "Quyết đoán, nhanh chóng và thẳng thắn. Hành động mạnh mẽ nhưng cần suy nghĩ kỹ trước khi lao vào." },
  { name: "Queen of Swords", slug: "queen-of-swords", desc: "Thông minh, độc lập và thẳng thắn. Nhìn nhận sự thật bằng trí tuệ sắc bén và không cảm tính." },
  { name: "King of Swords", slug: "king-of-swords", desc: "Quyền lực trí tuệ, công bằng và tư duy phân tích. Đưa ra quyết định dựa trên logic và sự thật." },

  // ── PENTACLES ──
  { name: "Ace of Pentacles", slug: "ace-of-pentacles", desc: "Cơ hội tài chính mới, sự thịnh vượng và nền tảng vật chất. Một khởi đầu đầy hứa hẹn đang đến." },
  { name: "Two of Pentacles", slug: "two-of-pentacles", desc: "Cân bằng, linh hoạt và quản lý nhiều việc cùng lúc. Hãy ưu tiên và sắp xếp công việc khôn ngoan hơn." },
  { name: "Three of Pentacles", slug: "three-of-pentacles", desc: "Hợp tác, kỹ năng và làm việc nhóm. Sự kết hợp tài năng tạo nên kết quả vượt trội." },
  { name: "Four of Pentacles", slug: "four-of-pentacles", desc: "Giữ chặt, kiểm soát và sự an toàn vật chất. Đừng để sự sợ hãi ngăn bạn chia sẻ và phát triển." },
  { name: "Five of Pentacles", slug: "five-of-pentacles", desc: "Khó khăn tài chính, thiếu thốn và cô đơn. Hãy tìm kiếm sự giúp đỡ vì nó luôn hiện diện xung quanh bạn." },
  { name: "Six of Pentacles", slug: "six-of-pentacles", desc: "Hào phóng, chia sẻ và sự cân bằng trong cho và nhận. Lòng tốt sẽ quay trở lại với bạn." },
  { name: "Seven of Pentacles", slug: "seven-of-pentacles", desc: "Kiên nhẫn, đánh giá và đầu tư dài hạn. Hãy nhìn lại những gì đã xây dựng và điều chỉnh hướng đi." },
  { name: "Eight of Pentacles", slug: "eight-of-pentacles", desc: "Chăm chỉ, học hỏi và phát triển kỹ năng. Sự tận tâm và luyện tập sẽ dẫn đến sự thành thạo." },
  { name: "Nine of Pentacles", slug: "nine-of-pentacles", desc: "Độc lập, tự chủ tài chính và tận hưởng thành quả. Bạn xứng đáng được hưởng những điều tốt đẹp." },
  { name: "Ten of Pentacles", slug: "ten-of-pentacles", desc: "Sự thịnh vượng gia đình, di sản và thành công lâu dài. Nền tảng vững chắc được xây dựng qua nhiều thế hệ." },
  { name: "Page of Pentacles", slug: "page-of-pentacles", desc: "Tham vọng, học hỏi thực tế và khởi đầu mới trong công việc. Hãy tập trung và kiên định với mục tiêu." },
  { name: "Knight of Pentacles", slug: "knight-of-pentacles", desc: "Trách nhiệm, kiên nhẫn và đáng tin cậy. Tiến chậm nhưng chắc chắn sẽ dẫn đến thành công bền vững." },
  { name: "Queen of Pentacles", slug: "queen-of-pentacles", desc: "Thực tế, chu đáo và nuôi dưỡng. Tạo ra môi trường ấm áp và thịnh vượng cho bản thân và gia đình." },
  { name: "King of Pentacles", slug: "king-of-pentacles", desc: "Thành công vật chất, lãnh đạo tài chính và sự ổn định. Bạn có khả năng tạo ra sự thịnh vượng lâu dài." },
];

const POSITIONS = ["Quá Khứ / Bối Cảnh", "Hiện Tại / Vấn Đề", "Tương Lai / Lời Khuyên"];

function shuffle(array) {
  const arr = [...array];
  let i = arr.length;
  while (i) {
    const j = Math.floor(Math.random() * i--);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Thêm hook này vào đầu file, trước function FreeReading
function useTypewriter(text, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(false); return; }

    setDisplayed('');
    setDone(false);
    let i = 0;

    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

function FreeReading() {
  const showToast = useToast();
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState('draw');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([false, false, false]);
  const [glowed, setGlowed] = useState([false, false, false]);
  const [kwVisible, setKwVisible] = useState([false, false, false]);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [entered, setEntered] = useState([false, false, false]);
  const [shuffling, setShuffling] = useState(false);
  const [limit, setLimit] = useState(null);
  const [interpretation, setInterpretation] = useState('');
  const { displayed: typedText, done: typingDone } = useTypewriter(interpretation, 18);
  const [interpreting, setInterpreting] = useState(false);

  useEffect(() => {
    api.readings.getLimit()
      .then(setLimit)
      .catch(() => { });
  }, []);

  async function startReading() {
    if (!question.trim()) {
      showToast('Hãy hít sâu và nhập điều bạn đang trăn trở nhé!');
      return;
    }

    try {
      const res = await api.readings.useLimit();
      setLimit(res);
    } catch (e) {
      showToast(e.message);
      return;
    }

    setShuffling(true);
    setInterpretation('');
    showToast('Vũ trụ đang kết nối năng lượng...');

    setTimeout(() => {
      const selected = shuffle(tarotCards).slice(0, 3).map(card => ({
        ...card,
        isReversed: Math.random() > 0.7,
      }));

      setCards(selected);
      setPhase('result');
      setFlipped([false, false, false]);
      setGlowed([false, false, false]);
      setKwVisible([false, false, false]);
      setCtaVisible(false);
      setEntered([false, false, false]);

      setTimeout(() => {
        [0, 1, 2].forEach(i => {
          setTimeout(() => {
            setEntered(prev => { const a = [...prev]; a[i] = true; return a; });
            setTimeout(() => {
              setFlipped(prev => { const a = [...prev]; a[i] = true; return a; });
              setTimeout(() => {
                setGlowed(prev => { const a = [...prev]; a[i] = true; return a; });
                setKwVisible(prev => { const a = [...prev]; a[i] = true; return a; });
                if (i === 2) {
                  setTimeout(() => {
                    setCtaVisible(true);
                    getInterpretation(selected, question);
                  }, 1000);
                }
              }, 400);
            }, 800);
          }, i * 600);
        });
      }, 100);
    }, 800);
  }

  async function getInterpretation(selectedCards, q) {
    setInterpreting(true);
    try {
      const cardsPayload = selectedCards.map((c, i) => ({
        name: c.name,
        position: POSITIONS[i],
        isReversed: c.isReversed,
      }));
      const res = await api.readings.interpret(q, cardsPayload);
      setInterpretation(res.interpretation);
    } catch {
      showToast('Không thể kết nối AI lúc này. Vui lòng thử lại.');
    } finally {
      setInterpreting(false);
    }
  }

  function resetReading() {
    setPhase('draw');
    setQuestion('');
    setCards([]);
    setShuffling(false);
    setCtaVisible(false);
    setEntered([false, false, false]);
    setFlipped([false, false, false]);
    setGlowed([false, false, false]);
    setKwVisible([false, false, false]);
    setInterpretation('');
    setInterpreting(false);
  }

  return (
    <section id="free-reading" className={styles['free-section']}>
      <div className={styles['free-inner']}>
        <div className="section-label">Thông Điệp Trong Ngày</div>
        <h2 className="section-title">Nhận Quẻ <em>Tarot</em></h2>
        <p className="section-desc">
          Hãy hít thở thật sâu, tập trung vào điều bạn đang trăn trở và chọn một lá bài để xem vũ trụ muốn nhắn nhủ điều gì.
        </p>

        {limit && (
          <div className={styles['limit-badge']}>
            {limit.can_read
              ? `✦ Còn ${limit.remaining}/${limit.limit} lượt rút hôm nay`
              : '✦ Hết lượt hôm nay — quay lại vào ngày mai'}
          </div>
        )}

        {phase === 'draw' && (
          <div className={styles['card-draw-area']}>
            <input
              type="text"
              className={styles['question-input']}
              placeholder="Bạn đang băn khoăn điều gì? (vd: Công việc sắp tới của tôi ra sao?)..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startReading()}
            />
            <div
              className={`${styles['card-deck']} ${shuffling ? styles['deck-shuffling'] : ''}`}
              onClick={startReading}
            >
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles['tarot-card']}>
                  <div className={styles['card-sym']}>✦</div>
                </div>
              ))}
            </div>
            <button
              className={styles['draw-btn']}
              onClick={startReading}
              disabled={limit && !limit.can_read}
            >
              {limit && !limit.can_read ? 'Hết lượt hôm nay' : 'Rút Bài (Trải 3 Lá)'}
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className={styles['result-wrap']} style={{ display: 'block' }}>
            <div className={styles['three-cards']}>
              {cards.map((card, i) => (
                <div
                  key={i}
                  className={`${styles['card-col']} ${entered[i] ? styles['entered'] : ''}`}
                >
                  <div className={styles['spread-position']}>{POSITIONS[i]}</div>
                  <div className={styles['flip-wrapper']}>
                    <div className={`${styles['flip-inner']} ${flipped[i] ? styles['flipped'] : ''}`}>
                      <div className={styles['flip-back']}></div>
                      <div className={`
                        ${styles['flip-front']}
                        ${card.isReversed ? styles['reversed-card'] : styles['upright-card']}
                        ${glowed[i] ? styles['glow'] : ''}
                      `}>
                        <img
                          src={`/cards/${card.slug}.jpg`}
                          alt={card.name}
                          className={styles['d3-img']}
                          style={card.isReversed ? { transform: 'rotate(180deg)' } : {}}
                        />
                        <div className={styles['d3-name']}>{card.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles['d3-kw']} ${kwVisible[i] ? styles['visible'] : ''}`}>
                    {card.isReversed && (
                      <span style={{ color: 'var(--rose)' }}>Năng lượng ngược · </span>
                    )}
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Interpretation */}
            {ctaVisible && (
              <div className={styles['interpretation-wrap']}>
                <div className={styles['interpretation-label']}>✦ Thông Điệp Từ Vũ Trụ ✦</div>
                {interpreting ? (
                  <div className={styles['interpretation-loading']}>
                    <span>Đang kết nối năng lượng</span>
                    <span className={styles.dots}>...</span>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <p className={styles['interpretation-text']}>
                      {typedText}
                      {/* Con trỏ nhấp nháy khi đang gõ */}
                      {!typingDone && (
                        <span className={styles['typing-cursor']}>|</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className={`${styles['result-cta']} ${ctaVisible ? styles['visible'] : ''}`}>
              <p>Bạn muốn giải mã chi tiết hơn về trải bài này?</p>
              <div className={styles['result-cta-btns']}>
                <button
                  className="btn-primary"
                  onClick={() => window.location.href = '#booking'}
                >
                  Đặt Lịch Với Reader
                </button>
                <button className="btn-ghost" onClick={resetReading}>
                  Rút Lại
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default FreeReading;