import Navbar from './Navbar/Navbar.jsx'
import Footer from './Footer/Footer.jsx'
function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}  
      <Footer />
    </>
  )
}

export default Layout
