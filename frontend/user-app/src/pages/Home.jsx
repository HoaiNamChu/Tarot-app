import { useEffect, useRef } from 'react';

import styles from './Home.module.css';

import Booking from '../components/Booking/Booking.jsx';
import FreeReading from '../components/FreeReading/FreeReading.jsx';
import Header from "../components/Header/Header.jsx";
import Readers from '../components/Readers/Readers.jsx';
import Services from '../components/Services/Services.jsx';
import Testi from '../components/Testi/Testi.jsx';

function Home() {
  const canvasRef = useRef(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let animationId;

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 169, 110, 0.4)';
        ctx.fill();
      }
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    function initParticles() {
      particles = [];
      const count = window.innerWidth < 768 ? 40 : 100;
      for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function animateCanvas() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(200, 169, 110, ${0.1 - dist / 1200})`;
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(animateCanvas);
    }

    const handleResize = () => { resizeCanvas(); initParticles(); };
    window.addEventListener('resize', handleResize);

    resizeCanvas();
    initParticles();
    animateCanvas();

    // cleanup khi component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  return (
    <>
      <canvas ref={canvasRef} className={styles.constellationCanvas}></canvas>

      {/* <!-- Các ngôi sao băng --> */}
      <div className={`${styles['shooting-star']} ${styles.ss1}`}></div>
      <div className={`${styles['shooting-star']} ${styles.ss2}`}></div>
      <div className={`${styles['shooting-star']} ${styles.ss3}`}></div>
      <div className={`${styles['shooting-star']} ${styles.ss4}`}></div>
      <div className={`${styles['shooting-star']} ${styles.ss5}`}></div>

      <Header />
      <FreeReading />
      <Services />
      <Readers />
      <Booking />
      <Testi />
    </>
  )
}

export default Home
